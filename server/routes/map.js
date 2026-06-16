const express = require('express');
const router = express.Router();
const { query } = require('../middleware/db');
const { cacheMiddleware } = require('../middleware/cache');

router.get('/today', cacheMiddleware(3600), async (req, res) => {
  try {
    const rows = await query(`
      SELECT sdp.state, sdp.top_word, sdp.dominant_sentiment, sdp.sentiment_avg,
             sdp.post_volume, sdp.category,
             wa.lens, wa.context, wa.social_signal, wa.spread_pattern, wa.tags,
             COALESCE(wa.classified, 0) as classified
      FROM state_daily_profile sdp
      LEFT JOIN word_anthropology wa ON sdp.top_word = wa.word
      WHERE sdp.date = date('now')
      ORDER BY sdp.state
    `);
    res.json({ date: new Date().toISOString().split('T')[0], states: rows });
  } catch (err) {
    console.error('Error fetching today map:', err);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

router.get('/date/:date', cacheMiddleware(7200), async (req, res) => {
  try {
    const { date } = req.params;
    const rows = await query(`
      SELECT sdp.state, sdp.top_word, sdp.dominant_sentiment, sdp.sentiment_avg,
             sdp.post_volume, sdp.category,
             wa.lens, wa.context, wa.social_signal, wa.tags
      FROM state_daily_profile sdp
      LEFT JOIN word_anthropology wa ON sdp.top_word = wa.word
      WHERE sdp.date = ?
      ORDER BY sdp.state
    `, [date]);
    res.json({ date, states: rows });
  } catch (err) {
    console.error('Error fetching map for date:', err);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

module.exports = router;
