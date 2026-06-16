import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { FIPS_TO_STATE, CATEGORIES, SENTIMENT_COLORS } from '../utils/constants';

const US_TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

export default function USAMap({ stateData, colorBy = 'category', onStateClick, wordChanges = [] }) {
  const svgRef = useRef();
  const [topoData, setTopoData] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    import('topojson-client').then(topojson => {
      d3.json(US_TOPO_URL).then(us => {
        const states = topojson.feature(us, us.objects.states);
        setTopoData(states);
      });
    });
  }, []);

  useEffect(() => {
    if (!topoData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 960;
    const height = 600;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const projection = geoAlbersUsa().fitSize([width, height], topoData);
    const path = geoPath().projection(projection);

    const stateMap = {};
    if (stateData?.states) {
      for (const s of stateData.states) {
        stateMap[s.state] = s;
      }
    }

    const changedStates = new Set(wordChanges.map(c => c.state));

    const getColor = (stateCode) => {
      const s = stateMap[stateCode];
      if (!s) return '#1e293b';

      if (colorBy === 'sentiment') {
        const sent = s.sentiment_avg || 0;
        if (sent > 0.1) return SENTIMENT_COLORS.positive;
        if (sent < -0.1) return SENTIMENT_COLORS.negative;
        return SENTIMENT_COLORS.neutral;
      }

      const tags = s.tags || [];
      const category = s.category || (tags[0]) || 'unclassified';
      return CATEGORIES[category]?.color || CATEGORIES.unclassified.color;
    };

    const g = svg.append('g');

    g.selectAll('path')
      .data(topoData.features)
      .join('path')
      .attr('d', path)
      .attr('fill', d => {
        const fips = d.id?.toString().padStart(2, '0');
        const stateCode = FIPS_TO_STATE[fips];
        return getColor(stateCode);
      })
      .attr('stroke', '#334155')
      .attr('stroke-width', 0.5)
      .attr('cursor', 'pointer')
      .attr('opacity', 0.85)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#e2e8f0').attr('stroke-width', 1.5);
        const fips = d.id?.toString().padStart(2, '0');
        const stateCode = FIPS_TO_STATE[fips];
        const s = stateMap[stateCode];
        if (s) {
          const [x, y] = d3.pointer(event, svgRef.current);
          setTooltip({ x, y, state: stateCode, data: s });
        }
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.85).attr('stroke', '#334155').attr('stroke-width', 0.5);
        setTooltip(null);
      })
      .on('click', (event, d) => {
        const fips = d.id?.toString().padStart(2, '0');
        const stateCode = FIPS_TO_STATE[fips];
        if (stateCode && onStateClick) onStateClick(stateCode);
      });

    // State labels
    g.selectAll('text')
      .data(topoData.features)
      .join('text')
      .attr('transform', d => {
        const centroid = path.centroid(d);
        return `translate(${centroid})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('font-size', '7px')
      .attr('font-weight', '600')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text(d => {
        const fips = d.id?.toString().padStart(2, '0');
        const stateCode = FIPS_TO_STATE[fips];
        const s = stateMap[stateCode];
        return s?.top_word ? s.top_word.slice(0, 8) : '';
      });

    // Word-changed badges
    g.selectAll('circle.badge')
      .data(topoData.features.filter(d => {
        const fips = d.id?.toString().padStart(2, '0');
        return changedStates.has(FIPS_TO_STATE[fips]);
      }))
      .join('circle')
      .attr('class', 'badge')
      .attr('cx', d => path.centroid(d)[0] + 12)
      .attr('cy', d => path.centroid(d)[1] - 8)
      .attr('r', 4)
      .attr('fill', '#f59e0b')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1);

  }, [topoData, stateData, colorBy, wordChanges, onStateClick]);

  return (
    <div className="relative">
      <svg ref={svgRef} className="w-full h-auto" />
      {tooltip && (
        <div
          className="absolute bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm pointer-events-none z-10 shadow-xl"
          style={{ left: `${tooltip.x + 10}px`, top: `${tooltip.y - 10}px` }}
        >
          <div className="font-bold text-white">{tooltip.state}</div>
          <div className="text-violet-300 font-mono">{tooltip.data.top_word || '—'}</div>
          <div className="text-xs text-slate-400 mt-1">
            Sentiment: {(tooltip.data.sentiment_avg || 0).toFixed(2)} | Posts: {tooltip.data.post_volume || 0}
          </div>
        </div>
      )}
    </div>
  );
}
