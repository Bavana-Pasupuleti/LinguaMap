const express = require('express');
const router = express.Router();
const { query } = require('../middleware/db');
const { cacheMiddleware } = require('../middleware/cache');

router.get('/compare/states', cacheMiddleware(3600), async (req, res) => {
  try {
    const states = (req.query.states || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (states.length < 2 || states.length > 4) {
      return res.status(400).json({ error: 'Provide 2-4 states' });
    }

    const results = {};
    for (const state of states) {
      const [profile, words, sentiment] = await Promise.all([
        query(`SELECT * FROM state_daily_profile WHERE state = ? AND date = date('now')`, [state]),
        query(`
          SELECT word, frequency, tfidf_score, distinctiveness_score, pos_tag
          FROM state_word_daily WHERE state = ? AND date = date('now')
          ORDER BY distinctiveness_score DESC LIMIT 10
        `, [state]),
        query(`
          SELECT AVG(compound_score) as compound, AVG(subjectivity) as subjectivity
          FROM state_sentiment_ts
          WHERE state = ? AND measured_at >= date('now', '-7 days')
        `, [state]),
      ]);

      results[state] = {
        profile: profile[0] || null,
        topWords: words,
        sentiment: sentiment[0] || null,
      };
    }

    res.json({ states, comparison: results });
  } catch (err) {
    console.error('Error comparing states:', err);
    res.status(500).json({ error: 'Failed to compare states' });
  }
});

router.get('/:name/profile', cacheMiddleware(3600), async (req, res) => {
  try {
    const state = req.params.name.toUpperCase();

    const [profile, topWords, entities, topics, sentiment] = await Promise.all([
      query(`SELECT * FROM state_daily_profile WHERE state = ? AND date = date('now')`, [state]),
      query(`
        SELECT word, frequency, tfidf_score, sentiment_avg, spread_score,
               novelty_score, distinctiveness_score, pos_tag
        FROM state_word_daily
        WHERE state = ? AND date = date('now')
        ORDER BY distinctiveness_score DESC
        LIMIT 20
      `, [state]),
      query(`
        SELECT entity_text, entity_type, frequency
        FROM state_entities
        WHERE state = ? AND date = date('now')
        ORDER BY frequency DESC
        LIMIT 20
      `, [state]),
      query(`
        SELECT topic_id, top_words, weight
        FROM state_topics
        WHERE state = ?
        ORDER BY week_start DESC
        LIMIT 5
      `, [state]),
      query(`
        SELECT date(measured_at) as date,
               AVG(compound_score) as compound,
               AVG(positive_ratio) as positive,
               AVG(negative_ratio) as negative,
               AVG(subjectivity) as subjectivity
        FROM state_sentiment_ts
        WHERE state = ? AND measured_at >= date('now', '-30 days')
        GROUP BY date(measured_at)
        ORDER BY date
      `, [state]),
    ]);

    // Parse topic top_words from CSV string
    const parsedTopics = topics.map(t => ({
      ...t,
      top_words: typeof t.top_words === 'string' ? t.top_words.split(',') : t.top_words,
    }));

    res.json({
      state,
      profile: profile[0] || null,
      topWords,
      entities,
      topics: parsedTopics,
      sentimentHistory: sentiment,
    });
  } catch (err) {
    console.error('Error fetching state profile:', err);
    res.status(500).json({ error: 'Failed to fetch state profile' });
  }
});

router.get('/:name/history/:days', cacheMiddleware(3600), async (req, res) => {
  try {
    const state = req.params.name.toUpperCase();
    const days = Math.min(parseInt(req.params.days) || 30, 90);

    const rows = await query(`
      SELECT date, top_word, dominant_sentiment, sentiment_avg,
             sentiment_std, post_volume
      FROM state_daily_profile
      WHERE state = ? AND date >= date('now', '-' || ? || ' days')
      ORDER BY date
    `, [state, days]);

    res.json({ state, days, history: rows });
  } catch (err) {
    console.error('Error fetching state history:', err);
    res.status(500).json({ error: 'Failed to fetch state history' });
  }
});

router.get('/:name/words', cacheMiddleware(3600), async (req, res) => {
  try {
    const state = req.params.name.toUpperCase();
    const rows = await query(`
      SELECT swd.word, swd.frequency, swd.tfidf_score, swd.sentiment_avg,
             swd.spread_score, swd.novelty_score, swd.distinctiveness_score,
             swd.pos_tag,
             wa.lens, wa.context, wa.social_signal, wa.tags,
             COALESCE(wa.classified, 0) as classified
      FROM state_word_daily swd
      LEFT JOIN word_anthropology wa ON swd.word = wa.word
      WHERE swd.state = ? AND swd.date = date('now')
      ORDER BY swd.distinctiveness_score DESC
      LIMIT 50
    `, [state]);

    res.json({ state, date: new Date().toISOString().split('T')[0], words: rows });
  } catch (err) {
    console.error('Error fetching state words:', err);
    res.status(500).json({ error: 'Failed to fetch words' });
  }
});

module.exports = router;
