import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRunStatus } from '../api/queries';

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function JenkinsConsole() {
  const { token } = useParams<{ token: string }>();
  const runStatus = useRunStatus(token ?? null);
  const logRef = useRef<HTMLPreElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const data = runStatus.data;
  const isDone = data?.status === 'passed' || data?.status === 'failed';
  const isRunning = !!token && !isDone;

  useEffect(() => {
    if (logRef.current && autoScroll) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [data?.log, autoScroll]);

  const handleScroll = () => {
    if (!logRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 60);
  };

  const statusColor = !data ? '#4b91db'
    : data.status === 'passed' ? '#4caf50'
    : data.status === 'failed' ? '#ef5350'
    : '#4b91db';

  const statusLabel = !data ? 'LOADING'
    : data.status === 'running' ? 'IN PROGRESS'
    : data.status === 'passed' ? 'SUCCESS'
    : 'FAILURE';

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      {/* Jenkins Header */}
      <header style={{ background: '#333', color: '#fff', padding: '0', borderBottom: '3px solid #4b91db' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: '#d33833', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px', flexShrink: 0 }}>
            J
          </div>
          <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>Jenkins</span>
          <span style={{ color: '#999', fontSize: '13px' }}>/ shipgate-e2e / demo-regression-run</span>
        </div>
      </header>

      {/* Breadcrumb bar */}
      <div style={{ background: '#eee', borderBottom: '1px solid #ccc', padding: '6px 20px', fontSize: '12px', color: '#555' }}>
        <span>Dashboard</span>
        <span style={{ margin: '0 6px', color: '#999' }}>&#xBB;</span>
        <span>shipgate-e2e</span>
        <span style={{ margin: '0 6px', color: '#999' }}>&#xBB;</span>
        <span style={{ color: '#333', fontWeight: 600 }}>Console Output</span>
      </div>

      {/* Build info bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: statusColor, border: `2px solid ${statusColor}`, animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#333' }}>
              {statusLabel}
            </span>
          </div>
          {data && (
            <span style={{ fontSize: '12px', color: '#888' }}>
              Elapsed: {formatElapsed(data.elapsed)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isDone && data?.allureReportUrl && (
            <a
              href={data.allureReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#1a7f37', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}
            >
              Allure Report ↗
            </a>
          )}
          {isDone && data?.runId && (
            <Link
              to={`/runs/${data.runId}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#4b91db', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}
            >
              View Analysis Results &rarr;
            </Link>
          )}
          <span style={{ fontSize: '11px', color: '#999' }}>
            Started: {formatTimestamp(new Date(Date.now() - (data?.elapsed ?? 0)))}
          </span>
        </div>
      </div>

      {/* Console Title */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#333' }}>Console Output</h2>
        {isRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4b91db' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Build in progress...
          </div>
        )}
      </div>

      {/* Console output */}
      <div style={{ padding: '0 20px 20px' }}>
        <pre
          ref={logRef}
          onScroll={handleScroll}
          style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: '16px 20px',
            borderRadius: '4px',
            fontSize: '12.5px',
            lineHeight: '1.6',
            fontFamily: "'Courier New', Consolas, monospace",
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 'calc(100vh - 280px)',
            minHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #333',
            margin: 0,
          }}
        >
          <span style={{ color: '#888' }}>Started by user <span style={{ color: '#6a9fb5' }}>demo</span></span>{'\n'}
          <span style={{ color: '#888' }}>Running as SYSTEM</span>{'\n'}
          <span style={{ color: '#888' }}>Building on built-in node in workspace /shipgate/tests/e2e</span>{'\n'}
          <span style={{ color: '#888' }}>[shipgate-e2e] $ npx codeceptjs run --steps --plugins allure</span>{'\n'}
          <span style={{ color: '#569cd6' }}>{'─'.repeat(60)}</span>{'\n'}
          {data?.log || 'Waiting for output...\n'}
          {isDone && (
            <>
              {'\n'}
              <span style={{ color: '#569cd6' }}>{'─'.repeat(60)}</span>{'\n'}
              <span style={{ color: data.status === 'passed' ? '#4ec9b0' : '#f44747' }}>
                Finished: {data.status === 'passed' ? 'SUCCESS' : 'FAILURE'}
              </span>{'\n'}
              <span style={{ color: '#888' }}>
                Build duration: {formatElapsed(data.elapsed)}
              </span>{'\n'}
            </>
          )}
        </pre>
      </div>

      {/* Footer with result links */}
      {isDone && (
        <div style={{ padding: '0 20px 30px', display: 'flex', gap: '12px' }}>
          {data?.runId && (
            <Link
              to={`/runs/${data.runId}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: '#4b91db', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
            >
              View Full Analysis
            </Link>
          )}
          <Link
            to="/runs"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: '#fff', color: '#555', border: '1px solid #ccc', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}
          >
            All Runs
          </Link>
          <Link
            to="/failures"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: '#fff', color: '#555', border: '1px solid #ccc', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}
          >
            Failures
          </Link>
          <Link
            to="/demo-tools"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: '#fff', color: '#555', border: '1px solid #ccc', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}
          >
            Back to Demo Tools
          </Link>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
