import type { JenkinsBuildDto, NormalizedTestResult, TestStep } from '@shipgate/shared';
import { randomUUID } from 'node:crypto';

export interface RawJenkinsBuild {
  number: number;
  result: string;
  timestamp: number;
  duration: number;
  url: string;
  artifacts: { fileName: string; relativePath: string }[];
}

export interface AllureTestResult {
  uuid: string;
  name: string;
  fullName: string;
  status: string;
  statusDetails?: { message?: string; trace?: string };
  stage: string;
  steps: { name: string; status: string; stop: number; start: number }[];
  attachments: { name: string; source: string; type: string }[];
  start: number;
  stop: number;
  labels: { name: string; value: string }[];
}

function mapJenkinsStatus(result: string): JenkinsBuildDto['status'] {
  const upper = result.toUpperCase();
  if (upper === 'SUCCESS') return 'SUCCESS';
  if (upper === 'FAILURE') return 'FAILURE';
  if (upper === 'UNSTABLE') return 'UNSTABLE';
  if (upper === 'ABORTED') return 'ABORTED';
  return 'FAILURE';
}

function mapAllureStatus(status: string): NormalizedTestResult['status'] {
  const lower = status.toLowerCase();
  if (lower === 'passed') return 'passed';
  if (lower === 'failed') return 'failed';
  if (lower === 'skipped' || lower === 'pending') return 'skipped';
  if (lower === 'broken') return 'broken';
  return 'failed';
}

function extractSuiteName(result: AllureTestResult): string {
  const suiteLabel = result.labels.find(l => l.name === 'suite');
  if (suiteLabel) return suiteLabel.value;

  const parentSuite = result.labels.find(l => l.name === 'parentSuite');
  if (parentSuite) return parentSuite.value;

  const parts = result.fullName.split('.');
  if (parts.length > 1) return parts.slice(0, -1).join('.');

  return 'default';
}

function findScreenshotAttachment(result: AllureTestResult): string | undefined {
  const screenshot = result.attachments.find(
    a => a.type.startsWith('image/') || /screenshot/i.test(a.name)
  );
  return screenshot?.source;
}

function normalizeSteps(steps: AllureTestResult['steps']): TestStep[] {
  return steps.map(s => ({
    name: s.name,
    status: s.status === 'passed' ? 'passed' as const : 'failed' as const,
    duration: s.stop - s.start,
  }));
}

export class RunIngestionAgent {
  normalizeJenkinsBuild(raw: RawJenkinsBuild): JenkinsBuildDto {
    const startedAt = new Date(raw.timestamp);
    const finishedAt = new Date(raw.timestamp + raw.duration);

    return {
      id: randomUUID(),
      buildNumber: raw.number,
      jobName: new URL(raw.url).pathname.split('/').filter(Boolean)[1] ?? 'unknown-job',
      status: mapJenkinsStatus(raw.result),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      duration: raw.duration,
      artifactPaths: raw.artifacts.map(a => a.relativePath),
      processed: false,
    };
  }

  normalizeAllureResults(results: AllureTestResult[]): NormalizedTestResult[] {
    return results.map(r => {
      const testResult: NormalizedTestResult = {
        id: r.uuid || randomUUID(),
        buildId: '',
        suiteName: extractSuiteName(r),
        testName: r.name,
        status: mapAllureStatus(r.status),
        duration: r.stop - r.start,
        steps: normalizeSteps(r.steps),
      };

      if (r.statusDetails?.message) {
        testResult.error = r.statusDetails.message;
      }
      if (r.statusDetails?.trace) {
        testResult.stackTrace = r.statusDetails.trace;
      }

      const screenshot = findScreenshotAttachment(r);
      if (screenshot) {
        testResult.screenshotPath = screenshot;
      }

      return testResult;
    });
  }

  ingest(
    build: RawJenkinsBuild,
    allureResults: AllureTestResult[]
  ): { build: JenkinsBuildDto; testResults: NormalizedTestResult[] } {
    const normalizedBuild = this.normalizeJenkinsBuild(build);
    const testResults = this.normalizeAllureResults(allureResults).map(tr => ({
      ...tr,
      buildId: normalizedBuild.id,
    }));

    normalizedBuild.processed = true;

    return { build: normalizedBuild, testResults };
  }
}
