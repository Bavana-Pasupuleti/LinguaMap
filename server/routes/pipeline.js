const express = require('express');
const router = express.Router();
const { query } = require('../middleware/db');
const { cacheMiddleware } = require('../middleware/cache');

router.get('/status', cacheMiddleware(300), async (req, res) => {
  try {
    const rows = await query(`
      SELECT task_name, status, rows_processed, errors, duration_seconds,
             completed_at, metadata
      FROM pipeline_runs
      WHERE run_date = date('now')
      ORDER BY completed_at DESC
    `);

    const lastFull = await query(`
      SELECT completed_at, duration_seconds, status
      FROM pipeline_runs
      WHERE task_name = 'full_pipeline'
      ORDER BY completed_at DESC
      LIMIT 1
    `);

    res.json({
      lastRun: lastFull[0] || null,
      todayTasks: rows,
      dataFreshness: lastFull[0]?.completed_at || null,
    });
  } catch (err) {
    console.error('Error fetching pipeline status:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline status' });
  }
});

router.get('/history', cacheMiddleware(3600), async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const rows = await query(`
      SELECT run_date, task_name, status, rows_processed, errors,
             duration_seconds, completed_at
      FROM pipeline_runs
      WHERE run_date >= date('now', '-' || ? || ' days')
      ORDER BY completed_at DESC
    `, [days]);
    res.json({ history: rows, days });
  } catch (err) {
    console.error('Error fetching pipeline history:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline history' });
  }
});

module.exports = router;
