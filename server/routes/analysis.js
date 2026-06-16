const express = require('express');
const router = express.Router();
const { query } = require('../middleware/db');
const { cacheMiddleware } = require('../middleware/cache');

router.get('/clusters/today', cacheMiddleware(3600), async (req, res) => {
  try {
    const rows = await query(`
      SELECT rc.state, rc.cluster_id, rc.cluster_label, rc.similarity_score,
             sdp.top_word, sdp.dominant_sentiment
      FROM regional_clusters rc
      LEFT JOIN state_daily_profile sdp ON rc.state = sdp.state AND sdp.date = date('now')
      WHERE rc.date = (SELECT MAX(date) FROM regional_clusters)
      ORDER BY rc.cluster_id, rc.state
    `);
    res.json({ clusters: rows });
  } catch (err) {
    console.error('Error fetching clusters:', err);
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
});

router.get('/anomalies/recent', cacheMiddleware(1800), async (req, res) => {
  try {
    const rows = await query(`
      SELECT state, date, anomaly_type, metric, value, baseline, z_score, description
      FROM anomaly_log
      WHERE date >= date('now', '-7 days')
      ORDER BY date DESC, ABS(z_score) DESC
      LIMIT 50
    `);
    res.json({ anomalies: rows });
  } catch (err) {
    console.error('Error fetching anomalies:', err);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

router.get('/sentiment/heatmap', cacheMiddleware(3600), async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const rows = await query(`
      SELECT state, date(measured_at) as date,
             AVG(compound_score) as sentiment,
             COUNT(*) as sample_size
      FROM state_sentiment_ts
      WHERE measured_at >= date('now', '-' || ? || ' days')
      GROUP BY state, date(measured_at)
      ORDER BY state, date
    `, [days]);
    res.json({ heatmap: rows, days });
  } catch (err) {
    console.error('Error fetching sentiment heatmap:', err);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

router.get('/drift/leaderboard', cacheMiddleware(3600), async (req, res) => {
  try {
    const rows = await query(`
      SELECT state, COUNT(DISTINCT word) as unique_top_words
      FROM state_word_daily
      WHERE date >= date('now', '-28 days')
        AND distinctiveness_score > 0.02
      GROUP BY state
      ORDER BY unique_top_words DESC
    `);
    res.json({ driftLeaderboard: rows });
  } catch (err) {
    console.error('Error fetching drift leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch drift data' });
  }
});

router.get('/pos/distribution', cacheMiddleware(3600), async (req, res) => {
  try {
    const rows = await query(`
      SELECT state, pos_tag, SUM(frequency) as total
      FROM state_word_daily
      WHERE date >= date('now', '-7 days')
        AND pos_tag IS NOT NULL
      GROUP BY state, pos_tag
      ORDER BY state, total DESC
    `);

    const byState = {};
    for (const row of rows) {
      if (!byState[row.state]) byState[row.state] = {};
      byState[row.state][row.pos_tag] = parseInt(row.total);
    }

    res.json({ posDistribution: byState });
  } catch (err) {
    console.error('Error fetching POS distribution:', err);
    res.status(500).json({ error: 'Failed to fetch POS data' });
  }
});

module.exports = router;
