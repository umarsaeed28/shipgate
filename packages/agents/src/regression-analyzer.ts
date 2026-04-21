import type { FailureClassificationType } from '@shipgate/shared';
import { randomUUID } from 'node:crypto';

export interface AnalyzerInput {
  testName: string;
  suiteName: string;
  error: string;
  stackTrace?: string;
  screenshotPath?: string;
  steps?: { name: string; status: string; duration: number }[];
  retryCount?: number;
}

export interface AnalyzerOutput {
  failureId: string;
  testName: string;
  classification: FailureClassificationType;
  confidence: number;
  evidenceList: string[];
  shortExplanation: string;
  suggestedNextAction: string;
}

interface SignalMatch {
  classification: FailureClassificationType;
  weight: number;
  evidence: string;
}

const PATTERNS: { classification: FailureClassificationType; patterns: RegExp[]; evidence: string }[] = [
  {
    classification: 'BUG',
    patterns: [
      /expected\s+.+\s+but\s+got/i,
      /AssertionError/i,
      /AssertError/i,
      /assert\.(equal|strictEqual|deepEqual|ok)/i,
      /expected\s+.*\s+to\s+(equal|be|match|include|contain)/i,
      /mismatch/i,
      /not equal/i,
      /calculation\s+wrong/i,
      /value\s+mismatch/i,
      /toEqual|toBe|toMatch|toContain/i,
      /expect\(.*\)\.(to|not)/i,
    ],
    evidence: 'assertion/value mismatch detected',
  },
  {
    classification: 'TEST_SCRIPT_ISSUE',
    patterns: [
      /element\s+not\s+found/i,
      /no\s+such\s+element/i,
      /selector/i,
      /locator/i,
      /stale\s+element/i,
      /StaleElementReferenceException/i,
      /NoSuchElementError/i,
      /ElementNotInteractableException/i,
      /element.*not.*visible/i,
      /cannot\s+find\s+element/i,
      /click\s+intercepted/i,
    ],
    evidence: 'test script element/selector issue detected',
  },
  {
    classification: 'TIMEOUT',
    patterns: [
      /timeout/i,
      /timed\s+out/i,
      /exceeded/i,
      /waiting\s+for/i,
      /TimeoutError/i,
      /navigation\s+timeout/i,
      /waitForSelector/i,
      /waitForNavigation/i,
      /deadline\s+exceeded/i,
    ],
    evidence: 'timeout/wait exceeded detected',
  },
  {
    classification: 'INFRASTRUCTURE_OR_ENVIRONMENT',
    patterns: [
      /ECONNREFUSED/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /ENOENT/i,
      /browser.*crash/i,
      /browser.*launch/i,
      /spawn/i,
      /port.*in\s+use/i,
      /network\s+error/i,
      /net::ERR_/i,
      /ERR_CONNECTION/i,
      /502\s+Bad\s+Gateway/i,
      /503\s+Service\s+Unavailable/i,
      /connection\s+refused/i,
      /DNS\s+resolution/i,
      /certificate/i,
      /SSL/i,
    ],
    evidence: 'infrastructure/environment issue detected',
  },
];

const NEXT_ACTIONS: Record<FailureClassificationType, string> = {
  BUG: 'Investigate the application code - likely a real regression. File a bug ticket.',
  TEST_SCRIPT_ISSUE: 'Review and update the test script selectors/locators to match the current UI.',
  TIMEOUT: 'Check environment performance and consider increasing timeout thresholds or adding waits.',
  INFRASTRUCTURE_OR_ENVIRONMENT: 'Verify environment health - check service availability, network, and browser setup.',
  UNKNOWN_NEEDS_REVIEW: 'Manual review required - the failure does not match known patterns.',
};

function collectSignals(input: AnalyzerInput): SignalMatch[] {
  const signals: SignalMatch[] = [];
  const combined = [input.error, input.stackTrace ?? ''].join('\n');

  for (const rule of PATTERNS) {
    let matchCount = 0;
    for (const pat of rule.patterns) {
      if (pat.test(combined)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      const weight = Math.min(matchCount / rule.patterns.length + 0.3, 1);
      signals.push({
        classification: rule.classification,
        weight,
        evidence: `${rule.evidence} (${matchCount} pattern${matchCount > 1 ? 's' : ''} matched)`,
      });
    }
  }

  if (input.steps) {
    const failedSteps = input.steps.filter(s => s.status === 'failed');
    if (failedSteps.length > 0) {
      const lastFailed = failedSteps[failedSteps.length - 1];
      if (/click|type|fill|select|check/i.test(lastFailed.name)) {
        signals.push({
          classification: 'TEST_SCRIPT_ISSUE',
          weight: 0.3,
          evidence: `last failed step is an interaction step: "${lastFailed.name}"`,
        });
      }
      if (/assert|verify|expect|should/i.test(lastFailed.name)) {
        signals.push({
          classification: 'BUG',
          weight: 0.3,
          evidence: `last failed step is an assertion step: "${lastFailed.name}"`,
        });
      }
    }
  }

  if (input.retryCount !== undefined && input.retryCount > 0) {
    signals.push({
      classification: 'INFRASTRUCTURE_OR_ENVIRONMENT',
      weight: 0.15,
      evidence: `test was retried ${input.retryCount} time(s), suggesting intermittent issue`,
    });
  }

  return signals;
}

function resolveClassification(
  signals: SignalMatch[]
): { classification: FailureClassificationType; confidence: number; evidenceList: string[] } {
  if (signals.length === 0) {
    return {
      classification: 'UNKNOWN_NEEDS_REVIEW',
      confidence: 0.2,
      evidenceList: ['no known failure patterns matched'],
    };
  }

  const scoreMap = new Map<FailureClassificationType, { total: number; evidence: string[] }>();

  for (const signal of signals) {
    const entry = scoreMap.get(signal.classification) ?? { total: 0, evidence: [] };
    entry.total += signal.weight;
    entry.evidence.push(signal.evidence);
    scoreMap.set(signal.classification, entry);
  }

  let best: FailureClassificationType = 'UNKNOWN_NEEDS_REVIEW';
  let bestScore = 0;
  let secondBestScore = 0;
  const allEvidence: string[] = [];

  for (const [cls, entry] of scoreMap) {
    allEvidence.push(...entry.evidence);
    if (entry.total > bestScore) {
      secondBestScore = bestScore;
      bestScore = entry.total;
      best = cls;
    } else if (entry.total > secondBestScore) {
      secondBestScore = entry.total;
    }
  }

  const gap = bestScore - secondBestScore;
  let confidence = Math.min(bestScore, 1);

  if (scoreMap.size > 1 && gap < 0.2) {
    confidence *= 0.6;
  }

  if (confidence < 0.5) {
    return {
      classification: 'UNKNOWN_NEEDS_REVIEW',
      confidence,
      evidenceList: allEvidence,
    };
  }

  return { classification: best, confidence: Math.round(confidence * 100) / 100, evidenceList: allEvidence };
}

export function classifyFailure(input: AnalyzerInput): AnalyzerOutput {
  const signals = collectSignals(input);
  const { classification, confidence, evidenceList } = resolveClassification(signals);

  const explanations: Record<FailureClassificationType, string> = {
    BUG: `Assertion or value mismatch in "${input.testName}" indicates a likely application bug.`,
    TEST_SCRIPT_ISSUE: `Selector or element issue in "${input.testName}" suggests the test script needs updating.`,
    TIMEOUT: `Timeout detected in "${input.testName}" - the operation took too long.`,
    INFRASTRUCTURE_OR_ENVIRONMENT: `Infrastructure error in "${input.testName}" - environment or connectivity problem.`,
    UNKNOWN_NEEDS_REVIEW: `"${input.testName}" could not be confidently classified and needs manual review.`,
  };

  return {
    failureId: randomUUID(),
    testName: input.testName,
    classification,
    confidence,
    evidenceList,
    shortExplanation: explanations[classification],
    suggestedNextAction: NEXT_ACTIONS[classification],
  };
}

export class ShipgateRegressionAnalyzer {
  analyze(failures: AnalyzerInput[]): AnalyzerOutput[] {
    return failures.map(f => classifyFailure(f));
  }
}
