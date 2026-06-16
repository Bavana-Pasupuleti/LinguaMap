import { useApi } from '../hooks/useApi';
import { fetchLeaderboard } from '../utils/api';

export default function Leaderboard() {
  const { data, loading } = useApi(fetchLeaderboard, []);

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Top Words Today</h3>
        <div className="animate-pulse space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-4 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const words = data?.leaderboard || [];

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Top Words Nationally</h3>
      <div className="space-y-2">
        {words.slice(0, 20).map((w, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-5 text-right font-mono text-xs">{i + 1}</span>
            <span className="font-mono text-violet-300 flex-1">{w.word}</span>
            <span className="text-xs text-slate-500">{w.state_count} states</span>
          </div>
        ))}
      </div>
    </div>
  );
}
