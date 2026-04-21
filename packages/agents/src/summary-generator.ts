import type { FailureClassificationType } from '@shipgate/shared';
import type { AnalyzerOutput } from './regression-analyzer.js';

export interface SummaryInput {
  buildNumber: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  failures: AnalyzerOutput[];
  timestamp: string;
}

export interface SummaryOutput {
  markdown: string;
  shortSummary: string;
  classificationBreakdown: Record<FailureClassificationType, number>;
  keyFailures: AnalyzerOutput[];
  likelyRootCauses: string[];
  recommendations: string[];
}

const ALL_CLASSIFICATIONS: FailureClassificationType[] = [
  'BUG',
  'TEST_SCRIPT_ISSUE',
  'TIMEOUT',
  'INFRASTRUCTURE_OR_ENVIRONMENT',
  'UNKNOWN_NEEDS_REVIEW',
];

const CLASSIFICATION_LABELS: Record<FailureClassificationType, string> = {
  BUG: 'Application Bug',
  TEST_SCRIPT_ISSUE: 'Test Script Issue',
  TIMEOUT: 'Timeout',
  INFRASTRUCTURE_OR_ENVIRONMENT: 'Infrastructure / Environment',
  UNKNOWN_NEEDS_REVIEW: 'Unknown (Needs Review)',
};

function buildBreakdown(failures: AnalyzerOutput[]): Record<FailureClassificationType, number> {
  const breakdown: Record<FailureClassificationType, number> = {
    BUG: 0,
    TEST_SCRIPT_ISSUE: 0,
    TIMEOUT: 0,
    INFRASTRUCTURE_OR_ENVIRONMENT: 0,
    UNKNOWN_NEEDS_REVIEW: 0,
  };
  for (const f of failures) {
    breakdown[f.classification]++;
  }
  return breakdown;
}

function identifyKeyFailures(failures: AnalyzerOutput[]): AnalyzerOutput[] {
  const sorted = [...failures].sort((a, b) => b.confidence - a.confidence);

  const bugs = sorted.filter(f => f.classification === 'BUG');
  const others = sorted.filter(f => f.classification !== 'BUG');

  return [...bugs, ...others].slice(0, 10);
}

function deriveRootCauses(
  breakdown: Record<FailureClassificationType, number>,
  failures: AnalyzerOutput[]
): string[] {
  const causes: string[] = [];

  if (breakdown.BUG > 0) {
    const bugTests = failures.filter(f => f.classification === 'BUG').map(f => f.testName);
    causes.push(`Application regression detected in ${bugTests.length} test(s): ${bugTests.slice(0, 3).join(', ')}${bugTests.length > 3 ? '...' : ''}`);
  }

  if (breakdown.INFRASTRUCTURE_OR_ENVIRONMENT > 0) {
    causes.push(`Infrastructure/environment instability affecting ${breakdown.INFRASTRUCTURE_OR_ENVIRONMENT} test(s)`);
  }

  if (breakdown.TIMEOUT > 0) {
    causes.push(`Performance degradation causing ${breakdown.TIMEOUT} timeout(s)`);
  }

  if (breakdown.TEST_SCRIPT_ISSUE > 0) {
    causes.push(`Test maintenance needed - ${breakdown.TEST_SCRIPT_ISSUE} test(s) have stale selectors or locators`);
  }

  if (breakdown.UNKNOWN_NEEDS_REVIEW > 0) {
    causes.push(`${breakdown.UNKNOWN_NEEDS_REVIEW} failure(s) require manual investigation`);
  }

  return causes;
}

function deriveRecommendations(
  breakdown: Record<FailureClassificationType, number>,
  totalTests: number,
  failed: number
): string[] {
  const recs: string[] = [];
  const failRate = totalTests > 0 ? failed / totalTests : 0;

  if (breakdown.BUG > 0) {
    recs.push('Prioritize bug investigation - create tickets for confirmed application regressions.');
  }

  if (breakdown.TEST_SCRIPT_ISSUE > 2) {
    recs.push('Schedule a test maintenance sprint - multiple tests have broken selectors.');
  } else if (breakdown.TEST_SCRIPT_ISSUE > 0) {
    recs.push('Update broken test selectors to reflect current UI state.');
  }

  if (breakdown.INFRASTRUCTURE_OR_ENVIRONMENT > 0) {
    recs.push('Verify environment health and service connectivity before next run.');
  }

  if (breakdown.TIMEOUT > 2) {
    recs.push('Investigate system performance - multiple timeouts suggest a slowdown.');
  }

  if (failRate > 0.5) {
    recs.push('High failure rate (>50%) - consider blocking the release pipeline until issues are resolved.');
  } else if (failRate > 0.2) {
    recs.push('Elevated failure rate (>20%) - review failures before proceeding with deployment.');
  }

  if (breakdown.UNKNOWN_NEEDS_REVIEW > 0) {
    recs.push('Manually review unclassified failures to improve future classification accuracy.');
  }

  return recs;
}

function formatMarkdown(input: SummaryInput, output: Omit<SummaryOutput, 'markdown' | 'shortSummary'>): string {
  const passRate = input.totalTests > 0
    ? ((input.passed / input.totalTests) * 100).toFixed(1)
    : '0.0';
  const ts = new Date(input.timestamp).toLocaleString();

  const lines: string[] = [
    `# Regression Analysis - Build #${input.buildNumber}`,
    '',
    `**Date:** ${ts}`,
    '',
    '## Overview',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total Tests | ${input.totalTests} |`,
    `| Passed | ${input.passed} |`,
    `| Failed | ${input.failed} |`,
    `| Skipped | ${input.skipped} |`,
    `| Pass Rate | ${passRate}% |`,
    '',
    '## Classification Breakdown',
    '',
    '| Category | Count |',
    '|----------|-------|',
  ];

  for (const cls of ALL_CLASSIFICATIONS) {
    const count = output.classificationBreakdown[cls];
    if (count > 0) {
      lines.push(`| ${CLASSIFICATION_LABELS[cls]} | ${count} |`);
    }
  }

  lines.push('', '## Key Failures', '');

  if (output.keyFailures.length === 0) {
    lines.push('No failures to report.');
  } else {
    for (const f of output.keyFailures) {
      lines.push(
        `### ${f.testName}`,
        '',
        `- **Classification:** ${CLASSIFICATION_LABELS[f.classification]}`,
        `- **Confidence:** ${(f.confidence * 100).toFixed(0)}%`,
        `- **Explanation:** ${f.shortExplanation}`,
        `- **Suggested Action:** ${f.suggestedNextAction}`,
        `- **Evidence:** ${f.evidenceList.join('; ')}`,
        '',
      );
    }
  }

  lines.push('## Likely Root Causes', '');
  for (const cause of output.likelyRootCauses) {
    lines.push(`- ${cause}`);
  }

  lines.push('', '## Recommendations', '');
  for (const rec of output.recommendations) {
    lines.push(`- ${rec}`);
  }

  return lines.join('\n');
}

export class SummaryGenerator {
  generate(input: SummaryInput): SummaryOutput {
    const classificationBreakdown = buildBreakdown(input.failures);
    const keyFailures = identifyKeyFailures(input.failures);
    const likelyRootCauses = deriveRootCauses(classificationBreakdown, input.failures);
    const recommendations = deriveRecommendations(classificationBreakdown, input.totalTests, input.failed);

    const partial = { classificationBreakdown, keyFailures, likelyRootCauses, recommendations };
    const markdown = formatMarkdown(input, partial);

    const passRate = input.totalTests > 0
      ? ((input.passed / input.totalTests) * 100).toFixed(1)
      : '0.0';
    const shortSummary = `Build #${input.buildNumber}: ${input.passed}/${input.totalTests} passed (${passRate}%), ${input.failed} failed. Top issue: ${likelyRootCauses[0] ?? 'none'}.`;

    return {
      markdown,
      shortSummary,
      classificationBreakdown,
      keyFailures,
      likelyRootCauses,
      recommendations,
    };
  }
}
