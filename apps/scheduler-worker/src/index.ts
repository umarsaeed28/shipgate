import cron from 'node-cron';

const API_URL = process.env.SHIPGATE_API_URL || 'http://localhost:4000';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES || '5', 10);
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || `*/${POLL_INTERVAL} * * * *`;

type AgentState = 'dormant' | 'polling' | 'processing' | 'error';

let state: AgentState = 'dormant';
let lastProcessedBuild: number | null = null;
let consecutiveErrors = 0;

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] [scheduler] ${msg}`);
}

async function checkForNewBuilds(): Promise<void> {
  if (state === 'processing') {
    log('Already processing, skipping poll');
    return;
  }

  state = 'polling';
  log('Polling for new builds...');

  try {
    const res = await fetch(`${API_URL}/api/regression/builds`);
    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const data = await res.json() as { items: { buildNumber: number; processed: boolean }[] };
    const unprocessed = data.items.filter((b) => !b.processed);

    if (unprocessed.length === 0) {
      log('No unprocessed builds found. Returning to dormant.');
      state = 'dormant';
      consecutiveErrors = 0;
      return;
    }

    const latest = unprocessed.reduce((a, b) =>
      a.buildNumber > b.buildNumber ? a : b,
    );

    if (lastProcessedBuild !== null && latest.buildNumber <= lastProcessedBuild) {
      log(`Build #${latest.buildNumber} already processed this session. Dormant.`);
      state = 'dormant';
      return;
    }

    log(`Found unprocessed build #${latest.buildNumber}. Triggering analysis...`);
    state = 'processing';

    const analyzeRes = await fetch(`${API_URL}/api/regression/analyze-latest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!analyzeRes.ok) {
      const error = await analyzeRes.text();
      throw new Error(`Analysis failed: ${error}`);
    }

    const result = await analyzeRes.json() as { buildNumber?: number };
    lastProcessedBuild = result.buildNumber ?? latest.buildNumber;
    log(`Analysis complete for build #${lastProcessedBuild}. Returning to dormant.`);
    state = 'dormant';
    consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors++;
    const errMsg = err instanceof Error ? err.message : String(err);
    log(`Error during poll: ${errMsg} (consecutive: ${consecutiveErrors})`);
    state = 'error';

    if (consecutiveErrors >= 5) {
      log('Too many consecutive errors. Waiting for next scheduled poll.');
    }

    setTimeout(() => {
      if (state === 'error') state = 'dormant';
    }, 10000);
  }
}

function start() {
  log('='.repeat(60));
  log('Shipgate Regression Analyzer - Scheduler Worker');
  log('='.repeat(60));
  log(`API URL: ${API_URL}`);
  log(`Poll interval: ${POLL_INTERVAL} minutes`);
  log(`Cron schedule: ${CRON_SCHEDULE}`);
  log('Starting scheduler...');

  checkForNewBuilds();

  cron.schedule(CRON_SCHEDULE, () => {
    checkForNewBuilds();
  });

  log('Scheduler active. Waiting for builds...');
}

start();
