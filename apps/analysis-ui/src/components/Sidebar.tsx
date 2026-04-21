import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Overview', icon: '◫' },
  { to: '/runs', label: 'Runs', icon: '☰' },
  { to: '/failures', label: 'Failures', icon: '⚠' },
  { to: '/bugs', label: 'Bugs', icon: '🐛' },
  { to: '/reports', label: 'Reports', icon: '◧' },
  { to: '/jenkins/pipelines', label: 'Pipeline', icon: 'Ⓙ' },
  { to: '/agent-status', label: 'Agent Status', icon: '⚙' },
];

const demoItems = [
  { to: '/demo-tools', label: 'Demo Tools', icon: '🧪' },
];

function NavItem({ item }: { item: typeof navItems[number] }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`
      }
    >
      <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-60 bg-white border-r border-slate-200 flex flex-col z-30">
      <div className="h-16 flex items-center px-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-sm leading-tight">
            Shipgate
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>

      <div className="px-3 pb-2">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Configuration</p>
        <p className="px-3 mt-1 text-[11px] text-slate-400 leading-snug">
          Jenkins URL and job name - used to monitor CI runs and the Pipeline view.
        </p>
        <div className="mt-2 space-y-1">
          <NavItem item={{ to: '/settings', label: 'Settings', icon: '⛭' }} />
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 mx-3" />
      <div className="px-3 py-3 space-y-1">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Demo Only
        </p>
        {demoItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </div>

      <div className="px-4 py-3 border-t border-slate-200">
        <p className="text-[11px] text-slate-400">Regression Analyzer v0.1.0</p>
      </div>
    </aside>
  );
}
