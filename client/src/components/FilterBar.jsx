import { CATEGORIES } from '../utils/constants';

export default function FilterBar({ colorBy, setColorBy, sourceFilter, setSourceFilter, dateValue, setDateValue }) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-4 bg-slate-900 rounded-lg p-3 border border-slate-800">
      {/* Color By */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400 uppercase">Color by</label>
        <select
          value={colorBy}
          onChange={e => setColorBy(e.target.value)}
          className="bg-slate-800 text-slate-200 text-sm border border-slate-600 rounded px-2 py-1"
        >
          <option value="category">Category</option>
          <option value="sentiment">Sentiment</option>
        </select>
      </div>

      {/* Source Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400 uppercase">Source</label>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="bg-slate-800 text-slate-200 text-sm border border-slate-600 rounded px-2 py-1"
        >
          <option value="all">All Sources</option>
          <option value="reddit">Reddit</option>
          <option value="mastodon">Mastodon</option>
          <option value="news">News</option>
        </select>
      </div>

      {/* Date Picker */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400 uppercase">Date</label>
        <input
          type="date"
          value={dateValue}
          onChange={e => setDateValue(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="bg-slate-800 text-slate-200 text-sm border border-slate-600 rounded px-2 py-1"
        />
      </div>

      {/* Category Legend */}
      <div className="flex gap-3 ml-auto">
        {Object.entries(CATEGORIES).slice(0, 4).map(([key, cat]) => (
          <div key={key} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
            <span className="text-xs text-slate-400">{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
