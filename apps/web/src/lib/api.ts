const base = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  overview: () =>
    json<{
      passRate: number;
      failureRate: number;
      flakyRate: number;
      activeRuns: number;
      releaseRisk: string;
      recentActivity: Array<{ id: string; action: string; actor: string | null; createdAt: string }>;
    }>("/overview"),
  applications: () =>
    json<
      Array<{
        id: string;
        name: string;
        baseUrl: string;
        jiraProjectKey: string | null;
        jenkinsJobName: string | null;
        environmentCount: number;
        suiteCount: number;
      }>
    >("/applications"),
  application: (id: string) =>
    json<{
      id: string;
      name: string;
      baseUrl: string;
      credentialsJson: string;
      jiraProjectKey: string | null;
      jenkinsJobName: string | null;
      environments: Array<{ id: string; name: string; baseUrl: string | null }>;
      suites: Array<{ id: string; name: string; tags: string[]; owner: string | null }>;
    }>(`/applications/${id}`),
  suites: () =>
    json<
      Array<{
        id: string;
        name: string;
        applicationId: string;
        applicationName: string;
        owner: string | null;
        tags: string[];
        passRate: number | null;
        flakyRate: number | null;
      }>
    >("/suites"),
  cases: () =>
    json<
      Array<{
        id: string;
        name: string;
        suiteId: string;
        suiteName: string;
        priority: string;
        status: string;
        lastResult: string;
      }>
    >("/cases"),
  runs: () =>
    json<
      Array<{
        id: string;
        suiteId: string;
        suiteName: string;
        applicationId: string;
        status: string;
        environmentName: string | null;
        startedAt: string | null;
        finishedAt: string | null;
        durationMs: number | null;
        failureCount: number;
      }>
    >("/runs"),
  run: (id: string) =>
    json<{
      id: string;
      status: string;
      suite: { id: string; name: string };
      environment: { id: string; name: string } | null;
      startedAt: string | null;
      finishedAt: string | null;
      durationMs: number | null;
      logs: string | null;
      triggeredBy: string | null;
      jenkinsBuildId: string | null;
      failures: Array<{ id: string; message: string; stack: string | null; caseName: string | null }>;
      analyses: Array<{
        id: string;
        classification: string;
        confidence: number;
        summary: string;
        suggestedAction: string | null;
      }>;
    }>(`/runs/${id}`),
  analyzeRun: (id: string) =>
    json<{
      id: string;
      classification: string;
      confidence: number;
      summary: string;
      suggestedAction: string | null;
    }>(`/runs/${id}/analyze`, { method: "POST" }),
  stories: () =>
    json<
      Array<{
        id: string;
        key: string;
        title: string;
        status: string;
        criteriaCount: number;
        scenarioCount: number;
      }>
    >("/stories"),
  integrations: () =>
    json<Array<{ id: string; type: string; name: string; baseUrl: string; isActive: boolean }>>(
      "/integrations"
    ),
  webhookEvents: () =>
    json<Array<{ id: string; source: string; deliveryStatus: string; createdAt: string; errorMessage: string | null }>>(
      "/webhooks/events"
    ),
  projects: () =>
    json<Array<{ id: string; key: string; name: string; workspaceId: string; workspaceSlug: string }>>(
      "/projects"
    ),
  runSuite: (suiteId: string) =>
    json<{ runId: string; status: string }>(`/suites/${suiteId}/run`, { method: "POST" }),
  generateStory: (storyId: string) =>
    json<{ queued: boolean; storyId: string }>(`/stories/${storyId}/generate`, { method: "POST" }),
  connectJira: (body: { baseUrl: string; projectKey: string; name?: string }) =>
    json<{ id: string; type: string; baseUrl: string }>("/integrations/jira", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  connectJenkins: (body: { baseUrl: string; jobName: string; name?: string }) =>
    json<{ id: string; type: string; baseUrl: string }>("/integrations/jenkins", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  chat: (body: { messages: Array<{ role: "user" | "assistant" | "system"; content: string }>; context?: object }) =>
    json<{ message: { role: "assistant"; content: string } }>("/ai/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  adminRules: () =>
    json<Array<{ id: string; key: string; name: string; isEnabled: boolean; configJson: string }>>("/admin/rules"),
  adminPrompts: () =>
    json<Array<{ id: string; key: string; title: string; body: string; version: number }>>("/admin/prompts"),
  adminAudit: () =>
    json<Array<{ id: string; actor: string | null; action: string; resource: string | null; createdAt: string }>>(
      "/admin/audit"
    ),
  adminTools: () => json<{ tools: Array<{ id: string; name: string; status: string; description: string }> }>(
    "/admin/tools"
  ),
  pipelines: () =>
    json<
      Array<{
        id: string;
        applicationId: string;
        applicationName: string;
        baseUrl: string;
        status: string;
        framework: string;
        totalPlanned: number | null;
        totalGenerated: number | null;
        totalPassed: number | null;
        totalFailed: number | null;
        totalHealed: number | null;
        startedAt: string | null;
        finishedAt: string | null;
        durationMs: number | null;
        createdAt: string;
      }>
    >("/pipelines"),
  pipeline: (id: string) =>
    json<{
      id: string;
      applicationId: string;
      applicationName: string;
      baseUrl: string;
      status: string;
      framework: string;
      promptMarkdown: string | null;
      storiesJson: string | null;
      testPlan: string | null;
      planCasesJson: string | null;
      coverageSummary: string | null;
      generatedScriptsJson: string | null;
      generatedConfigJson: string | null;
      executionLog: string | null;
      executionStatus: string | null;
      healerLog: string | null;
      healActionsJson: string | null;
      reportMarkdown: string | null;
      totalPlanned: number | null;
      totalGenerated: number | null;
      totalPassed: number | null;
      totalFailed: number | null;
      totalHealed: number | null;
      startedAt: string | null;
      finishedAt: string | null;
      durationMs: number | null;
      createdAt: string;
    }>(`/pipelines/${id}`),
  createPipeline: (body: {
    applicationId: string;
    framework?: string;
    promptMarkdown?: string;
    stories?: Array<{ key: string; title: string; criteria: string[] }>;
  }) =>
    json<{ id: string; status: string }>("/pipelines", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  mcpServers: () =>
    json<Array<{ id: string; key: string; name: string; type: string; endpoint: string | null; isEnabled: boolean }>>(
      "/mcp/servers"
    ),

  // Conductor
  conductorGitStatus: () =>
    json<{
      branch: string;
      lastCommit: { hash: string; message: string; date: string } | null;
      changedFiles: Array<{ status: string; file: string }>;
      clean: boolean;
    }>("/conductor/git/status"),
  conductorGitLog: () =>
    json<Array<{ hash: string; message: string; relTime: string; author: string }>>("/conductor/git/log"),
  conductorFiles: () =>
    json<{
      testFiles: Array<{ name: string; path: string; size: number; modified: string }>;
      appFiles: Array<{ name: string; path: string; size: number; modified: string }>;
    }>("/conductor/files"),
  conductorTests: () =>
    json<
      Array<{
        file: string;
        feature: string;
        scenarios: Array<{ name: string; line: number }>;
      }>
    >("/conductor/tests"),
  conductorFileContent: (filePath: string) =>
    json<{ path: string; content: string; lines: number }>(`/conductor/file/${filePath}`),
  conductorSuggestions: (status?: string) =>
    json<
      Array<{
        id: string;
        applicationId: string;
        application: { name: string };
        title: string;
        description: string | null;
        category: string;
        priority: string;
        sourceFile: string | null;
        triggerReason: string | null;
        generatedCode: string | null;
        targetFile: string | null;
        status: string;
        createdAt: string;
      }>
    >(`/conductor/suggestions${status ? `?status=${status}` : ""}`),
  conductorApprove: (id: string) =>
    json<{ id: string; status: string }>(`/conductor/suggestions/${id}/approve`, { method: "POST" }),
  conductorReject: (id: string) =>
    json<{ id: string; status: string }>(`/conductor/suggestions/${id}/reject`, { method: "POST" }),
  conductorScan: (applicationId: string) =>
    json<{ queued: boolean }>("/conductor/scan", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    }),
  conductorRunPipeline: (applicationId: string) =>
    json<{ pipelineRunId: string; status: string }>("/conductor/run-pipeline", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    }),
  conductorActivity: (applicationId?: string) =>
    json<
      Array<{
        id: string;
        applicationId: string | null;
        type: string;
        summary: string;
        detailsJson: string;
        createdAt: string;
      }>
    >(`/conductor/activity${applicationId ? `?applicationId=${applicationId}` : ""}`),
  conductorConfig: () =>
    json<{
      autoScanEnabled: boolean;
      autoRunOnApproval: boolean;
      watchPaths: string[];
      scanIntervalMs: number;
    }>("/conductor/config"),
  conductorUpdateConfig: (body: {
    autoScanEnabled?: boolean;
    autoRunOnApproval?: boolean;
    watchPaths?: string[];
    scanIntervalMs?: number;
  }) =>
    json<typeof body>("/conductor/config", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
