const express = require('express');
const router = express.Router();
const { query } = require('../middleware/db');
const { cacheMiddleware } = require('../middleware/cache');

router.get('/national', cacheMiddleware(3600), async (req, res) => {
  try {
    const rows = await query(`
      SELECT word, COUNT(DISTINCT state) as state_count,
             AVG(distinctiveness_score) as avg_distinctiveness,
             AVG(sentiment_avg) as avg_sentiment,
             SUM(frequency) as total_frequency
      FROM state_word_daily
      WHERE date >= date('now', '-7 days')
        AND distinctiveness_score > 0.01
      GROUP BY word
      HAVING COUNT(DISTINCT state) >= 3
      ORDER BY avg_distinctiveness DESC
      LIMIT 30
    `);
    res.json({ trending: rows });
  } catch (err) {
    console.error('Error fetching national trends:', err);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

router.get('/new', cacheMiddleware(3600), async (req, res) => {
  try {
    const rows = await query(`
      SELECT word, state, frequency, distinctiveness_score, novelty_score
      FROM state_word_daily
      WHERE date >= date('now', '-7 days')
        AND novelty_score > 0.1
      ORDER BY novelty_score DESC, distinctiveness_score DESC
      LIMIT 20
    `);
    res.json({ newWords: rows });
  } catch (err) {
    console.error('Error fetching new words:', err);
    res.status(500).json({ error: 'Failed to fetch new words' });
  }
});

router.get('/contagion/:word', cacheMiddleware(3600), async (req, res) => {
  try {
    const { word } = req.params;

    const [spread, history] = await Promise.all([
      query(`
        SELECT word, first_seen_state, first_seen_date, states_reached, spread_velocity
        FROM word_spread_log WHERE word = ?
      `, [word]),
      query(`
        SELECT state, date, frequency, distinctiveness_score
        FROM state_word_daily
        WHERE word = ? AND date >= date('now', '-30 days')
        ORDER BY date, state
      `, [word]),
    ]);

    // Parse states_reached from CSV string
    const spreadData = spread[0] ? {
      ...spread[0],
      states_reached: typeof spread[0].states_reached === 'string'
        ? spread[0].states_reached.split(',')
        : spread[0].states_reached,
    } : null;

    res.json({ word, spread: spreadData, history });
  } catch (err) {
    console.error('Error fetching contagion data:', err);
    res.status(500).json({ error: 'Failed to fetch contagion data' });
  }
});

router.get('/leaderboard', cacheMiddleware(3600), async (req, res) => {
  try {
    const rows = await query(`
      SELECT word, SUM(frequency) as total_frequency,
             AVG(distinctiveness_score) as avg_distinctiveness,
             COUNT(DISTINCT state) as state_count,
             AVG(sentiment_avg) as avg_sentiment
      FROM state_word_daily
      WHERE date = date('now')
      GROUP BY word
      ORDER BY avg_distinctiveness DESC
      LIMIT 20
    `);
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.get('/word-changes', cacheMiddleware(3600), async (req, res) => {
  try {
    const rows = await query(`
      SELECT today.state, today.top_word as current_word,
             yesterday.top_word as previous_word, today.date
      FROM state_daily_profile today
      JOIN state_daily_profile yesterday
        ON today.state = yesterday.state
        AND yesterday.date = date(today.date, '-1 day')
      WHERE today.date = date('now')
        AND today.top_word != yesterday.top_word
      ORDER BY today.state
    `);
    res.json({ changes: rows });
  } catch (err) {
    console.error('Error fetching word changes:', err);
    res.status(500).json({ error: 'Failed to fetch word changes' });
  }
});

module.exports = router;
