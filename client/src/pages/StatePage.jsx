import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fetchStateProfile, fetchStateHistory } from '../utils/api';
import { STATE_NAMES } from '../utils/constants';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const POS_COLORS = {
  NOUN: '#8b5cf6', VERB: '#3b82f6', ADJ: '#10b981',
  ADV: '#f59e0b', PROPN: '#ef4444', ADP: '#06b6d4',
};

const TOPIC_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function StatePage() {
  const { name } = useParams();
  const stateCode = name.toUpperCase();

  const { data: profile, loading: pLoading } = useApi(() => fetchStateProfile(stateCode), [stateCode]);
  const { data: history, loading: hLoading } = useApi(() => fetchStateHistory(stateCode, 30), [stateCode]);

  if (pLoading || hLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const sentimentData = profile?.sentimentHistory?.map(s => ({
    date: s.date?.split('T')[0]?.slice(5),
    sentiment: parseFloat(s.compound) || 0,
    subjectivity: parseFloat(s.subjectivity) || 0,
  })) || [];

  const wordData = profile?.topWords?.slice(0, 20).map(w => ({
    word: w.word,
    score: w.distinctiveness_score || 0,
    frequency: w.frequency || 0,
    pos: w.pos_tag || 'UNK',
  })) || [];

  const topicData = profile?.topics?.map((t, i) => ({
    name: t.top_words?.slice(0, 3).join(', ') || `Topic ${i + 1}`,
    value: t.weight || 1,
    fullWords: t.top_words || [],
  })) || [];

  const historyData = history?.history?.map(h => ({
    date: h.date?.split('T')[0]?.slice(5),
    word: h.top_word,
    sentiment: parseFloat(h.sentiment_avg) || 0,
    volume: h.post_volume || 0,
  })) || [];

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-sm text-slate-400 hover:text-violet-300 transition-colors">
          ← Back to Map
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">{STATE_NAMES[stateCode] || stateCode}</h1>
        <p className="text-slate-400 mt-1">
          Top word: <span className="text-violet-300 font-mono font-bold text-lg">{profile?.profile?.top_word || '—'}</span>
          {' '} | Sentiment: {(profile?.profile?.sentiment_avg || 0).toFixed(3)}
          {' '} | Posts today: {profile?.profile?.post_volume || 0}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Trend */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">30-Day Sentiment Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sentimentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} />
              <Line type="monotone" dataKey="sentiment" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Sentiment" />
              <Line type="monotone" dataKey="subjectivity" stroke="#f59e0b" strokeWidth={1} dot={false} name="Subjectivity" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Word Frequency Bar Chart */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Top Words by Distinctiveness</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={wordData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis type="category" dataKey="word" tick={{ fontSize: 9, fill: '#94a3b8' }} width={60} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} />
              <Bar dataKey="score" name="Distinctiveness">
                {wordData.map((entry, i) => (
                  <Cell key={i} fill={POS_COLORS[entry.pos] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2">
            {Object.entries(POS_COLORS).slice(0, 4).map(([pos, color]) => (
              <div key={pos} className="flex items-center gap-1 text-xs text-slate-400">
                <span className="w-2 h-2 rounded" style={{ background: color }} />
                {pos}
              </div>
            ))}
          </div>
        </div>

        {/* Topic Wheel */}
        {topicData.length > 0 && (
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Weekly Topics</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={topicData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name }) => name.slice(0, 20)}>
                  {topicData.map((_, i) => (
                    <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Named Entities */}
        {profile?.entities?.length > 0 && (
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Named Entities</h3>
            <div className="space-y-2">
              {profile.entities.slice(0, 15).map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-400 font-mono w-12 text-center">{e.entity_type}</span>
                  <span className="text-slate-200 flex-1">{e.entity_text}</span>
                  <span className="text-xs text-slate-500">{e.frequency}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post Volume History */}
        {historyData.length > 0 && (
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Word History Timeline</h3>
            <div className="flex flex-wrap gap-1 mb-3">
              {historyData.map((d, i) => (
                <div key={i} className="text-center">
                  <div className="text-[10px] text-slate-500">{d.date}</div>
                  <div className="text-xs font-mono text-violet-300">{d.word || '—'}</div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={historyData}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} />
                <Bar dataKey="volume" fill="#3b82f6" name="Post Volume" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
