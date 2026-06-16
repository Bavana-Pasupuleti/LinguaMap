require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const mapRoutes = require('./routes/map');
const stateRoutes = require('./routes/state');
const trendingRoutes = require('./routes/trending');
const analysisRoutes = require('./routes/analysis');
const pipelineRoutes = require('./routes/pipeline');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/map', mapRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/pipeline', pipelineRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`LinguaMap API running on port ${PORT}`);
});
