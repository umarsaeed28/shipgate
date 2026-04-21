import type {
  OverviewData,
  Run,
  RunDetail,
  TestFailure,
  RunSummary,
  AgentStatusData,
  Settings,
  Build,
  Bug,
  DemoSettings,
  RunTokenResponse,
  RunStatusResponse,
  JenkinsPipelineData,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface RawFailure {
  id: string;
  testName: string;
  suiteName: string;
  classification: string;
  confidence: number;
  rawError: string;
  summary: string;
  suggestedAction: string;
  evidence: string[];
  buildNumber: number;
  runId: string;
  screenshotPath?: string;
  tracePath?: string;
  createdAt: string;
}

function mapFailure(f: RawFailure): TestFailure {
  return {
    id: f.id,
    testName: f.testName,
    suiteName: f.suiteName,
    classification: f.classification as TestFailure['classification'],
    confidence: f.confidence,
    errorMessage: f.rawError,
    action: f.suggestedAction,
    evidence: f.evidence,
    buildNumber: f.buildNumber,
  };
}

interface RawRun {
  id: string;
  buildId: string;
  buildNumber: number;
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  status: string;
  reportPath: string;
  allureReportUrl?: string | null;
  createdAt: string;
}

function mapRun(r: RawRun, build?: RawBuild | null): Run {
  return {
    id: r.id,
    buildNumber: r.buildNumber,
    status: (build?.status ?? r.status.toUpperCase()) as Run['status'],
    startedAt: build?.startedAt ?? r.createdAt,
    duration: build?.duration ?? 0,
    passed: r.passed,
    failed: r.failed,
    skipped: r.skipped,
    total: r.total,
    allureReportUrl: r.allureReportUrl ?? null,
  };
}

interface RawBuild {
  id: string;
  buildNumber: number;
  jobName: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  duration: number;
  artifactPaths: string[];
  processed: boolean;
}

interface RawRunDetailResponse {
  run: RawRun;
  failures: RawFailure[];
  summary: {
    id: string;
    runId: string;
    buildNumber: number;
    markdown: string;
    shortSummary: string;
    overallStatus: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    classificationBreakdown: Record<string, number>;
    createdAt: string;
    allureReportUrl?: string | null;
  } | null;
  build: RawBuild | null;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const api = {
  getOverview: () => fetchApi<OverviewData>('/api/regression/overview'),
  getRuns: async () => {
    const res = await fetchApi<{ items: RawRun[] }>('/api/regression/runs');
    return res.items.map((r) => mapRun(r));
  },
  getRun: async (id: string) => {
    const res = await fetchApi<RawRunDetailResponse>(`/api/regression/runs/${id}`);
    const run = mapRun(res.run, res.build);
    const failures = (res.failures ?? []).map(mapFailure);
    const classBreakdown: Record<string, number> = {};
    for (const f of failures) {
      classBreakdown[f.classification] = (classBreakdown[f.classification] || 0) + 1;
    }
    return {
      ...run,
      allureReportUrl: run.allureReportUrl ?? res.summary?.allureReportUrl ?? null,
      failures,
      classificationBreakdown: res.summary?.classificationBreakdown ?? classBreakdown,
      summary: res.summary
        ? {
            id: res.summary.id,
            runId: res.summary.runId,
            buildNumber: res.summary.buildNumber,
            status: (res.summary.overallStatus?.toUpperCase() ?? 'FAILURE') as RunDetail['status'],
            createdAt: res.summary.createdAt,
            summary: res.summary.markdown,
            allureReportUrl: res.summary.allureReportUrl ?? undefined,
          }
        : undefined,
    } as RunDetail;
  },
  getFailures: async (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetchApi<{ items: RawFailure[] }>(`/api/regression/failures${qs}`);
    return res.items.map(mapFailure);
  },
  getSummaries: async () => {
    const res = await fetchApi<{
      items: Array<{
        id: string;
        runId: string;
        buildNumber: number;
        markdown: string;
        shortSummary: string;
        overallStatus: string;
        createdAt: string;
        allureReportUrl?: string | null;
      }>;
    }>('/api/regression/summaries');
    return res.items.map((s) => ({
      id: s.id,
      runId: s.runId,
      buildNumber: s.buildNumber,
      status: (s.overallStatus?.toUpperCase() ?? 'FAILURE') as RunSummary['status'],
      createdAt: s.createdAt,
      summary: s.markdown ?? s.shortSummary ?? '',
      allureReportUrl: s.allureReportUrl ?? undefined,
    }));
  },
  getSummary: async (runId: string) => {
    const raw = await fetchApi<{
      id: string;
      runId: string;
      buildNumber: number;
      markdown: string;
      overallStatus: string;
      createdAt: string;
      allureReportUrl?: string | null;
    }>(`/api/regression/summaries/${runId}`);
    return {
      id: raw.id,
      runId: raw.runId,
      buildNumber: raw.buildNumber,
      status: (raw.overallStatus?.toUpperCase() ?? 'FAILURE') as RunSummary['status'],
      createdAt: raw.createdAt,
      summary: raw.markdown,
      allureReportUrl: raw.allureReportUrl ?? undefined,
    } satisfies RunSummary;
  },
  getAgentStatus: () => fetchApi<AgentStatusData>('/api/regression/agent-status'),
  getSettings: () => fetchApi<Settings>('/api/regression/settings'),
  updateSettings: async (data: Settings) => {
    const res = await fetchApi<{ ok: boolean } & Settings>('/api/regression/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const { ok: _ok, ...settings } = res;
    return settings;
  },
  analyzeLatest: () =>
    fetchApi<{ ok: boolean; buildId?: string; buildNumber?: number }>(
      '/api/regression/analyze-latest',
      { method: 'POST' },
    ),
  analyzeBuild: (buildId: string) =>
    fetchApi<{ ok: boolean; analysis?: { runId: string } }>(
      `/api/regression/analyze/${encodeURIComponent(buildId)}`,
      { method: 'POST' },
    ),
  getJenkinsPipeline: () => fetchApi<JenkinsPipelineData>('/api/regression/jenkins/pipeline'),
  getBuilds: async () => {
    const res = await fetchApi<{ items: RawBuild[] }>('/api/regression/builds');
    return res.items.map((b) => ({
      number: b.buildNumber,
      status: b.status as Build['status'],
      timestamp: b.startedAt,
      duration: b.duration,
    }));
  },

  getBugs: async () => {
    const res = await fetchApi<{ items: Bug[] }>('/api/regression/bugs');
    return res.items;
  },

  // Demo tools
  getDemoSettings: () => fetchApi<DemoSettings>('/api/demo/settings'),
  injectBug: (settings: DemoSettings) =>
    fetchApi<{ ok: boolean; settings: DemoSettings }>('/api/demo/inject-bug', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),
  runRegression: () =>
    fetchApi<RunTokenResponse>('/api/demo/run-regression', { method: 'POST' }),
  getRunStatus: (token: string) =>
    fetchApi<RunStatusResponse>(`/api/demo/run-status/${token}`),
  resetDemo: () =>
    fetchApi<{ ok: boolean }>('/api/demo/reset', { method: 'POST' }),
};
