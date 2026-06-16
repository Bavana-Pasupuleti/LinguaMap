import { NavLink } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fetchPipelineStatus } from '../utils/api';

function DataFreshness() {
  const { data } = useApi(fetchPipelineStatus, []);
  const lastRun = data?.lastRun?.completed_at;

  if (!lastRun) return null;

  const ago = Math.round((Date.now() - new Date(lastRun).getTime()) / 3600000);
  const fresh = ago < 24;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-2 h-2 rounded-full ${fresh ? 'bg-green-400' : 'bg-yellow-400'}`} />
      <span className="text-slate-400">
        Data: {ago < 1 ? '<1h ago' : `${ago}h ago`}
      </span>
    </div>
  );
}

const navItems = [
  { to: '/', label: 'Map' },
  { to: '/trends', label: 'Trends' },
  { to: '/compare', label: 'Compare' },
  { to: '/analysis', label: 'Analysis' },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="text-lg font-bold text-white tracking-tight">
              Lingua<span className="text-violet-400">Map</span>
            </NavLink>
            <div className="flex gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          <DataFreshness />
        </div>
      </nav>
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
