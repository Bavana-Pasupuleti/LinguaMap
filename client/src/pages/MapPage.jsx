import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchMapToday, fetchMapDate, fetchWordChanges } from '../utils/api';
import USAMap from '../components/USAMap';
import StatePanel from '../components/StatePanel';
import FilterBar from '../components/FilterBar';
import Leaderboard from '../components/Leaderboard';

export default function MapPage() {
  const [selectedState, setSelectedState] = useState(null);
  const [colorBy, setColorBy] = useState('category');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateValue, setDateValue] = useState(new Date().toISOString().split('T')[0]);

  const isToday = dateValue === new Date().toISOString().split('T')[0];
  const { data: stateData, loading } = useApi(
    () => isToday ? fetchMapToday() : fetchMapDate(dateValue),
    [dateValue]
  );
  const { data: wordChanges } = useApi(fetchWordChanges, []);

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <FilterBar
          colorBy={colorBy}
          setColorBy={setColorBy}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          dateValue={dateValue}
          setDateValue={setDateValue}
        />

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <USAMap
              stateData={stateData}
              colorBy={colorBy}
              onStateClick={setSelectedState}
              wordChanges={wordChanges?.changes || []}
            />
          </div>
        )}

        {/* Word changes summary */}
        {wordChanges?.changes?.length > 0 && (
          <div className="mt-4 bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-amber-400 mb-2">Word Changes (Last 24h)</h3>
            <div className="flex flex-wrap gap-2">
              {wordChanges.changes.map((c, i) => (
                <span key={i} className="text-xs bg-slate-800 border border-slate-600 rounded-full px-2 py-1">
                  <span className="text-slate-300">{c.state}</span>
                  <span className="text-slate-500 mx-1">{c.previous_word}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-violet-300 ml-1">{c.current_word}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-64 shrink-0 hidden lg:block">
        <Leaderboard />
      </div>

      {/* State detail panel */}
      {selectedState && (
        <StatePanel
          stateCode={selectedState}
          onClose={() => setSelectedState(null)}
        />
      )}
    </div>
  );
}
