import { useApi } from '../hooks/useApi';
import { fetchStateProfile } from '../utils/api';
import { STATE_NAMES, CATEGORIES } from '../utils/constants';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const TOPIC_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function StatePanel({ stateCode, onClose }) {
  const { data, loading, error } = useApi(() => fetchStateProfile(stateCode), [stateCode]);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="w-96 bg-slate-900 border-l border-slate-700 p-6 overflow-y-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/2" />
          <div className="h-4 bg-slate-700 rounded w-3/4" />
          <div className="h-32 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-96 bg-slate-900 border-l border-slate-700 p-6">
        <button onClick={onClose} className="text-slate-400 hover:text-white mb-4">Close</button>
        <p className="text-red-400">Failed to load state data</p>
      </div>
    );
  }

  const { profile, topWords, entities, topics, sentimentHistory } = data;
  const sentimentData = sentimentHistory?.map(s => ({
    date: s.date?.split('T')[0]?.slice(5),
    sentiment: parseFloat(s.compound) || 0,
  })) || [];

  const topicData = topics?.map((t, i) => ({
    name: t.top_words?.slice(0, 3).join(', ') || `Topic ${i + 1}`,
    value: t.weight || 1,
  })) || [];

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-700 p-6 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">{STATE_NAMES[stateCode] || stateCode}</h2>
          <p className="text-sm text-slate-400">{stateCode}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">x</button>
      </div>

      {/* Top Word */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <p className="text-xs text-slate-400 uppercase tracking-wide">Top Word Today</p>
        <p className="text-2xl font-mono font-bold text-violet-300 mt-1">{profile?.top_word || '—'}</p>
        <div className="flex gap-4 mt-2 text-xs text-slate-400">
          <span>Sentiment: <span className={profile?.sentiment_avg > 0 ? 'text-green-400' : profile?.sentiment_avg < 0 ? 'text-red-400' : 'text-slate-300'}>{(profile?.sentiment_avg || 0).toFixed(3)}</span></span>
          <span>Posts: {profile?.post_volume || 0}</span>
        </div>
      </div>

      {/* Sentiment Sparkline */}
      {sentimentData.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">30-Day Sentiment</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={sentimentData}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 9, fill: '#64748b' }} width={30} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="sentiment" stroke="#8b5cf6" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Words */}
      {topWords?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Top Words</p>
          <div className="space-y-1">
            {topWords.slice(0, 10).map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 w-4 text-right">{i + 1}</span>
                <span className="font-mono text-slate-200 flex-1">{w.word}</span>
                <span className="text-xs text-slate-500">{w.pos_tag}</span>
                <div className="w-16 bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-violet-400 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, (w.distinctiveness_score || 0) * 1000)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topics */}
      {topicData.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Weekly Topics</p>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={topicData} cx="50%" cy="50%" outerRadius={50} dataKey="value" label={({ name }) => name.slice(0, 15)}>
                {topicData.map((_, i) => (
                  <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Entities */}
      {entities?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Named Entities</p>
          <div className="flex flex-wrap gap-1">
            {entities.slice(0, 15).map((e, i) => (
              <span key={i} className="px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300">
                {e.entity_text} <span className="text-slate-500">({e.entity_type})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate(`/state/${stateCode}`)}
        className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Full Analysis
      </button>
    </div>
  );
}
