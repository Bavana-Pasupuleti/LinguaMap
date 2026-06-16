import axios from 'axios';
import { MOCK_MAP_TODAY, MOCK_LEADERBOARD, MOCK_WORD_CHANGES, MOCK_PIPELINE_STATUS } from './mockData';

const IS_STATIC = import.meta.env.VITE_STATIC_API === 'true';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

function staticGet(jsonPath) {
  return axios.get(`/api/${jsonPath}`, { timeout: 5000 }).then(r => r.data);
}

async function withFallback(fetcher, mockData) {
  try {
    return await fetcher();
  } catch {
    return mockData;
  }
}

export const fetchMapToday = () => withFallback(
  () => IS_STATIC
    ? staticGet('map/today.json')
    : api.get('/map/today').then(r => r.data),
  MOCK_MAP_TODAY
);

export const fetchMapDate = (date) => withFallback(
  () => api.get(`/map/date/${date}`).then(r => r.data),
  MOCK_MAP_TODAY
);

export const fetchStateProfile = (state) => withFallback(
  () => IS_STATIC
    ? staticGet(`state/${state.toLowerCase()}-profile.json`)
    : api.get(`/state/${state}/profile`).then(r => r.data),
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
  () => IS_STATIC
    ? staticGet(`state/${state.toLowerCase()}-history.json`)
    : api.get(`/state/${state}/history/${days}`).then(r => r.data),
  { state, days, history: [] }
);

export const fetchStateWords = (state) => withFallback(
  () => IS_STATIC
    ? staticGet(`state/${state.toLowerCase()}-words.json`)
    : api.get(`/state/${state}/words`).then(r => r.data),
  { state, words: [] }
);

export const fetchTrendingNational = () => withFallback(
  () => IS_STATIC
    ? staticGet('trending/national.json')
    : api.get('/trending/national').then(r => r.data),
  { trending: MOCK_LEADERBOARD.leaderboard.filter(w => w.state_count >= 3).slice(0, 15) }
);

export const fetchNewWords = () => withFallback(
  () => IS_STATIC
    ? staticGet('trending/new.json')
    : api.get('/trending/new').then(r => r.data),
  { newWords: [] }
);

export const fetchContagion = (word) => withFallback(
  () => IS_STATIC
    ? staticGet(`trending/contagion/${word}.json`)
    : api.get(`/trending/contagion/${word}`).then(r => r.data),
  { word, spread: null, history: [] }
);

export const fetchLeaderboard = () => withFallback(
  () => IS_STATIC
    ? staticGet('trending/leaderboard.json')
    : api.get('/trending/leaderboard').then(r => r.data),
  MOCK_LEADERBOARD
);

export const fetchWordChanges = () => withFallback(
  () => IS_STATIC
    ? staticGet('trending/word-changes.json')
    : api.get('/trending/word-changes').then(r => r.data),
  MOCK_WORD_CHANGES
);

export const fetchClusters = () => withFallback(
  () => IS_STATIC
    ? staticGet('analysis/clusters/today.json')
    : api.get('/analysis/clusters/today').then(r => r.data),
  { clusters: [] }
);

export const fetchAnomalies = () => withFallback(
  () => IS_STATIC
    ? staticGet('analysis/anomalies/recent.json')
    : api.get('/analysis/anomalies/recent').then(r => r.data),
  { anomalies: [] }
);

export const fetchSentimentHeatmap = (days = 30) => withFallback(
  () => api.get(`/analysis/sentiment/heatmap?days=${days}`).then(r => r.data),
  { heatmap: [], days }
);

export const fetchDriftLeaderboard = () => withFallback(
  () => IS_STATIC
    ? staticGet('analysis/drift/leaderboard.json')
    : api.get('/analysis/drift/leaderboard').then(r => r.data),
  { driftLeaderboard: [] }
);

export const fetchPosDistribution = () => withFallback(
  () => IS_STATIC
    ? staticGet('analysis/pos/distribution.json')
    : api.get('/analysis/pos/distribution').then(r => r.data),
  { posDistribution: {} }
);

export const fetchPipelineStatus = () => withFallback(
  () => IS_STATIC
    ? staticGet('pipeline/status.json')
    : api.get('/pipeline/status').then(r => r.data),
  MOCK_PIPELINE_STATUS
);

export const fetchCompareStates = (states) => withFallback(
  () => IS_STATIC
    ? staticGet('state/compare-default.json')
    : api.get(`/state/compare/states?states=${states.join(',')}`).then(r => r.data),
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
