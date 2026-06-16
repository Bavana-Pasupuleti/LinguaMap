import { useApi } from '../hooks/useApi';
import {
  fetchSentimentHeatmap, fetchDriftLeaderboard,
  fetchPosDistribution, fetchAnomalies, fetchClusters, fetchPipelineStatus
} from '../utils/api';
import { STATE_NAMES } from '../utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, Cell
} from 'recharts';

const CLUSTER_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AnalysisPage() {
  const { data: heatmap } = useApi(() => fetchSentimentHeatmap(30), []);
  const { data: drift } = useApi(fetchDriftLeaderboard, []);
  const { data: pos } = useApi(fetchPosDistribution, []);
  const { data: anomalies } = useApi(fetchAnomalies, []);
  const { data: clusters } = useApi(fetchClusters, []);
  const { data: pipeline } = useApi(fetchPipelineStatus, []);

  const driftData = (drift?.driftLeaderboard || []).slice(0, 20).map(d => ({
    state: d.state,
    name: STATE_NAMES[d.state] || d.state,
    uniqueWords: parseInt(d.unique_top_words) || 0,
  }));

  const posData = pos?.posDistribution ? Object.entries(pos.posDistribution).slice(0, 15).map(([state, dist]) => {
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    return {
      state,
      NOUN: ((dist.NOUN || 0) / total * 100).toFixed(1),
      VERB: ((dist.VERB || 0) / total * 100).toFixed(1),
      ADJ: ((dist.ADJ || 0) / total * 100).toFixed(1),
    };
  }) : [];

  const clusterData = (clusters?.clusters || []).map(c => ({
    state: c.state,
    cluster: c.cluster_label || `Cluster ${c.cluster_id}`,
    clusterId: c.cluster_id,
    word: c.top_word,
    sentiment: c.dominant_sentiment,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Data Analysis Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drift Leaderboard */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            Linguistic Drift (Most Volatile)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driftData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis type="category" dataKey="state" tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }}
                formatter={(val) => [`${val} unique top words`, 'Drift']} />
              <Bar dataKey="uniqueWords" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* POS Distribution */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            Part-of-Speech Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={posData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="state" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} />
              <Bar dataKey="NOUN" stackId="pos" fill="#8b5cf6" name="Nouns" />
              <Bar dataKey="VERB" stackId="pos" fill="#3b82f6" name="Verbs" />
              <Bar dataKey="ADJ" stackId="pos" fill="#10b981" name="Adjectives" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Regional Clusters */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            Linguistic Clusters
          </h3>
          {clusterData.length > 0 ? (
            <div className="space-y-3">
              {Object.entries(
                clusterData.reduce((acc, c) => {
                  const label = c.cluster;
                  if (!acc[label]) acc[label] = [];
                  acc[label].push(c);
                  return acc;
                }, {})
              ).map(([label, states], i) => (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full" style={{ background: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
                    <span className="text-sm font-medium text-slate-200">{label}</span>
                    <span className="text-xs text-slate-500">({states.length} states)</span>
                  </div>
                  <div className="flex flex-wrap gap-1 ml-5">
                    {states.map(s => (
                      <span key={s.state} className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300">
                        {s.state}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No cluster data available</p>
          )}
        </div>

        {/* Anomalies */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-3 uppercase tracking-wide">
            Recent Anomalies
          </h3>
          {(anomalies?.anomalies || []).length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {anomalies.anomalies.map((a, i) => (
                <div key={i} className="bg-slate-800 rounded p-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-red-400">{a.state}</span>
                    <span className="text-xs text-slate-500">{a.date?.split('T')[0]}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{a.description}</p>
                  <div className="flex gap-2 mt-1 text-xs text-slate-500">
                    <span>z-score: {parseFloat(a.z_score || 0).toFixed(2)}</span>
                    <span>value: {parseFloat(a.value || 0).toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No anomalies detected recently</p>
          )}
        </div>

        {/* Pipeline Health */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            Pipeline Health
          </h3>
          {pipeline?.todayTasks?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase">
                    <th className="pb-2">Task</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Rows</th>
                    <th className="pb-2">Errors</th>
                    <th className="pb-2">Duration</th>
                    <th className="pb-2">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {pipeline.todayTasks.map((t, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="py-1.5 font-mono text-slate-300">{t.task_name}</td>
                      <td>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          t.status === 'success' ? 'bg-green-900/30 text-green-400' :
                          t.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                          'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="text-slate-400">{t.rows_processed}</td>
                      <td className={t.errors > 0 ? 'text-red-400' : 'text-slate-400'}>{t.errors}</td>
                      <td className="text-slate-400">{(t.duration_seconds || 0).toFixed(1)}s</td>
                      <td className="text-slate-500 text-xs">{t.completed_at?.split('T')[1]?.slice(0, 8) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No pipeline runs today</p>
          )}
        </div>
      </div>
    </div>
  );
}
