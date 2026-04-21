import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface AllureReaderConfig {
  resultsDir: string;
  reportDir?: string;
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

export class AllureReader {
  constructor(private config: AllureReaderConfig) {}

  async readResults(): Promise<AllureTestResult[]> {
    const dir = this.config.resultsDir;
    try {
      const entries = await readdir(dir);
      const resultFiles = entries.filter((f: string) => f.endsWith('-result.json'));
      const results: AllureTestResult[] = [];

      for (const file of resultFiles) {
        const content = await readFile(join(dir, file), 'utf-8');
        const parsed = JSON.parse(content) as AllureTestResult;
        results.push(this.normalizeResult(parsed));
      }

      return results;
    } catch {
      return [];
    }
  }

  async readFailures(): Promise<AllureTestResult[]> {
    const all = await this.readResults();
    return all.filter(r => r.status === 'failed' || r.status === 'broken');
  }

  getAttachmentPath(source: string): string {
    return join(this.config.resultsDir, source);
  }

  private normalizeResult(raw: Partial<AllureTestResult>): AllureTestResult {
    return {
      uuid: raw.uuid ?? '',
      name: raw.name ?? 'unnamed test',
      fullName: raw.fullName ?? raw.name ?? '',
      status: raw.status ?? 'unknown',
      statusDetails: raw.statusDetails,
      stage: raw.stage ?? 'finished',
      steps: (raw.steps ?? []).map(s => ({
        name: s.name ?? '',
        status: s.status ?? 'passed',
        start: s.start ?? 0,
        stop: s.stop ?? 0,
      })),
      attachments: (raw.attachments ?? []).map(a => ({
        name: a.name ?? '',
        source: a.source ?? '',
        type: a.type ?? 'text/plain',
      })),
      start: raw.start ?? 0,
      stop: raw.stop ?? 0,
      labels: (raw.labels ?? []).map(l => ({
        name: l.name ?? '',
        value: l.value ?? '',
      })),
    };
  }
}
