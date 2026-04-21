import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Settings, DemoSettings } from '../types';

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview(),
    refetchInterval: 30_000,
  });
}

export function useRuns() {
  return useQuery({
    queryKey: ['runs'],
    queryFn: () => api.getRuns(),
  });
}

export function useRun(id: string) {
  return useQuery({
    queryKey: ['run', id],
    queryFn: () => api.getRun(id),
    enabled: !!id,
  });
}

export function useFailures(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['failures', params],
    queryFn: () => api.getFailures(params),
  });
}

export function useSummaries() {
  return useQuery({
    queryKey: ['summaries'],
    queryFn: () => api.getSummaries(),
  });
}

export function useSummary(runId: string) {
  return useQuery({
    queryKey: ['summary', runId],
    queryFn: () => api.getSummary(runId),
    enabled: !!runId,
  });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: ['agentStatus'],
    queryFn: () => api.getAgentStatus(),
    refetchInterval: 15_000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Settings) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['agentStatus'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['jenkinsPipeline'] });
    },
  });
}

export function useAnalyzeLatest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.analyzeLatest(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['agentStatus'] });
      queryClient.invalidateQueries({ queryKey: ['failures'] });
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      queryClient.invalidateQueries({ queryKey: ['builds'] });
      queryClient.invalidateQueries({ queryKey: ['jenkinsPipeline'] });
    },
  });
}

export function useJenkinsPipeline() {
  return useQuery({
    queryKey: ['jenkinsPipeline'],
    queryFn: () => api.getJenkinsPipeline(),
    refetchInterval: 4000,
  });
}

export function useAnalyzeBuild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (buildId: string) => api.analyzeBuild(buildId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['agentStatus'] });
      queryClient.invalidateQueries({ queryKey: ['failures'] });
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      queryClient.invalidateQueries({ queryKey: ['builds'] });
      queryClient.invalidateQueries({ queryKey: ['jenkinsPipeline'] });
    },
  });
}

export function useBuilds() {
  return useQuery({
    queryKey: ['builds'],
    queryFn: () => api.getBuilds(),
  });
}

export function useBugs() {
  return useQuery({
    queryKey: ['bugs'],
    queryFn: () => api.getBugs(),
    refetchInterval: 10_000,
  });
}

// ── Demo Tools ──────────────────────────────────────────────────────

export function useDemoSettings() {
  return useQuery({
    queryKey: ['demoSettings'],
    queryFn: () => api.getDemoSettings(),
    refetchInterval: 5_000,
  });
}

export function useInjectBug() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: DemoSettings) => api.injectBug(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demoSettings'] });
      qc.invalidateQueries({ queryKey: ['bugs'] });
    },
  });
}

export function useRunRegression() {
  return useMutation({
    mutationFn: () => api.runRegression(),
  });
}

export function useRunStatus(token: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['runStatus', token],
    queryFn: async () => {
      const result = await api.getRunStatus(token!);
      // When the run finishes, invalidate all data queries so results appear across the app
      if (result.status === 'passed' || result.status === 'failed') {
        qc.invalidateQueries({ queryKey: ['runs'] });
        qc.invalidateQueries({ queryKey: ['overview'] });
        qc.invalidateQueries({ queryKey: ['failures'] });
        qc.invalidateQueries({ queryKey: ['summaries'] });
        qc.invalidateQueries({ queryKey: ['builds'] });
        qc.invalidateQueries({ queryKey: ['agentStatus'] });
        qc.invalidateQueries({ queryKey: ['bugs'] });
        qc.invalidateQueries({ queryKey: ['jenkinsPipeline'] });
      }
      return result;
    },
    enabled: !!token,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'passed' || status === 'failed') return false;
      return 2_000;
    },
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.resetDemo(),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
