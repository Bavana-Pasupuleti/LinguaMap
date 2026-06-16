import axios from 'axios';
import { MOCK_MAP_TODAY, MOCK_LEADERBOARD, MOCK_WORD_CHANGES, MOCK_PIPELINE_STATUS } from './mockData';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

async function withFallback(fetcher, mockData) {
  try {
    return await fetcher();
  } catch {
    return mockData;
  }
}

export const fetchMapToday = () => withFallback(
  () => api.get('/map/today').then(r => r.data),
  MOCK_MAP_TODAY
);

export const fetchMapDate = (date) => withFallback(
  () => api.get(`/map/date/${date}`).then(r => r.data),
  MOCK_MAP_TODAY
);

export const fetchStateProfile = (state) => withFallback(
  () => api.get(`/state/${state}/profile`).then(r => r.data),
  {
    state,
    profile: MOCK_MAP_TODAY.states.find(s => s.state === state) || null,
    topWords: [],
    entities: [],
    topics: [],
    sentimentHistory: [],
  }
);

export const fetchStateHistory = (state, days = 30) => withFallback(
  () => api.get(`/state/${state}/history/${days}`).then(r => r.data),
  { state, days, history: [] }
);

export const fetchStateWords = (state) => withFallback(
  () => api.get(`/state/${state}/words`).then(r => r.data),
  { state, words: [] }
);

export const fetchTrendingNational = () => withFallback(
  () => api.get('/trending/national').then(r => r.data),
  { trending: MOCK_LEADERBOARD.leaderboard.filter(w => w.state_count >= 3).slice(0, 15) }
);

export const fetchNewWords = () => withFallback(
  () => api.get('/trending/new').then(r => r.data),
  { newWords: [] }
);

export const fetchContagion = (word) => withFallback(
  () => api.get(`/trending/contagion/${word}`).then(r => r.data),
  { word, spread: null, history: [] }
);

export const fetchLeaderboard = () => withFallback(
  () => api.get('/trending/leaderboard').then(r => r.data),
  MOCK_LEADERBOARD
);

export const fetchWordChanges = () => withFallback(
  () => api.get('/trending/word-changes').then(r => r.data),
  MOCK_WORD_CHANGES
);

export const fetchClusters = () => withFallback(
  () => api.get('/analysis/clusters/today').then(r => r.data),
  { clusters: [] }
);

export const fetchAnomalies = () => withFallback(
  () => api.get('/analysis/anomalies/recent').then(r => r.data),
  { anomalies: [] }
);

export const fetchSentimentHeatmap = (days = 30) => withFallback(
  () => api.get(`/analysis/sentiment/heatmap?days=${days}`).then(r => r.data),
  { heatmap: [], days }
);

export const fetchDriftLeaderboard = () => withFallback(
  () => api.get('/analysis/drift/leaderboard').then(r => r.data),
  { driftLeaderboard: [] }
);

export const fetchPosDistribution = () => withFallback(
  () => api.get('/analysis/pos/distribution').then(r => r.data),
  { posDistribution: {} }
);

export const fetchPipelineStatus = () => withFallback(
  () => api.get('/pipeline/status').then(r => r.data),
  MOCK_PIPELINE_STATUS
);

export const fetchCompareStates = (states) => withFallback(
  () => api.get(`/state/compare/states?states=${states.join(',')}`).then(r => r.data),
  {
    states,
    comparison: Object.fromEntries(states.map(s => [s, {
      profile: MOCK_MAP_TODAY.states.find(st => st.state === s) || null,
      topWords: [],
      sentiment: { compound: MOCK_MAP_TODAY.states.find(st => st.state === s)?.sentiment_avg || 0, subjectivity: 0.5 },
    }]))
  }
);

export default api;
