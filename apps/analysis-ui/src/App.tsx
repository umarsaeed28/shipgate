import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Runs } from './pages/Runs';
import { RunDetail } from './pages/RunDetail';
import { Failures } from './pages/Failures';
import { Reports } from './pages/Reports';
import { AgentStatus } from './pages/AgentStatus';
import { Bugs } from './pages/Bugs';
import { DemoTools } from './pages/DemoTools';
import { JenkinsConsole } from './pages/JenkinsConsole';
import { JenkinsPipelines } from './pages/JenkinsPipelines';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Local Codecept run log (standalone tab) */}
          <Route path="jenkins/console/:token" element={<JenkinsConsole />} />

          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="runs" element={<Runs />} />
            <Route path="runs/:id" element={<RunDetail />} />
            <Route path="failures" element={<Failures />} />
            <Route path="bugs" element={<Bugs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="agent" element={<AgentStatus />} />
            <Route path="agent-status" element={<Navigate to="/agent" replace />} />
            <Route path="jenkins/pipelines" element={<JenkinsPipelines />} />
            <Route path="demo-tools" element={<DemoTools />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
