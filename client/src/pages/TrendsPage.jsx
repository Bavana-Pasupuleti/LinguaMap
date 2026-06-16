import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchTrendingNational, fetchNewWords, fetchContagion } from '../utils/api';

function ContagionMap({ word }) {
  const { data, loading } = useApi(() => fetchContagion(word), [word]);

  if (loading) return <div className="animate-pulse h-32 bg-slate-700 rounded" />;
  if (!data?.history?.length) return <p className="text-slate-500 text-sm">No spread data available</p>;

  const dateGroups = {};
  for (const h of data.history) {
    const d = h.date?.split('T')[0];
    if (!dateGroups[d]) dateGroups[d] = [];
    dateGroups[d].push(h);
  }

  return (
    <div>
      {data.spread && (
        <div className="mb-3 text-sm text-slate-400">
          Origin: <span className="text-violet-300">{data.spread.first_seen_state}</span>
          {' '} | First seen: {data.spread.first_seen_date}
          {' '} | Spread velocity: {(data.spread.spread_velocity || 0).toFixed(2)} states/day
          {' '} | Reached: {data.spread.states_reached?.length || 0} states
        </div>
      )}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {Object.entries(dateGroups).sort().map(([date, entries]) => (
          <div key={date} className="flex items-start gap-3">
            <span className="text-xs text-slate-500 w-20 shrink-0 font-mono">{date.slice(5)}</span>
            <div className="flex flex-wrap gap-1">
              {entries.map((e, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-violet-900/40 border border-violet-700 rounded text-xs text-violet-300">
                  {e.state} <span className="text-violet-500">({e.frequency})</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const [selectedWord, setSelectedWord] = useState(null);
  const { data: trending, loading: tLoading } = useApi(fetchTrendingNational, []);
  const { data: newWords, loading: nLoading } = useApi(fetchNewWords, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">National Trends</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Words */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            Trending Across 3+ States
          </h3>
          {tLoading ? (
            <div className="animate-pulse space-y-2">
              {Array(10).fill(0).map((_, i) => <div key={i} className="h-4 bg-slate-700 rounded" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(trending?.trending || []).map((w, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedWord(w.word)}
                  className={`w-full flex items-center gap-2 text-sm py-1.5 px-2 rounded transition-colors ${
                    selectedWord === w.word ? 'bg-violet-900/30 border border-violet-600' : 'hover:bg-slate-800'
                  }`}
                >
                  <span className="text-slate-500 w-4 text-right font-mono text-xs">{i + 1}</span>
                  <span className="font-mono text-violet-300 flex-1 text-left">{w.word}</span>
                  <span className="text-xs text-slate-500">{w.state_count} states</span>
                  <span className="text-xs text-slate-500">{parseFloat(w.avg_distinctiveness || 0).toFixed(3)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Words */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wide">
            New Words This Week
          </h3>
          {nLoading ? (
            <div className="animate-pulse space-y-2">
              {Array(10).fill(0).map((_, i) => <div key={i} className="h-4 bg-slate-700 rounded" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(newWords?.newWords || []).map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-amber-300 flex-1">{w.word}</span>
                  <span className="text-xs text-slate-500">{w.state}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded">
                    novelty: {parseFloat(w.novelty_score || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contagion Map */}
        {selectedWord && (
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                Word Spread: <span className="text-violet-300 font-mono">{selectedWord}</span>
              </h3>
              <button
                onClick={() => setSelectedWord(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                Close
              </button>
            </div>
            <ContagionMap word={selectedWord} />
          </div>
        )}
      </div>
    </div>
  );
}
