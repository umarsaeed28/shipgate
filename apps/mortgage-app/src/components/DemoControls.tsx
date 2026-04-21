import type { DemoSettings } from '../types';

interface DemoControlsProps {
  settings: DemoSettings;
  onChange: (settings: DemoSettings) => void;
}

export default function DemoControls({ settings, onChange }: DemoControlsProps) {
  return (
    <div className="border-t border-gray-200 mt-12 pt-6" data-testid="demo-controls">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            QA Controls
          </span>
          <button
            type="button"
            role="switch"
            data-testid="toggle-demo-mode"
            aria-checked={settings.demoMode}
            onClick={() => onChange({ ...settings, demoMode: !settings.demoMode, simulateBug: false, simulateDelay: false })}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
              settings.demoMode ? 'bg-violet-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                settings.demoMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs text-gray-500">Demo Mode</span>
        </div>

        {settings.demoMode && (
          <div className="flex flex-wrap gap-6 bg-violet-50 rounded-xl p-4">
            <label className="flex items-center gap-2 cursor-pointer" data-testid="label-simulate-bug">
              <input
                type="checkbox"
                data-testid="toggle-simulate-bug"
                checked={settings.simulateBug}
                onChange={e => onChange({ ...settings, simulateBug: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-gray-700">Simulate Bug</span>
              <span className="text-xs text-gray-400">(payment off by $50)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer" data-testid="label-simulate-delay">
              <input
                type="checkbox"
                data-testid="toggle-simulate-delay"
                checked={settings.simulateDelay}
                onChange={e => onChange({ ...settings, simulateDelay: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-gray-700">Simulate Delay</span>
              <span className="text-xs text-gray-400">(5s calculation delay)</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
