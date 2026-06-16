import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchCompareStates } from '../utils/api';
import { STATE_NAMES } from '../utils/constants';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';

const COMPARE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
const ALL_STATES = Object.keys(STATE_NAMES);

export default function ComparePage() {
  const [selected, setSelected] = useState(['CA', 'TX']);
  const [pendingState, setPendingState] = useState('');

  const { data, loading, reload } = useApi(
    () => selected.length >= 2 ? fetchCompareStates(selected) : Promise.resolve(null),
    [selected.join(',')]
  );

  const addState = () => {
    if (pendingState && !selected.includes(pendingState) && selected.length < 4) {
      setSelected([...selected, pendingState]);
      setPendingState('');
    }
  };

  const removeState = (s) => {
    setSelected(selected.filter(x => x !== s));
  };

  const comparison = data?.comparison || {};

  const radarData = selected.length >= 2 ? [
    { metric: 'Sentiment', ...Object.fromEntries(selected.map(s => [s, Math.abs(comparison[s]?.sentiment?.compound || 0) * 100])) },
    { metric: 'Subjectivity', ...Object.fromEntries(selected.map(s => [s, (comparison[s]?.sentiment?.subjectivity || 0) * 100])) },
    { metric: 'Post Volume', ...Object.fromEntries(selected.map(s => [s, Math.min(100, (comparison[s]?.profile?.post_volume || 0) / 10)])) },
    { metric: 'Word Diversity', ...Object.fromEntries(selected.map(s => [s, (comparison[s]?.topWords?.length || 0) * 10])) },
    { metric: 'Top Score', ...Object.fromEntries(selected.map(s => [s, (comparison[s]?.topWords?.[0]?.distinctiveness_score || 0) * 10000])) },
  ] : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">State Comparison</h1>

      {/* State selector */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {selected.map((s, i) => (
            <span key={s} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: `${COMPARE_COLORS[i]}20`, border: `1px solid ${COMPARE_COLORS[i]}`, color: COMPARE_COLORS[i] }}>
              {STATE_NAMES[s]}
              <button onClick={() => removeState(s)} className="ml-1 hover:opacity-70">x</button>
            </span>
          ))}
          {selected.length < 4 && (
            <div className="flex items-center gap-1">
              <select
                value={pendingState}
                onChange={e => setPendingState(e.target.value)}
                className="bg-slate-800 text-slate-200 text-sm border border-slate-600 rounded px-2 py-1.5"
              >
                <option value="">Add state...</option>
                {ALL_STATES.filter(s => !selected.includes(s)).map(s => (
                  <option key={s} value={s}>{STATE_NAMES[s]}</option>
                ))}
              </select>
              <button onClick={addState} className="px-2 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded">
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Multi-Dimensional Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                {selected.map((s, i) => (
                  <Radar key={s} name={STATE_NAMES[s]} dataKey={s} stroke={COMPARE_COLORS[i]}
                    fill={COMPARE_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Side-by-side top words */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Top Words Comparison</h3>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
              {selected.map((s, i) => (
                <div key={s}>
                  <h4 className="text-sm font-bold mb-2" style={{ color: COMPARE_COLORS[i] }}>{STATE_NAMES[s]}</h4>
                  <div className="space-y-1">
                    {(comparison[s]?.topWords || []).slice(0, 8).map((w, j) => (
                      <div key={j} className="text-xs font-mono text-slate-300">{w.word}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Summary</h3>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
              {selected.map((s, i) => (
                <div key={s} className="bg-slate-800 rounded-lg p-3">
                  <h4 className="text-sm font-bold mb-2" style={{ color: COMPARE_COLORS[i] }}>{STATE_NAMES[s]}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Top word</span>
                      <span className="font-mono text-violet-300">{comparison[s]?.profile?.top_word || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sentiment</span>
                      <span>{(comparison[s]?.sentiment?.compound || 0).toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Post volume</span>
                      <span>{comparison[s]?.profile?.post_volume || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-slate-400">Select at least 2 states to compare</p>
      )}
    </div>
  );
}
