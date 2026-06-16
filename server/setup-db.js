// Creates SQLite schema and seeds it with rich sample data
const { getSqlite } = require('./middleware/db');

function setup() {
  const db = getSqlite();

  console.log('Creating SQLite schema...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS state_daily_profile (
      state TEXT NOT NULL,
      date TEXT NOT NULL,
      top_word TEXT,
      top_bigram TEXT,
      dominant_sentiment TEXT,
      sentiment_avg REAL,
      sentiment_std REAL,
      dominant_topic INTEGER,
      post_volume INTEGER DEFAULT 0,
      unique_authors INTEGER DEFAULT 0,
      emoji_top5 TEXT DEFAULT '[]',
      category TEXT DEFAULT 'unclassified',
      PRIMARY KEY (state, date)
    );

    CREATE TABLE IF NOT EXISTS state_word_daily (
      state TEXT NOT NULL,
      date TEXT NOT NULL,
      word TEXT NOT NULL,
      pos_tag TEXT,
      frequency INTEGER DEFAULT 0,
      tfidf_score REAL DEFAULT 0,
      sentiment_avg REAL DEFAULT 0,
      spread_score REAL DEFAULT 0,
      novelty_score REAL DEFAULT 0,
      distinctiveness_score REAL DEFAULT 0,
      source TEXT,
      PRIMARY KEY (date, state, word)
    );

    CREATE TABLE IF NOT EXISTS state_sentiment_ts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state TEXT NOT NULL,
      measured_at TEXT NOT NULL,
      compound_score REAL,
      positive_ratio REAL,
      negative_ratio REAL,
      neutral_ratio REAL,
      subjectivity REAL,
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS state_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state TEXT NOT NULL,
      week_start TEXT NOT NULL,
      topic_id INTEGER NOT NULL,
      top_words TEXT NOT NULL,
      weight REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS state_entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state TEXT NOT NULL,
      date TEXT NOT NULL,
      entity_text TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS word_spread_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      first_seen_state TEXT,
      first_seen_date TEXT,
      states_reached TEXT DEFAULT '[]',
      spread_velocity REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS anomaly_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state TEXT NOT NULL,
      date TEXT NOT NULL,
      anomaly_type TEXT NOT NULL,
      metric TEXT,
      value REAL,
      baseline REAL,
      z_score REAL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS regional_clusters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state TEXT NOT NULL,
      date TEXT NOT NULL,
      cluster_id INTEGER NOT NULL,
      cluster_label TEXT,
      similarity_score REAL
    );

    CREATE TABLE IF NOT EXISTS word_anthropology (
      word TEXT PRIMARY KEY,
      lens TEXT,
      context TEXT,
      social_signal TEXT,
      spread_pattern TEXT,
      tags TEXT DEFAULT '[]',
      classified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_date TEXT NOT NULL,
      task_name TEXT NOT NULL,
      status TEXT NOT NULL,
      rows_processed INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      duration_seconds REAL,
      metadata TEXT DEFAULT '{}',
      started_at TEXT,
      completed_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('Seeding data...');

  const today = new Date().toISOString().split('T')[0];

  // Helper to generate past dates
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const states = [
    ['AL', 'football', 'positive', 0.15, 0.32, 145, 'cultural'],
    ['AK', 'wilderness', 'positive', 0.22, 0.28, 42, 'identity'],
    ['AZ', 'drought', 'negative', -0.12, 0.41, 198, 'civic'],
    ['AR', 'barbecue', 'positive', 0.18, 0.25, 67, 'food ritual'],
    ['CA', 'housing', 'negative', -0.08, 0.45, 892, 'civic'],
    ['CO', 'trails', 'positive', 0.31, 0.22, 234, 'cultural'],
    ['CT', 'commute', 'negative', -0.14, 0.35, 89, 'social behavior'],
    ['DE', 'beach', 'positive', 0.25, 0.19, 34, 'cultural'],
    ['FL', 'hurricane', 'negative', -0.22, 0.48, 567, 'civic'],
    ['GA', 'peach', 'positive', 0.19, 0.27, 312, 'identity'],
    ['HI', 'aloha', 'positive', 0.42, 0.18, 78, 'heritage'],
    ['ID', 'potato', 'positive', 0.11, 0.23, 45, 'identity'],
    ['IL', 'pizza', 'positive', 0.16, 0.31, 445, 'food ritual'],
    ['IN', 'racing', 'positive', 0.21, 0.29, 156, 'cultural'],
    ['IA', 'corn', 'neutral', 0.03, 0.21, 62, 'identity'],
    ['KS', 'tornado', 'negative', -0.18, 0.43, 88, 'civic'],
    ['KY', 'bourbon', 'positive', 0.28, 0.24, 134, 'heritage'],
    ['LA', 'crawfish', 'positive', 0.35, 0.22, 267, 'food ritual'],
    ['ME', 'lobster', 'positive', 0.24, 0.20, 56, 'food ritual'],
    ['MD', 'crab', 'positive', 0.19, 0.26, 178, 'food ritual'],
    ['MA', 'wicked', 'positive', 0.12, 0.33, 389, 'dialect'],
    ['MI', 'lakes', 'positive', 0.20, 0.25, 234, 'identity'],
    ['MN', 'hotdish', 'positive', 0.17, 0.21, 167, 'food ritual'],
    ['MS', 'blues', 'positive', 0.14, 0.30, 54, 'heritage'],
    ['MO', 'gateway', 'neutral', 0.04, 0.28, 189, 'identity'],
    ['MT', 'ranch', 'positive', 0.23, 0.19, 38, 'heritage'],
    ['NE', 'husker', 'positive', 0.26, 0.27, 72, 'identity'],
    ['NV', 'desert', 'neutral', 0.01, 0.38, 145, 'identity'],
    ['NH', 'maple', 'positive', 0.21, 0.18, 41, 'heritage'],
    ['NJ', 'diner', 'positive', 0.09, 0.34, 234, 'cultural'],
    ['NM', 'chile', 'positive', 0.27, 0.23, 67, 'food ritual'],
    ['NY', 'bodega', 'positive', 0.08, 0.42, 756, 'cultural'],
    ['NC', 'barbecue', 'positive', 0.22, 0.26, 245, 'food ritual'],
    ['ND', 'prairie', 'positive', 0.15, 0.17, 28, 'identity'],
    ['OH', 'buckeye', 'positive', 0.18, 0.29, 278, 'identity'],
    ['OK', 'rodeo', 'positive', 0.20, 0.25, 98, 'heritage'],
    ['OR', 'hiking', 'positive', 0.33, 0.21, 189, 'cultural'],
    ['PA', 'jawn', 'positive', 0.10, 0.32, 345, 'dialect'],
    ['RI', 'clambake', 'positive', 0.26, 0.20, 32, 'food ritual'],
    ['SC', 'grits', 'positive', 0.21, 0.24, 112, 'food ritual'],
    ['SD', 'rushmore', 'positive', 0.19, 0.18, 24, 'heritage'],
    ['TN', 'country', 'positive', 0.24, 0.28, 278, 'cultural'],
    ['TX', 'howdy', 'positive', 0.16, 0.35, 623, 'identity'],
    ['UT', 'canyon', 'positive', 0.29, 0.20, 112, 'identity'],
    ['VT', 'syrup', 'positive', 0.23, 0.17, 36, 'heritage'],
    ['VA', 'history', 'positive', 0.13, 0.27, 198, 'heritage'],
    ['WA', 'coffee', 'positive', 0.14, 0.30, 312, 'cultural'],
    ['WV', 'mountain', 'positive', 0.18, 0.23, 56, 'identity'],
    ['WI', 'cheese', 'positive', 0.25, 0.22, 178, 'food ritual'],
    ['WY', 'frontier', 'positive', 0.20, 0.16, 22, 'heritage'],
  ];

  const insertProfile = db.prepare(`
    INSERT OR REPLACE INTO state_daily_profile (state, date, top_word, dominant_sentiment, sentiment_avg, sentiment_std, post_volume, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seed 30 days of profiles with slight variations
  for (let day = 0; day < 30; day++) {
    const date = daysAgo(day);
    for (const [st, word, sent, sentAvg, sentStd, vol, cat] of states) {
      const jitter = (Math.random() - 0.5) * 0.1;
      const volJitter = Math.round(vol * (0.8 + Math.random() * 0.4));
      insertProfile.run(st, date, word, sent, sentAvg + jitter, sentStd, volJitter, cat);
    }
  }

  // Word scores for all states (today + history)
  const wordSets = {
    TX: [['howdy', 'NOUN', 342, 0.085], ['barbecue', 'NOUN', 289, 0.071], ['rodeo', 'NOUN', 198, 0.062], ['ranch', 'NOUN', 167, 0.048], ['frontier', 'NOUN', 134, 0.041], ['cattle', 'NOUN', 112, 0.035], ['oil', 'NOUN', 98, 0.031], ['boots', 'NOUN', 87, 0.028], ['yeehaw', 'NOUN', 76, 0.025], ['salsa', 'NOUN', 65, 0.022]],
    CA: [['housing', 'NOUN', 567, 0.092], ['wildfire', 'NOUN', 445, 0.078], ['hella', 'ADV', 312, 0.069], ['traffic', 'NOUN', 289, 0.054], ['tech', 'NOUN', 256, 0.047], ['avocado', 'NOUN', 198, 0.039], ['surf', 'NOUN', 167, 0.034], ['drought', 'NOUN', 145, 0.031], ['startup', 'NOUN', 123, 0.027], ['vegan', 'ADJ', 98, 0.023]],
    NY: [['bodega', 'NOUN', 423, 0.088], ['subway', 'NOUN', 389, 0.072], ['rent', 'NOUN', 345, 0.065], ['broadway', 'PROPN', 234, 0.051], ['pizza', 'NOUN', 198, 0.044], ['borough', 'NOUN', 167, 0.038], ['hustle', 'NOUN', 145, 0.033], ['brunch', 'NOUN', 123, 0.029], ['stoop', 'NOUN', 98, 0.025], ['bagel', 'NOUN', 87, 0.021]],
    FL: [['hurricane', 'NOUN', 456, 0.091], ['beach', 'NOUN', 389, 0.075], ['gator', 'NOUN', 267, 0.058], ['swamp', 'NOUN', 198, 0.045], ['theme', 'NOUN', 156, 0.038], ['retirement', 'NOUN', 134, 0.032], ['sunshine', 'NOUN', 112, 0.028], ['keys', 'NOUN', 98, 0.024], ['palm', 'NOUN', 87, 0.021], ['everglades', 'PROPN', 76, 0.018]],
    IL: [['pizza', 'NOUN', 398, 0.082], ['wind', 'NOUN', 312, 0.065], ['cubs', 'PROPN', 256, 0.054], ['lake', 'NOUN', 198, 0.043], ['blues', 'NOUN', 167, 0.037], ['skyscraper', 'NOUN', 134, 0.031], ['transit', 'NOUN', 112, 0.027], ['sausage', 'NOUN', 98, 0.023], ['winter', 'NOUN', 87, 0.019], ['hotdog', 'NOUN', 76, 0.016]],
    LA: [['crawfish', 'NOUN', 456, 0.095], ['gumbo', 'NOUN', 378, 0.081], ['jazz', 'NOUN', 298, 0.067], ['bayou', 'NOUN', 234, 0.055], ['mardi', 'PROPN', 198, 0.046], ['voodoo', 'NOUN', 156, 0.038], ['cajun', 'ADJ', 134, 0.032], ['bourbon', 'NOUN', 112, 0.027], ['creole', 'ADJ', 98, 0.023], ['beignet', 'NOUN', 87, 0.019]],
    MA: [['wicked', 'ADV', 367, 0.088], ['harbor', 'NOUN', 289, 0.068], ['lobster', 'NOUN', 234, 0.055], ['college', 'NOUN', 198, 0.044], ['chowder', 'NOUN', 167, 0.038], ['patriots', 'PROPN', 145, 0.033], ['freedom', 'NOUN', 123, 0.028], ['cape', 'NOUN', 98, 0.023], ['boston', 'PROPN', 87, 0.019], ['accent', 'NOUN', 76, 0.016]],
    WA: [['coffee', 'NOUN', 389, 0.084], ['rain', 'NOUN', 312, 0.069], ['hiking', 'NOUN', 267, 0.057], ['tech', 'NOUN', 234, 0.048], ['salmon', 'NOUN', 189, 0.040], ['mountain', 'NOUN', 156, 0.034], ['ferry', 'NOUN', 123, 0.028], ['craft', 'NOUN', 98, 0.023], ['evergreen', 'ADJ', 87, 0.019], ['cascades', 'PROPN', 76, 0.016]],
    PA: [['jawn', 'NOUN', 412, 0.091], ['cheesesteak', 'NOUN', 334, 0.074], ['liberty', 'NOUN', 256, 0.058], ['amish', 'ADJ', 198, 0.045], ['steel', 'NOUN', 167, 0.038], ['scrapple', 'NOUN', 134, 0.031], ['hoagie', 'NOUN', 112, 0.026], ['philly', 'PROPN', 98, 0.022], ['birch', 'NOUN', 87, 0.018], ['pretzel', 'NOUN', 76, 0.015]],
    GA: [['peach', 'NOUN', 378, 0.086], ['southern', 'ADJ', 298, 0.071], ['hospitality', 'NOUN', 234, 0.056], ['braves', 'PROPN', 198, 0.045], ['peanut', 'NOUN', 167, 0.038], ['sweet', 'ADJ', 145, 0.032], ['pecan', 'NOUN', 123, 0.027], ['savannah', 'PROPN', 98, 0.022], ['cotton', 'NOUN', 87, 0.018], ['plantation', 'NOUN', 76, 0.015]],
  };

  const insertWord = db.prepare(`
    INSERT OR REPLACE INTO state_word_daily (state, date, word, pos_tag, frequency, tfidf_score, sentiment_avg, spread_score, novelty_score, distinctiveness_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Insert word scores for states with detailed data
  for (const [stateCode, words] of Object.entries(wordSets)) {
    for (let day = 0; day < 30; day++) {
      const date = daysAgo(day);
      for (const [word, pos, freq, tfidf] of words) {
        const jitter = Math.random() * 0.2 - 0.1;
        const freqJitter = Math.round(freq * (0.7 + Math.random() * 0.6));
        const sentAvg = (Math.random() - 0.3) * 0.4;
        const spread = Math.random() * 0.8;
        const novelty = day < 7 ? Math.random() * 0.3 : 0;
        const dist = tfidf * 0.4 + spread * 0.2 + novelty * 0.25;
        insertWord.run(stateCode, date, word, pos, freqJitter, tfidf + jitter * 0.01, sentAvg, spread, novelty, dist);
      }
    }
  }

  // Generate basic word scores for all other states
  for (const [st, word, , sentAvg, , vol] of states) {
    if (wordSets[st]) continue;
    for (let day = 0; day < 30; day++) {
      const date = daysAgo(day);
      const freqJitter = Math.round(vol * (0.7 + Math.random() * 0.6));
      insertWord.run(st, date, word, 'NOUN', freqJitter, 0.05 + Math.random() * 0.04, sentAvg, Math.random() * 0.5, day < 3 ? 0.2 : 0, 0.04 + Math.random() * 0.03);
    }
  }

  // Sentiment time series — 30 days, multiple points per day
  const insertSentiment = db.prepare(`
    INSERT INTO state_sentiment_ts (state, measured_at, compound_score, positive_ratio, negative_ratio, neutral_ratio, subjectivity, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [st, , , sentAvg] of states) {
    for (let day = 0; day < 30; day++) {
      const date = daysAgo(day);
      for (let hour = 0; hour < 4; hour++) {
        const ts = `${date}T${String(hour * 6).padStart(2, '0')}:00:00Z`;
        const compound = sentAvg + (Math.random() - 0.5) * 0.3;
        const pos = Math.max(0, 0.3 + compound * 0.3 + Math.random() * 0.1);
        const neg = Math.max(0, 0.2 - compound * 0.2 + Math.random() * 0.1);
        const neu = Math.max(0, 1 - pos - neg);
        const subj = 0.3 + Math.random() * 0.4;
        const source = ['reddit', 'mastodon', 'news'][hour % 3];
        insertSentiment.run(st, ts, compound, pos, neg, neu, subj, source);
      }
    }
  }

  // Entities
  const insertEntity = db.prepare(`
    INSERT OR REPLACE INTO state_entities (state, date, entity_text, entity_type, frequency, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const entitySets = {
    TX: [['Austin', 'GPE', 89], ['Dallas Cowboys', 'ORG', 67], ['Ted Cruz', 'PERSON', 45], ['SXSW', 'EVENT', 34], ['NASA', 'ORG', 28]],
    CA: [['Los Angeles', 'GPE', 134], ['Google', 'ORG', 98], ['Hollywood', 'GPE', 76], ['Silicon Valley', 'GPE', 67], ['Newsom', 'PERSON', 45]],
    NY: [['Manhattan', 'GPE', 156], ['Yankees', 'ORG', 89], ['Brooklyn', 'GPE', 78], ['Wall Street', 'FAC', 67], ['Adams', 'PERSON', 45]],
    FL: [['Miami', 'GPE', 123], ['Disney World', 'FAC', 98], ['DeSantis', 'PERSON', 76], ['Everglades', 'GPE', 56], ['Tampa Bay', 'GPE', 45]],
    IL: [['Chicago', 'GPE', 167], ['Bears', 'ORG', 78], ['Lake Michigan', 'LOC', 56], ['Wrigley Field', 'FAC', 45], ['O\'Hare', 'FAC', 34]],
  };

  for (const [st, entities] of Object.entries(entitySets)) {
    for (const [text, type, freq] of entities) {
      insertEntity.run(st, today, text, type, freq, 'reddit');
    }
  }

  // Topics
  const insertTopic = db.prepare(`
    INSERT OR REPLACE INTO state_topics (state, week_start, topic_id, top_words, weight)
    VALUES (?, ?, ?, ?, ?)
  `);

  const weekStart = daysAgo(7);
  const topicSets = {
    TX: [['barbecue,ranch,cattle,rodeo,western', 4.2], ['oil,energy,drilling,pipeline,gas', 3.8], ['football,cowboys,longhorns,stadium,tailgate', 3.5], ['border,immigration,policy,federal,wall', 3.1], ['austin,tech,startup,music,festival', 2.9]],
    CA: [['housing,rent,cost,apartment,mortgage', 4.5], ['wildfire,drought,climate,water,smoke', 4.1], ['tech,startup,silicon,venture,ai', 3.7], ['beach,surf,ocean,coast,sunset', 3.2], ['traffic,commute,freeway,transit,congestion', 2.8]],
    NY: [['subway,mta,transit,delay,commute', 4.3], ['rent,housing,apartment,lease,landlord', 4.0], ['broadway,theater,show,performance,ticket', 3.5], ['food,restaurant,deli,bodega,brunch', 3.2], ['park,central,brooklyn,queens,bronx', 2.9]],
  };

  for (const [st, topics] of Object.entries(topicSets)) {
    topics.forEach(([words, weight], i) => {
      insertTopic.run(st, weekStart, i, words, weight);
    });
  }

  // Word spread log
  const insertSpread = db.prepare(`
    INSERT OR REPLACE INTO word_spread_log (word, first_seen_state, first_seen_date, states_reached, spread_velocity)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertSpread.run('barbecue', 'TX', daysAgo(60), 'TX,NC,SC,TN,AL,GA,MO,KS,OK,AR,KY,VA', 0.2);
  insertSpread.run('housing', 'CA', daysAgo(45), 'CA,NY,WA,CO,MA,OR,TX,FL,IL,VA,MD,NJ,CT,DC,HI,AZ,NV,UT', 0.4);
  insertSpread.run('wicked', 'MA', daysAgo(90), 'MA,CT,RI,NH,VT', 0.06);
  insertSpread.run('jawn', 'PA', daysAgo(80), 'PA,NJ', 0.03);
  insertSpread.run('hella', 'CA', daysAgo(70), 'CA,OR,WA,NV', 0.06);
  insertSpread.run('crawfish', 'LA', daysAgo(55), 'LA,TX,MS,AL', 0.07);
  insertSpread.run('aloha', 'HI', daysAgo(90), 'HI,CA', 0.02);
  insertSpread.run('hotdish', 'MN', daysAgo(40), 'MN,ND,SD,WI', 0.1);
  insertSpread.run('ope', 'MN', daysAgo(30), 'MN,WI,MI,OH,IN,IA,IL', 0.23);
  insertSpread.run('bodega', 'NY', daysAgo(50), 'NY,NJ,CT', 0.06);

  // Anomalies
  const insertAnomaly = db.prepare(`
    INSERT INTO anomaly_log (state, date, anomaly_type, metric, value, baseline, z_score, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAnomaly.run('FL', daysAgo(1), 'sentiment_spike', 'compound_sentiment', -0.45, -0.12, -2.75, 'Sentiment drop: -0.450 vs 30-day avg -0.120 (z=-2.75) — hurricane coverage surge');
  insertAnomaly.run('CA', daysAgo(2), 'sentiment_spike', 'compound_sentiment', -0.38, -0.05, -2.31, 'Sentiment drop: -0.380 vs 30-day avg -0.050 (z=-2.31) — wildfire season discussion');
  insertAnomaly.run('TX', daysAgo(3), 'sentiment_spike', 'compound_sentiment', 0.42, 0.16, 2.17, 'Sentiment surge: 0.420 vs 30-day avg 0.160 (z=2.17) — football season opener');
  insertAnomaly.run('NY', today, 'sentiment_spike', 'compound_sentiment', -0.31, 0.08, -2.44, 'Sentiment drop: -0.310 vs 30-day avg 0.080 (z=-2.44) — transit disruption');
  insertAnomaly.run('WA', daysAgo(1), 'sentiment_spike', 'compound_sentiment', 0.38, 0.14, 2.0, 'Sentiment surge: 0.380 vs 30-day avg 0.140 (z=2.00) — tech hiring boom');

  // Regional clusters
  const insertCluster = db.prepare(`
    INSERT OR REPLACE INTO regional_clusters (state, date, cluster_id, cluster_label, similarity_score)
    VALUES (?, ?, ?, ?, ?)
  `);

  const clusterMap = {
    'Linguistic Northeast': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
    'Linguistic Midwest': ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'MN', 'MO', 'NE', 'ND', 'SD', 'KS'],
    'Linguistic South': ['AL', 'AR', 'GA', 'KY', 'LA', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
    'Linguistic Southwest': ['AZ', 'NM', 'OK', 'TX'],
    'Linguistic West': ['CA', 'CO', 'HI', 'NV', 'OR', 'UT', 'WA', 'ID', 'MT', 'WY'],
    'Linguistic Mid-Atlantic': ['DE', 'FL', 'MD', 'AK'],
  };

  let clusterId = 0;
  for (const [label, clusterStates] of Object.entries(clusterMap)) {
    for (const st of clusterStates) {
      insertCluster.run(st, today, clusterId, label, 0.6 + Math.random() * 0.3);
    }
    clusterId++;
  }

  // Word anthropology
  const insertAnthro = db.prepare(`
    INSERT OR REPLACE INTO word_anthropology (word, lens, context, social_signal, spread_pattern, tags, classified)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const anthro = [
    ['howdy', 'greeting ritual', 'Informal greeting associated with Texas and the broader Southwest', 'Friendliness norm, regional pride, cowboy culture legacy', 'stable in Texas, used ironically elsewhere', 'identity,heritage,social behavior', 1],
    ['barbecue', 'culinary identity warfare', 'Contested cooking tradition with fierce regional style allegiances', 'Regional pride, identity competition, tradition preservation', 'nationwide but style wars in TX, KC, NC, SC, TN', 'food ritual,identity,heritage,cultural', 1],
    ['bodega', 'urban infrastructure', 'Small neighborhood convenience store, especially in NYC', 'Urban identity, neighborhood rootedness, immigrant culture', 'NYC-centric, spreading as cultural reference', 'cultural,identity,migration', 1],
    ['wicked', 'regional intensifier', 'New England adverb meaning very or extremely', 'Boston/New England identity, casual register', 'stable regional, occasional national media exposure', 'identity,dialect,cultural', 1],
    ['jawn', 'urban dialect', 'Philadelphia-specific catch-all noun replacing any object or concept', 'Strong local identity marker, in-group recognition', 'hyperlocal with viral spread via hip-hop and social media', 'identity,dialect,digital native', 1],
    ['crawfish', 'culinary identity', 'Freshwater crustacean central to Louisiana cuisine and gatherings', 'Louisiana identity, seasonal ritual, community gathering', 'Gulf South origin, spreading with Southern food culture', 'food ritual,cultural,heritage', 1],
    ['aloha', 'cultural greeting', 'Hawaiian word for love, hello, and goodbye', 'Hawaiian identity, indigenous culture, tourism interface', 'global recognition but authentic use in Hawaii', 'identity,heritage,cultural', 1],
    ['hotdish', 'culinary dialect', 'Minnesota term for casserole, often with tater tots', 'Regional comfort, home cooking identity, Scandinavian heritage', 'hyperlocal Minnesota/Dakotas, viral as meme', 'food ritual,dialect,heritage', 1],
    ['housing', 'economic anxiety', 'Cost of living discourse dominant in coastal metros', 'Class tension, generational divide, policy discourse', 'coastal origin, spreading to mid-tier cities', 'civic,social behavior', 1],
    ['hurricane', 'environmental threat', 'Seasonal weather events shaping Gulf and Atlantic coast discourse', 'Community resilience, emergency preparedness, climate anxiety', 'seasonal, Gulf/Atlantic coast concentrated', 'civic,cultural', 1],
    ['pizza', 'culinary identity warfare', 'Contested food tradition with fierce regional allegiances (NY thin vs Chicago deep)', 'Regional pride, food identity, friendly rivalry', 'nationwide but style wars in NY, CT, IL', 'food ritual,identity,cultural', 1],
    ['coffee', 'daily ritual', 'Pacific Northwest specialty coffee culture as identity marker', 'Craft culture, morning ritual, third-wave identity', 'PNW origin, spread nationally', 'cultural,food ritual', 1],
    ['bourbon', 'artisanal heritage', 'Kentucky-origin whiskey with strict production requirements', 'Kentucky pride, craft culture, tradition meets modern branding', 'Kentucky base, national craft cocktail spread', 'food ritual,heritage,cultural', 1],
    ['football', 'social ritual', 'Team sport central to Southern and Midwestern identity', 'Community bonding, regional pride, Friday night tradition', 'nationwide but intensity peaks in SEC/Big 10 regions', 'cultural,social behavior,identity', 1],
    ['drought', 'environmental anxiety', 'Extended water shortage affecting Western states', 'Climate awareness, resource anxiety, policy discourse', 'Western states, seasonal peaks', 'civic,cultural', 1],
  ];

  for (const [word, lens, context, signal, pattern, tags, classified] of anthro) {
    insertAnthro.run(word, lens, context, signal, pattern, tags, classified);
  }

  // Pipeline runs
  const insertRun = db.prepare(`
    INSERT INTO pipeline_runs (run_date, task_name, status, rows_processed, errors, duration_seconds, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const threeHoursAgo = new Date(now - 3 * 3600000).toISOString();
  const tasks = [
    ['ingest_reddit', 'success', 4523, 2, 145.3],
    ['ingest_mastodon', 'success', 876, 0, 89.1],
    ['ingest_news', 'success', 1234, 1, 67.4],
    ['clean_and_tokenize', 'success', 6633, 0, 234.7],
    ['sentiment_analysis', 'success', 6633, 0, 178.2],
    ['word_scoring', 'success', 12500, 0, 56.8],
    ['entity_extraction', 'success', 3421, 0, 123.4],
    ['topic_modeling', 'success', 250, 0, 312.1],
    ['full_pipeline', 'success', 0, 3, 894.9],
  ];

  for (const [task, status, rows, errors, dur] of tasks) {
    insertRun.run(today, task, status, rows, errors, dur, threeHoursAgo, now.toISOString());
  }

  // Yesterday's "previous" profiles for word-change detection
  const prevWords = { CA: 'wildfire', FL: 'beach', NY: 'subway', TX: 'barbecue', MA: 'harbor' };
  for (const [st, word] of Object.entries(prevWords)) {
    const existing = states.find(s => s[0] === st);
    if (existing) {
      insertProfile.run(st, daysAgo(1), word, existing[2], existing[3], existing[4], existing[5], existing[6]);
    }
  }

  console.log(`Seeded: 50 states x 30 days profiles, word scores, sentiment time series, entities, topics, clusters, anomalies, anthropology metadata`);
  console.log('Database ready!');
}

setup();
