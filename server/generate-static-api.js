const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'linguamap.db');
const OUT_DIR = path.join(__dirname, '..', 'client', 'dist', 'api');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data));
}

function run() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('No database found. Run setup-db.js first.');
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  console.log('Generating static API JSON files...');

  // /api/map/today
  const mapToday = db.prepare(`
    SELECT sdp.state, sdp.top_word, sdp.dominant_sentiment, sdp.sentiment_avg,
           sdp.post_volume, sdp.category,
           wa.lens, wa.context, wa.social_signal, wa.spread_pattern, wa.tags,
           COALESCE(wa.classified, 0) as classified
    FROM state_daily_profile sdp
    LEFT JOIN word_anthropology wa ON sdp.top_word = wa.word
    WHERE sdp.date = date('now')
    ORDER BY sdp.state
  `).all();
  writeJson(path.join(OUT_DIR, 'map', 'today.json'), {
    date: new Date().toISOString().split('T')[0],
    states: mapToday
  });

  // /api/trending/leaderboard
  const leaderboard = db.prepare(`
    SELECT word, SUM(frequency) as total_frequency,
           AVG(distinctiveness_score) as avg_distinctiveness,
           COUNT(DISTINCT state) as state_count,
           AVG(sentiment_avg) as avg_sentiment
    FROM state_word_daily
    WHERE date = date('now')
    GROUP BY word
    ORDER BY avg_distinctiveness DESC
    LIMIT 20
  `).all();
  writeJson(path.join(OUT_DIR, 'trending', 'leaderboard.json'), { leaderboard });

  // /api/trending/national
  const national = db.prepare(`
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
  `).all();
  writeJson(path.join(OUT_DIR, 'trending', 'national.json'), { trending: national });

  // /api/trending/new
  const newWords = db.prepare(`
    SELECT word, state, frequency, distinctiveness_score, novelty_score
    FROM state_word_daily
    WHERE date >= date('now', '-7 days')
      AND novelty_score > 0.1
    ORDER BY novelty_score DESC, distinctiveness_score DESC
    LIMIT 20
  `).all();
  writeJson(path.join(OUT_DIR, 'trending', 'new.json'), { newWords });

  // /api/trending/word-changes
  const wordChanges = db.prepare(`
    SELECT today.state, today.top_word as current_word,
           yesterday.top_word as previous_word, today.date
    FROM state_daily_profile today
    JOIN state_daily_profile yesterday
      ON today.state = yesterday.state
      AND yesterday.date = date(today.date, '-1 day')
    WHERE today.date = date('now')
      AND today.top_word != yesterday.top_word
    ORDER BY today.state
  `).all();
  writeJson(path.join(OUT_DIR, 'trending', 'word-changes.json'), { changes: wordChanges });

  // /api/analysis/clusters/today
  const clusters = db.prepare(`
    SELECT rc.state, rc.cluster_id, rc.cluster_label, rc.similarity_score,
           sdp.top_word, sdp.dominant_sentiment
    FROM regional_clusters rc
    LEFT JOIN state_daily_profile sdp ON rc.state = sdp.state AND sdp.date = date('now')
    WHERE rc.date = (SELECT MAX(date) FROM regional_clusters)
    ORDER BY rc.cluster_id, rc.state
  `).all();
  writeJson(path.join(OUT_DIR, 'analysis', 'clusters', 'today.json'), { clusters });

  // /api/analysis/anomalies/recent
  const anomalies = db.prepare(`
    SELECT state, date, anomaly_type, metric, value, baseline, z_score, description
    FROM anomaly_log
    WHERE date >= date('now', '-7 days')
    ORDER BY date DESC, ABS(z_score) DESC
    LIMIT 50
  `).all();
  writeJson(path.join(OUT_DIR, 'analysis', 'anomalies', 'recent.json'), { anomalies });

  // /api/analysis/drift/leaderboard
  const drift = db.prepare(`
    SELECT state, COUNT(DISTINCT word) as unique_top_words
    FROM state_word_daily
    WHERE date >= date('now', '-28 days')
      AND distinctiveness_score > 0.02
    GROUP BY state
    ORDER BY unique_top_words DESC
  `).all();
  writeJson(path.join(OUT_DIR, 'analysis', 'drift', 'leaderboard.json'), { driftLeaderboard: drift });

  // /api/analysis/pos/distribution
  const posRows = db.prepare(`
    SELECT state, pos_tag, SUM(frequency) as total
    FROM state_word_daily
    WHERE date >= date('now', '-7 days')
      AND pos_tag IS NOT NULL
    GROUP BY state, pos_tag
    ORDER BY state, total DESC
  `).all();
  const posByState = {};
  for (const row of posRows) {
    if (!posByState[row.state]) posByState[row.state] = {};
    posByState[row.state][row.pos_tag] = parseInt(row.total);
  }
  writeJson(path.join(OUT_DIR, 'analysis', 'pos', 'distribution.json'), { posDistribution: posByState });

  // /api/pipeline/status
  const lastFull = db.prepare(`
    SELECT completed_at, duration_seconds, status
    FROM pipeline_runs WHERE task_name = 'full_pipeline'
    ORDER BY completed_at DESC LIMIT 1
  `).all();
  const todayTasks = db.prepare(`
    SELECT task_name, status, rows_processed, errors, duration_seconds, completed_at, metadata
    FROM pipeline_runs WHERE run_date = date('now')
    ORDER BY completed_at DESC
  `).all();
  writeJson(path.join(OUT_DIR, 'pipeline', 'status.json'), {
    lastRun: lastFull[0] || null,
    todayTasks,
    dataFreshness: lastFull[0]?.completed_at || null
  });

  // /api/health
  writeJson(path.join(OUT_DIR, 'health.json'), { status: 'ok', timestamp: new Date().toISOString() });

  // Per-state profiles for the 10 states with word data
  const statesWithWords = ['TX', 'CA', 'NY', 'FL', 'IL', 'LA', 'MA', 'WA', 'PA', 'GA'];
  ensureDir(path.join(OUT_DIR, 'state'));

  for (const state of statesWithWords) {
    const profile = db.prepare(`SELECT * FROM state_daily_profile WHERE state = ? AND date = date('now')`).all(state);
    const topWords = db.prepare(`
      SELECT word, frequency, tfidf_score, sentiment_avg, spread_score,
             novelty_score, distinctiveness_score, pos_tag
      FROM state_word_daily WHERE state = ? AND date = date('now')
      ORDER BY distinctiveness_score DESC LIMIT 20
    `).all(state);
    const entities = db.prepare(`
      SELECT entity_text, entity_type, frequency
      FROM state_entities WHERE state = ? AND date = date('now')
      ORDER BY frequency DESC LIMIT 20
    `).all(state);
    const topics = db.prepare(`
      SELECT topic_id, top_words, weight FROM state_topics
      WHERE state = ? ORDER BY week_start DESC LIMIT 5
    `).all(state);
    const sentiment = db.prepare(`
      SELECT date(measured_at) as date,
             AVG(compound_score) as compound,
             AVG(positive_ratio) as positive,
             AVG(negative_ratio) as negative,
             AVG(subjectivity) as subjectivity
      FROM state_sentiment_ts
      WHERE state = ? AND measured_at >= date('now', '-30 days')
      GROUP BY date(measured_at) ORDER BY date
    `).all(state);
    const history = db.prepare(`
      SELECT date, top_word, dominant_sentiment, sentiment_avg, sentiment_std, post_volume
      FROM state_daily_profile WHERE state = ? AND date >= date('now', '-30 days')
      ORDER BY date
    `).all(state);
    const words = db.prepare(`
      SELECT swd.word, swd.frequency, swd.tfidf_score, swd.sentiment_avg,
             swd.spread_score, swd.novelty_score, swd.distinctiveness_score, swd.pos_tag,
             wa.lens, wa.context, wa.social_signal, wa.tags,
             COALESCE(wa.classified, 0) as classified
      FROM state_word_daily swd
      LEFT JOIN word_anthropology wa ON swd.word = wa.word
      WHERE swd.state = ? AND swd.date = date('now')
      ORDER BY swd.distinctiveness_score DESC LIMIT 50
    `).all(state);

    const parsedTopics = topics.map(t => ({
      ...t,
      top_words: typeof t.top_words === 'string' ? t.top_words.split(',') : t.top_words,
    }));

    writeJson(path.join(OUT_DIR, 'state', `${state.toLowerCase()}-profile.json`), {
      state, profile: profile[0] || null, topWords, entities,
      topics: parsedTopics, sentimentHistory: sentiment
    });
    writeJson(path.join(OUT_DIR, 'state', `${state.toLowerCase()}-history.json`), {
      state, days: 30, history
    });
    writeJson(path.join(OUT_DIR, 'state', `${state.toLowerCase()}-words.json`), {
      state, date: new Date().toISOString().split('T')[0], words
    });
  }

  // Generate profiles for all 50 states (basic)
  const allStates = db.prepare(`SELECT DISTINCT state FROM state_daily_profile`).all();
  for (const { state } of allStates) {
    if (statesWithWords.includes(state)) continue;
    const profile = db.prepare(`SELECT * FROM state_daily_profile WHERE state = ? AND date = date('now')`).all(state);
    const sentiment = db.prepare(`
      SELECT date(measured_at) as date, AVG(compound_score) as compound,
             AVG(positive_ratio) as positive, AVG(negative_ratio) as negative,
             AVG(subjectivity) as subjectivity
      FROM state_sentiment_ts WHERE state = ? AND measured_at >= date('now', '-30 days')
      GROUP BY date(measured_at) ORDER BY date
    `).all(state);
    const history = db.prepare(`
      SELECT date, top_word, dominant_sentiment, sentiment_avg, sentiment_std, post_volume
      FROM state_daily_profile WHERE state = ? AND date >= date('now', '-30 days')
      ORDER BY date
    `).all(state);

    writeJson(path.join(OUT_DIR, 'state', `${state.toLowerCase()}-profile.json`), {
      state, profile: profile[0] || null, topWords: [], entities: [],
      topics: [], sentimentHistory: sentiment
    });
    writeJson(path.join(OUT_DIR, 'state', `${state.toLowerCase()}-history.json`), {
      state, days: 30, history
    });
    writeJson(path.join(OUT_DIR, 'state', `${state.toLowerCase()}-words.json`), {
      state, date: new Date().toISOString().split('T')[0], words: []
    });
  }

  // State comparison (pre-generate for popular pairs)
  const compareStates = ['CA', 'TX'];
  const compResults = {};
  for (const st of compareStates) {
    const p = db.prepare(`SELECT * FROM state_daily_profile WHERE state = ? AND date = date('now')`).all(st);
    const w = db.prepare(`
      SELECT word, frequency, tfidf_score, distinctiveness_score, pos_tag
      FROM state_word_daily WHERE state = ? AND date = date('now')
      ORDER BY distinctiveness_score DESC LIMIT 10
    `).all(st);
    const s = db.prepare(`
      SELECT AVG(compound_score) as compound, AVG(subjectivity) as subjectivity
      FROM state_sentiment_ts WHERE state = ? AND measured_at >= date('now', '-7 days')
    `).all(st);
    compResults[st] = { profile: p[0] || null, topWords: w, sentiment: s[0] || null };
  }
  writeJson(path.join(OUT_DIR, 'state', 'compare-default.json'), {
    states: compareStates, comparison: compResults
  });

  // Contagion data for notable words
  const spreadWords = db.prepare(`SELECT word FROM word_spread_log ORDER BY spread_velocity DESC LIMIT 10`).all();
  for (const { word } of spreadWords) {
    const spread = db.prepare(`
      SELECT word, first_seen_state, first_seen_date, states_reached, spread_velocity
      FROM word_spread_log WHERE word = ?
    `).all(word);
    const history = db.prepare(`
      SELECT state, date, frequency, distinctiveness_score
      FROM state_word_daily WHERE word = ? AND date >= date('now', '-30 days')
      ORDER BY date, state
    `).all(word);
    const spreadData = spread[0] ? {
      ...spread[0],
      states_reached: typeof spread[0].states_reached === 'string'
        ? spread[0].states_reached.split(',') : spread[0].states_reached,
    } : null;
    writeJson(path.join(OUT_DIR, 'trending', 'contagion', `${word}.json`), {
      word, spread: spreadData, history
    });
  }

  db.close();

  const fileCount = countFiles(OUT_DIR);
  console.log(`Generated ${fileCount} static API files in ${OUT_DIR}`);
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}

run();
