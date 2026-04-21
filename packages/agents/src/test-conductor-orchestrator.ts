import type { AnalyzerOutput } from './regression-analyzer.js';
import type { RawJenkinsBuild, AllureTestResult, RunIngestionAgent } from './run-ingestion.js';
import type { SummaryOutput } from './summary-generator.js';
import type { JenkinsBuildDto, NormalizedTestResult } from '@shipgate/shared';
import { ShipgateRegressionAnalyzer } from './regression-analyzer.js';
import { SummaryGenerator } from './summary-generator.js';

export interface OrchestratorResult {
  normalizedRun: {
    build: JenkinsBuildDto;
    testResults: NormalizedTestResult[];
  };
  analyses: AnalyzerOutput[];
  summary: SummaryOutput;
}

export class TestConductorOrchestrator {
  constructor(
    private ingestion: RunIngestionAgent,
    private analyzer: ShipgateRegressionAnalyzer,
    private summaryGen: SummaryGenerator,
  ) {}

  async processRun(
    build: RawJenkinsBuild,
    allureResults: AllureTestResult[],
  ): Promise<OrchestratorResult> {
    const normalizedRun = this.ingestion.ingest(build, allureResults);

    const failedResults = normalizedRun.testResults.filter(
      tr => tr.status === 'failed' || tr.status === 'broken',
    );

    const analyzerInputs = failedResults.map(tr => ({
      testName: tr.testName,
      suiteName: tr.suiteName,
      error: tr.error ?? '',
      stackTrace: tr.stackTrace,
      screenshotPath: tr.screenshotPath,
      steps: tr.steps?.map(s => ({
        name: s.name,
        status: s.status,
        duration: s.duration,
      })),
    }));

    const analyses = this.analyzer.analyze(analyzerInputs);

    const passed = normalizedRun.testResults.filter(t => t.status === 'passed').length;
    const failed = normalizedRun.testResults.filter(t => t.status === 'failed' || t.status === 'broken').length;
    const skipped = normalizedRun.testResults.filter(t => t.status === 'skipped').length;

    const summary = this.summaryGen.generate({
      buildNumber: build.number,
      totalTests: normalizedRun.testResults.length,
      passed,
      failed,
      skipped,
      failures: analyses,
      timestamp: new Date(build.timestamp).toISOString(),
    });

    return { normalizedRun, analyses, summary };
  }
}
