import { useState, useCallback, useEffect } from 'react';
import type { MortgageInput, MortgageResult, DemoSettings } from './types';
import { calculateMortgage } from './utils/calculations';
import MortgageForm from './components/MortgageForm';
import ResultsPanel from './components/ResultsPanel';
import PaymentBreakdown from './components/PaymentBreakdown';
import AmortizationTable from './components/AmortizationTable';
import SummaryCard from './components/SummaryCard';
import DemoControls from './components/DemoControls';

const DEMO_API_URL = 'http://localhost:4000/api/demo/settings';

export default function App() {
  const [result, setResult] = useState<MortgageResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [demoSettings, setDemoSettings] = useState<DemoSettings>({
    demoMode: false,
    simulateBug: false,
    simulateDelay: false,
  });

  // Poll the Analysis API for remote demo settings every 2 seconds
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(DEMO_API_URL);
        if (res.ok && active) {
          const remote = await res.json();
          setDemoSettings(prev => ({
            ...prev,
            simulateBug: remote.simulateBug ?? prev.simulateBug,
            simulateDelay: remote.simulateDelay ?? prev.simulateDelay,
          }));
        }
      } catch { /* API not available - keep local state */ }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const handleCalculate = useCallback(async (input: MortgageInput) => {
    setIsCalculating(true);

    // Always fetch latest demo settings at calculation time to avoid race conditions
    let activeBug = demoSettings.simulateBug;
    let activeDelay = demoSettings.simulateDelay;
    try {
      const res = await fetch(DEMO_API_URL);
      if (res.ok) {
        const remote = await res.json();
        activeBug = remote.simulateBug ?? activeBug;
        activeDelay = remote.simulateDelay ?? activeDelay;
        setDemoSettings(prev => ({ ...prev, simulateBug: activeBug, simulateDelay: activeDelay }));
      }
    } catch { /* API unavailable - use local state */ }

    const bugOffset = activeBug ? 50 : 0;

    if (activeDelay) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const res = calculateMortgage(input, bugOffset);
    setResult(res);
    setIsCalculating(false);
  }, [demoSettings.simulateBug, demoSettings.simulateDelay]);

  const handleReset = useCallback(() => {
    setResult(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100" data-testid="app-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight" data-testid="app-title">
              Mortgage Calculator
            </h1>
            <p className="text-xs text-gray-400">Shipgate Regression Analyzer</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <MortgageForm
              onCalculate={handleCalculate}
              onReset={handleReset}
              isCalculating={isCalculating}
            />
          </div>

          <div className="lg:col-span-3 space-y-6">
            {result ? (
              <>
                <ResultsPanel result={result} />
                <PaymentBreakdown result={result} />
                <SummaryCard result={result} />
              </>
            ) : (
              <div className="card flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">Enter your loan details and click Calculate</p>
                <p className="text-gray-300 text-xs mt-1">Your results will appear here</p>
              </div>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-6">
            <AmortizationTable result={result} />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 pb-6">
        <DemoControls settings={demoSettings} onChange={setDemoSettings} />
        <p className="text-center text-xs text-gray-300 mt-6">
          Shipgate Regression Analyzer &middot; Demo Application
        </p>
      </footer>
    </div>
  );
}
