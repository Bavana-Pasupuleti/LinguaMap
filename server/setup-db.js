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

  // Word scores for ALL 50 states — 10 words each
  const wordSets = {
    AL: [['football', 'NOUN', 345, 0.088], ['crimson', 'ADJ', 267, 0.072], ['barbecue', 'NOUN', 198, 0.058], ['southern', 'ADJ', 156, 0.045], ['tailgate', 'NOUN', 134, 0.039], ['catfish', 'NOUN', 112, 0.033], ['sweet', 'ADJ', 98, 0.028], ['church', 'NOUN', 87, 0.024], ['NASCAR', 'PROPN', 76, 0.020], ['humidity', 'NOUN', 65, 0.017]],
    AK: [['wilderness', 'NOUN', 178, 0.091], ['aurora', 'NOUN', 145, 0.078], ['salmon', 'NOUN', 123, 0.065], ['glacier', 'NOUN', 98, 0.052], ['moose', 'NOUN', 87, 0.044], ['pipeline', 'NOUN', 76, 0.037], ['tundra', 'NOUN', 65, 0.031], ['fishing', 'NOUN', 56, 0.026], ['bush', 'NOUN', 48, 0.021], ['permafrost', 'NOUN', 42, 0.018]],
    AZ: [['drought', 'NOUN', 312, 0.089], ['canyon', 'NOUN', 256, 0.074], ['desert', 'NOUN', 198, 0.061], ['saguaro', 'NOUN', 145, 0.048], ['monsoon', 'NOUN', 123, 0.041], ['mesa', 'NOUN', 98, 0.034], ['border', 'NOUN', 87, 0.028], ['pueblo', 'NOUN', 76, 0.023], ['copper', 'NOUN', 65, 0.019], ['rattlesnake', 'NOUN', 54, 0.015]],
    AR: [['barbecue', 'NOUN', 198, 0.082], ['razorback', 'NOUN', 156, 0.068], ['ozark', 'PROPN', 134, 0.055], ['delta', 'NOUN', 112, 0.045], ['catfish', 'NOUN', 98, 0.038], ['creek', 'NOUN', 87, 0.031], ['gospel', 'NOUN', 76, 0.026], ['biscuits', 'NOUN', 65, 0.021], ['timber', 'NOUN', 56, 0.017], ['springs', 'NOUN', 48, 0.014]],
    CA: [['housing', 'NOUN', 567, 0.092], ['wildfire', 'NOUN', 445, 0.078], ['hella', 'ADV', 312, 0.069], ['traffic', 'NOUN', 289, 0.054], ['tech', 'NOUN', 256, 0.047], ['avocado', 'NOUN', 198, 0.039], ['surf', 'NOUN', 167, 0.034], ['drought', 'NOUN', 145, 0.031], ['startup', 'NOUN', 123, 0.027], ['vegan', 'ADJ', 98, 0.023]],
    CO: [['trails', 'NOUN', 312, 0.087], ['brewery', 'NOUN', 256, 0.073], ['powder', 'NOUN', 198, 0.061], ['fourteener', 'NOUN', 156, 0.049], ['altitude', 'NOUN', 134, 0.041], ['dispensary', 'NOUN', 112, 0.034], ['craft', 'NOUN', 98, 0.028], ['skiing', 'NOUN', 87, 0.023], ['wildfire', 'NOUN', 76, 0.019], ['flannel', 'NOUN', 65, 0.015]],
    CT: [['commute', 'NOUN', 198, 0.084], ['hedge', 'NOUN', 167, 0.069], ['coastline', 'NOUN', 134, 0.055], ['colonial', 'ADJ', 112, 0.045], ['insurance', 'NOUN', 98, 0.037], ['pizza', 'NOUN', 87, 0.031], ['foliage', 'NOUN', 76, 0.025], ['shoreline', 'NOUN', 65, 0.020], ['harbor', 'NOUN', 56, 0.016], ['brownstone', 'NOUN', 48, 0.013]],
    DE: [['beach', 'NOUN', 156, 0.086], ['corporate', 'ADJ', 134, 0.071], ['boardwalk', 'NOUN', 112, 0.058], ['crab', 'NOUN', 98, 0.047], ['dupont', 'PROPN', 87, 0.038], ['scrapple', 'NOUN', 76, 0.031], ['toll', 'NOUN', 65, 0.025], ['colonial', 'ADJ', 56, 0.020], ['marsh', 'NOUN', 48, 0.016], ['flagship', 'NOUN', 42, 0.013]],
    FL: [['hurricane', 'NOUN', 456, 0.091], ['beach', 'NOUN', 389, 0.075], ['gator', 'NOUN', 267, 0.058], ['swamp', 'NOUN', 198, 0.045], ['theme', 'NOUN', 156, 0.038], ['retirement', 'NOUN', 134, 0.032], ['sunshine', 'NOUN', 112, 0.028], ['keys', 'NOUN', 98, 0.024], ['palm', 'NOUN', 87, 0.021], ['everglades', 'PROPN', 76, 0.018]],
    GA: [['peach', 'NOUN', 378, 0.086], ['southern', 'ADJ', 298, 0.071], ['hospitality', 'NOUN', 234, 0.056], ['braves', 'PROPN', 198, 0.045], ['peanut', 'NOUN', 167, 0.038], ['sweet', 'ADJ', 145, 0.032], ['pecan', 'NOUN', 123, 0.027], ['savannah', 'PROPN', 98, 0.022], ['cotton', 'NOUN', 87, 0.018], ['plantation', 'NOUN', 76, 0.015]],
    HI: [['aloha', 'NOUN', 234, 0.094], ['mahalo', 'NOUN', 189, 0.079], ['surf', 'NOUN', 156, 0.065], ['poke', 'NOUN', 134, 0.053], ['volcano', 'NOUN', 112, 0.044], ['lei', 'NOUN', 98, 0.036], ['ohana', 'NOUN', 87, 0.029], ['luau', 'NOUN', 76, 0.023], ['shaka', 'NOUN', 65, 0.018], ['reef', 'NOUN', 56, 0.014]],
    ID: [['potato', 'NOUN', 198, 0.088], ['wilderness', 'NOUN', 156, 0.072], ['gem', 'NOUN', 123, 0.057], ['trout', 'NOUN', 98, 0.045], ['rapids', 'NOUN', 87, 0.037], ['mountain', 'NOUN', 76, 0.030], ['ranch', 'NOUN', 65, 0.024], ['sawtooth', 'PROPN', 56, 0.019], ['boise', 'PROPN', 48, 0.015], ['elk', 'NOUN', 42, 0.012]],
    IL: [['pizza', 'NOUN', 398, 0.082], ['wind', 'NOUN', 312, 0.065], ['cubs', 'PROPN', 256, 0.054], ['lake', 'NOUN', 198, 0.043], ['blues', 'NOUN', 167, 0.037], ['skyscraper', 'NOUN', 134, 0.031], ['transit', 'NOUN', 112, 0.027], ['sausage', 'NOUN', 98, 0.023], ['winter', 'NOUN', 87, 0.019], ['hotdog', 'NOUN', 76, 0.016]],
    IN: [['racing', 'NOUN', 267, 0.085], ['hoosier', 'NOUN', 212, 0.071], ['basketball', 'NOUN', 178, 0.058], ['cornfield', 'NOUN', 145, 0.046], ['pork', 'NOUN', 112, 0.037], ['limestone', 'NOUN', 98, 0.030], ['covered', 'ADJ', 87, 0.024], ['tenderloin', 'NOUN', 76, 0.019], ['speedway', 'NOUN', 65, 0.015], ['barn', 'NOUN', 56, 0.012]],
    IA: [['corn', 'NOUN', 198, 0.087], ['caucus', 'NOUN', 167, 0.072], ['prairie', 'NOUN', 134, 0.058], ['hog', 'NOUN', 112, 0.046], ['soybean', 'NOUN', 98, 0.037], ['fair', 'NOUN', 87, 0.030], ['grain', 'NOUN', 76, 0.024], ['tractor', 'NOUN', 65, 0.019], ['ethanol', 'NOUN', 56, 0.015], ['windmill', 'NOUN', 48, 0.012]],
    KS: [['tornado', 'NOUN', 234, 0.089], ['wheat', 'NOUN', 189, 0.074], ['sunflower', 'NOUN', 156, 0.060], ['prairie', 'NOUN', 123, 0.048], ['plains', 'NOUN', 98, 0.038], ['cattle', 'NOUN', 87, 0.031], ['barbecue', 'NOUN', 76, 0.025], ['wizard', 'NOUN', 65, 0.020], ['flatland', 'NOUN', 56, 0.016], ['silo', 'NOUN', 48, 0.013]],
    KY: [['bourbon', 'NOUN', 289, 0.091], ['derby', 'NOUN', 234, 0.076], ['bluegrass', 'NOUN', 189, 0.062], ['horse', 'NOUN', 156, 0.050], ['tobacco', 'NOUN', 123, 0.040], ['colonel', 'NOUN', 98, 0.032], ['cave', 'NOUN', 87, 0.026], ['coal', 'NOUN', 76, 0.021], ['fiddle', 'NOUN', 65, 0.017], ['holler', 'NOUN', 56, 0.013]],
    LA: [['crawfish', 'NOUN', 456, 0.095], ['gumbo', 'NOUN', 378, 0.081], ['jazz', 'NOUN', 298, 0.067], ['bayou', 'NOUN', 234, 0.055], ['mardi', 'PROPN', 198, 0.046], ['voodoo', 'NOUN', 156, 0.038], ['cajun', 'ADJ', 134, 0.032], ['bourbon', 'NOUN', 112, 0.027], ['creole', 'ADJ', 98, 0.023], ['beignet', 'NOUN', 87, 0.019]],
    ME: [['lobster', 'NOUN', 234, 0.092], ['lighthouse', 'NOUN', 189, 0.076], ['blueberry', 'NOUN', 156, 0.062], ['harbor', 'NOUN', 123, 0.049], ['moose', 'NOUN', 98, 0.038], ['pine', 'NOUN', 87, 0.031], ['coastline', 'NOUN', 76, 0.025], ['fog', 'NOUN', 65, 0.020], ['lobsterman', 'NOUN', 56, 0.016], ['ayuh', 'NOUN', 48, 0.013]],
    MD: [['crab', 'NOUN', 289, 0.089], ['chesapeake', 'PROPN', 234, 0.074], ['beltway', 'NOUN', 189, 0.060], ['harbor', 'NOUN', 156, 0.048], ['lacrosse', 'NOUN', 123, 0.038], ['naval', 'ADJ', 98, 0.030], ['terps', 'PROPN', 87, 0.024], ['orioles', 'PROPN', 76, 0.019], ['oyster', 'NOUN', 65, 0.015], ['flag', 'NOUN', 56, 0.012]],
    MA: [['wicked', 'ADV', 367, 0.088], ['harbor', 'NOUN', 289, 0.068], ['lobster', 'NOUN', 234, 0.055], ['college', 'NOUN', 198, 0.044], ['chowder', 'NOUN', 167, 0.038], ['patriots', 'PROPN', 145, 0.033], ['freedom', 'NOUN', 123, 0.028], ['cape', 'NOUN', 98, 0.023], ['boston', 'PROPN', 87, 0.019], ['accent', 'NOUN', 76, 0.016]],
    MI: [['lakes', 'NOUN', 312, 0.087], ['automotive', 'ADJ', 256, 0.072], ['cherry', 'NOUN', 198, 0.058], ['mitten', 'NOUN', 156, 0.046], ['snowmobile', 'NOUN', 123, 0.037], ['detroit', 'PROPN', 98, 0.029], ['pasty', 'NOUN', 87, 0.023], ['dunes', 'NOUN', 76, 0.019], ['cider', 'NOUN', 65, 0.015], ['fudge', 'NOUN', 56, 0.012]],
    MN: [['hotdish', 'NOUN', 267, 0.090], ['lakes', 'NOUN', 223, 0.075], ['ope', 'NOUN', 189, 0.062], ['lutefisk', 'NOUN', 145, 0.049], ['walleye', 'NOUN', 123, 0.040], ['tater', 'NOUN', 98, 0.032], ['mall', 'NOUN', 87, 0.026], ['prince', 'PROPN', 76, 0.021], ['nordic', 'ADJ', 65, 0.017], ['canoe', 'NOUN', 56, 0.013]],
    MS: [['blues', 'NOUN', 198, 0.088], ['delta', 'NOUN', 167, 0.073], ['catfish', 'NOUN', 134, 0.059], ['magnolia', 'NOUN', 112, 0.047], ['gospel', 'NOUN', 98, 0.038], ['river', 'NOUN', 87, 0.030], ['tamale', 'NOUN', 76, 0.024], ['kudzu', 'NOUN', 65, 0.019], ['porch', 'NOUN', 56, 0.015], ['cotton', 'NOUN', 48, 0.012]],
    MO: [['gateway', 'NOUN', 256, 0.086], ['barbecue', 'NOUN', 212, 0.072], ['cardinals', 'PROPN', 178, 0.058], ['ozark', 'PROPN', 145, 0.046], ['arch', 'NOUN', 123, 0.037], ['river', 'NOUN', 98, 0.029], ['toasted', 'ADJ', 87, 0.023], ['provel', 'NOUN', 76, 0.018], ['mule', 'NOUN', 65, 0.014], ['cave', 'NOUN', 56, 0.011]],
    MT: [['ranch', 'NOUN', 178, 0.091], ['bison', 'NOUN', 145, 0.076], ['glacier', 'NOUN', 123, 0.062], ['sky', 'NOUN', 98, 0.049], ['elk', 'NOUN', 87, 0.040], ['rodeo', 'NOUN', 76, 0.032], ['trout', 'NOUN', 65, 0.026], ['prairie', 'NOUN', 56, 0.021], ['grizzly', 'NOUN', 48, 0.017], ['wilderness', 'NOUN', 42, 0.013]],
    NE: [['husker', 'NOUN', 234, 0.089], ['corn', 'NOUN', 189, 0.074], ['steak', 'NOUN', 156, 0.060], ['prairie', 'NOUN', 123, 0.048], ['runza', 'NOUN', 98, 0.038], ['sandhill', 'NOUN', 87, 0.030], ['cattle', 'NOUN', 76, 0.024], ['memorial', 'NOUN', 65, 0.019], ['chimney', 'NOUN', 56, 0.015], ['silo', 'NOUN', 48, 0.012]],
    NV: [['desert', 'NOUN', 267, 0.088], ['casino', 'NOUN', 223, 0.074], ['strip', 'NOUN', 189, 0.061], ['neon', 'NOUN', 145, 0.048], ['drought', 'NOUN', 123, 0.039], ['mining', 'NOUN', 98, 0.031], ['jackpot', 'NOUN', 87, 0.025], ['basin', 'NOUN', 76, 0.020], ['vegas', 'PROPN', 65, 0.016], ['turquoise', 'NOUN', 56, 0.013]],
    NH: [['maple', 'NOUN', 178, 0.090], ['granite', 'NOUN', 145, 0.075], ['foliage', 'NOUN', 123, 0.061], ['moose', 'NOUN', 98, 0.048], ['notch', 'NOUN', 87, 0.039], ['covered', 'ADJ', 76, 0.031], ['primary', 'NOUN', 65, 0.025], ['skiing', 'NOUN', 56, 0.020], ['cider', 'NOUN', 48, 0.016], ['flume', 'NOUN', 42, 0.013]],
    NJ: [['diner', 'NOUN', 289, 0.087], ['shore', 'NOUN', 234, 0.072], ['turnpike', 'NOUN', 189, 0.058], ['boardwalk', 'NOUN', 156, 0.046], ['porkroll', 'NOUN', 123, 0.037], ['jughandle', 'NOUN', 98, 0.029], ['transit', 'NOUN', 87, 0.023], ['garden', 'NOUN', 76, 0.018], ['bruce', 'PROPN', 65, 0.014], ['taylorham', 'NOUN', 56, 0.011]],
    NM: [['chile', 'NOUN', 234, 0.092], ['adobe', 'NOUN', 189, 0.077], ['mesa', 'NOUN', 156, 0.063], ['pueblo', 'NOUN', 123, 0.050], ['enchilada', 'NOUN', 98, 0.040], ['turquoise', 'NOUN', 87, 0.032], ['coyote', 'NOUN', 76, 0.025], ['arroyo', 'NOUN', 65, 0.020], ['salsa', 'NOUN', 56, 0.016], ['ristras', 'NOUN', 48, 0.012]],
    NY: [['bodega', 'NOUN', 423, 0.088], ['subway', 'NOUN', 389, 0.072], ['rent', 'NOUN', 345, 0.065], ['broadway', 'PROPN', 234, 0.051], ['pizza', 'NOUN', 198, 0.044], ['borough', 'NOUN', 167, 0.038], ['hustle', 'NOUN', 145, 0.033], ['brunch', 'NOUN', 123, 0.029], ['stoop', 'NOUN', 98, 0.025], ['bagel', 'NOUN', 87, 0.021]],
    NC: [['barbecue', 'NOUN', 312, 0.088], ['vinegar', 'NOUN', 245, 0.072], ['smoky', 'ADJ', 198, 0.058], ['tobacco', 'NOUN', 156, 0.046], ['beach', 'NOUN', 134, 0.038], ['banking', 'NOUN', 112, 0.031], ['grits', 'NOUN', 98, 0.025], ['bluegrass', 'NOUN', 87, 0.020], ['lighthouse', 'NOUN', 76, 0.016], ['pottery', 'NOUN', 65, 0.013]],
    ND: [['prairie', 'NOUN', 145, 0.091], ['bison', 'NOUN', 123, 0.076], ['badlands', 'PROPN', 98, 0.061], ['oil', 'NOUN', 87, 0.049], ['wheat', 'NOUN', 76, 0.039], ['blizzard', 'NOUN', 65, 0.031], ['fargo', 'PROPN', 56, 0.024], ['lefse', 'NOUN', 48, 0.019], ['grain', 'NOUN', 42, 0.015], ['sunflower', 'NOUN', 38, 0.012]],
    OH: [['buckeye', 'NOUN', 312, 0.087], ['football', 'NOUN', 256, 0.072], ['rust', 'NOUN', 198, 0.058], ['chili', 'NOUN', 156, 0.046], ['cedar', 'NOUN', 123, 0.036], ['cornhole', 'NOUN', 98, 0.029], ['skyline', 'PROPN', 87, 0.023], ['amish', 'ADJ', 76, 0.018], ['lake', 'NOUN', 65, 0.014], ['goetta', 'NOUN', 56, 0.011]],
    OK: [['rodeo', 'NOUN', 234, 0.088], ['tornado', 'NOUN', 198, 0.074], ['sooner', 'NOUN', 167, 0.060], ['oil', 'NOUN', 134, 0.048], ['prairie', 'NOUN', 112, 0.038], ['bison', 'NOUN', 98, 0.031], ['okra', 'NOUN', 87, 0.025], ['redbud', 'NOUN', 76, 0.020], ['land', 'NOUN', 65, 0.016], ['frybread', 'NOUN', 56, 0.012]],
    OR: [['hiking', 'NOUN', 289, 0.089], ['craft', 'NOUN', 234, 0.074], ['rain', 'NOUN', 198, 0.061], ['forest', 'NOUN', 156, 0.048], ['portland', 'PROPN', 134, 0.039], ['brewery', 'NOUN', 112, 0.032], ['moss', 'NOUN', 98, 0.026], ['coast', 'NOUN', 87, 0.021], ['cascade', 'PROPN', 76, 0.017], ['weird', 'ADJ', 65, 0.013]],
    PA: [['jawn', 'NOUN', 412, 0.091], ['cheesesteak', 'NOUN', 334, 0.074], ['liberty', 'NOUN', 256, 0.058], ['amish', 'ADJ', 198, 0.045], ['steel', 'NOUN', 167, 0.038], ['scrapple', 'NOUN', 134, 0.031], ['hoagie', 'NOUN', 112, 0.026], ['philly', 'PROPN', 98, 0.022], ['birch', 'NOUN', 87, 0.018], ['pretzel', 'NOUN', 76, 0.015]],
    RI: [['clambake', 'NOUN', 156, 0.090], ['coffee', 'NOUN', 134, 0.075], ['quahog', 'NOUN', 112, 0.060], ['sailing', 'NOUN', 98, 0.048], ['mansion', 'NOUN', 87, 0.039], ['del', 'PROPN', 76, 0.031], ['bubbla', 'NOUN', 65, 0.025], ['lighthouse', 'NOUN', 56, 0.020], ['bay', 'NOUN', 48, 0.015], ['johnnycake', 'NOUN', 42, 0.012]],
    SC: [['grits', 'NOUN', 234, 0.088], ['palmetto', 'NOUN', 189, 0.073], ['barbecue', 'NOUN', 156, 0.059], ['shrimp', 'NOUN', 123, 0.047], ['sweetgrass', 'NOUN', 98, 0.037], ['charleston', 'PROPN', 87, 0.029], ['lowcountry', 'NOUN', 76, 0.023], ['boil', 'NOUN', 65, 0.018], ['plantation', 'NOUN', 56, 0.014], ['gullah', 'NOUN', 48, 0.011]],
    SD: [['rushmore', 'PROPN', 145, 0.091], ['bison', 'NOUN', 123, 0.076], ['badlands', 'PROPN', 98, 0.061], ['black', 'ADJ', 87, 0.049], ['prairie', 'NOUN', 76, 0.039], ['pheasant', 'NOUN', 65, 0.031], ['sturgis', 'PROPN', 56, 0.025], ['corn', 'NOUN', 48, 0.020], ['reservation', 'NOUN', 42, 0.016], ['deadwood', 'PROPN', 38, 0.012]],
    TN: [['country', 'NOUN', 345, 0.089], ['nashville', 'PROPN', 289, 0.074], ['whiskey', 'NOUN', 234, 0.060], ['honky', 'NOUN', 189, 0.048], ['barbecue', 'NOUN', 156, 0.039], ['guitar', 'NOUN', 123, 0.031], ['smoky', 'ADJ', 98, 0.025], ['dolly', 'PROPN', 87, 0.020], ['biscuit', 'NOUN', 76, 0.016], ['moonshine', 'NOUN', 65, 0.013]],
    TX: [['howdy', 'NOUN', 342, 0.085], ['barbecue', 'NOUN', 289, 0.071], ['rodeo', 'NOUN', 198, 0.062], ['ranch', 'NOUN', 167, 0.048], ['frontier', 'NOUN', 134, 0.041], ['cattle', 'NOUN', 112, 0.035], ['oil', 'NOUN', 98, 0.031], ['boots', 'NOUN', 87, 0.028], ['yeehaw', 'NOUN', 76, 0.025], ['salsa', 'NOUN', 65, 0.022]],
    UT: [['canyon', 'NOUN', 234, 0.090], ['temple', 'NOUN', 189, 0.075], ['powder', 'NOUN', 156, 0.061], ['arches', 'PROPN', 123, 0.049], ['desert', 'NOUN', 98, 0.039], ['hive', 'NOUN', 87, 0.031], ['jello', 'NOUN', 76, 0.025], ['fry', 'NOUN', 65, 0.020], ['mesa', 'NOUN', 56, 0.016], ['altitude', 'NOUN', 48, 0.012]],
    VT: [['syrup', 'NOUN', 178, 0.092], ['foliage', 'NOUN', 145, 0.077], ['maple', 'NOUN', 123, 0.063], ['cheddar', 'NOUN', 98, 0.050], ['barn', 'NOUN', 87, 0.040], ['skiing', 'NOUN', 76, 0.032], ['craft', 'NOUN', 65, 0.025], ['covered', 'ADJ', 56, 0.020], ['bernie', 'PROPN', 48, 0.016], ['creemee', 'NOUN', 42, 0.012]],
    VA: [['history', 'NOUN', 289, 0.087], ['colonial', 'ADJ', 234, 0.072], ['battlefield', 'NOUN', 189, 0.058], ['navy', 'NOUN', 156, 0.046], ['tobacco', 'NOUN', 123, 0.036], ['ham', 'NOUN', 98, 0.028], ['monument', 'NOUN', 87, 0.023], ['shenandoah', 'PROPN', 76, 0.018], ['richmond', 'PROPN', 65, 0.014], ['oyster', 'NOUN', 56, 0.011]],
    WA: [['coffee', 'NOUN', 389, 0.084], ['rain', 'NOUN', 312, 0.069], ['hiking', 'NOUN', 267, 0.057], ['tech', 'NOUN', 234, 0.048], ['salmon', 'NOUN', 189, 0.040], ['mountain', 'NOUN', 156, 0.034], ['ferry', 'NOUN', 123, 0.028], ['craft', 'NOUN', 98, 0.023], ['evergreen', 'ADJ', 87, 0.019], ['cascades', 'PROPN', 76, 0.016]],
    WV: [['mountain', 'NOUN', 198, 0.090], ['coal', 'NOUN', 167, 0.075], ['holler', 'NOUN', 134, 0.061], ['pepperoni', 'NOUN', 112, 0.049], ['country', 'NOUN', 98, 0.039], ['ramp', 'NOUN', 87, 0.031], ['bridge', 'NOUN', 76, 0.025], ['river', 'NOUN', 65, 0.020], ['appalachian', 'ADJ', 56, 0.016], ['tudor', 'NOUN', 48, 0.012]],
    WI: [['cheese', 'NOUN', 312, 0.089], ['packers', 'PROPN', 256, 0.074], ['brats', 'NOUN', 198, 0.060], ['dairy', 'NOUN', 156, 0.048], ['supper', 'NOUN', 123, 0.038], ['beer', 'NOUN', 98, 0.030], ['frozen', 'ADJ', 87, 0.024], ['curds', 'NOUN', 76, 0.019], ['friday', 'NOUN', 65, 0.015], ['bubbla', 'NOUN', 56, 0.012]],
    WY: [['frontier', 'NOUN', 145, 0.091], ['yellowstone', 'PROPN', 123, 0.076], ['cowboy', 'NOUN', 98, 0.062], ['bison', 'NOUN', 87, 0.050], ['ranch', 'NOUN', 76, 0.040], ['geyser', 'NOUN', 65, 0.032], ['rodeo', 'NOUN', 56, 0.025], ['antelope', 'NOUN', 48, 0.019], ['prairie', 'NOUN', 42, 0.015], ['wind', 'NOUN', 38, 0.011]],
  };

  const insertWord = db.prepare(`
    INSERT OR REPLACE INTO state_word_daily (state, date, word, pos_tag, frequency, tfidf_score, sentiment_avg, spread_score, novelty_score, distinctiveness_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Insert word scores for ALL 50 states
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
    AL: [['Birmingham', 'GPE', 98], ['Alabama Crimson Tide', 'ORG', 87], ['Montgomery', 'GPE', 56], ['Nick Saban', 'PERSON', 45], ['Huntsville', 'GPE', 34]],
    AK: [['Anchorage', 'GPE', 89], ['Denali', 'LOC', 78], ['Juneau', 'GPE', 45], ['Iditarod', 'EVENT', 34], ['Trans-Alaska Pipeline', 'FAC', 28]],
    AZ: [['Phoenix', 'GPE', 123], ['Grand Canyon', 'LOC', 98], ['Tucson', 'GPE', 67], ['Sedona', 'GPE', 56], ['Arizona State', 'ORG', 45]],
    AR: [['Little Rock', 'GPE', 78], ['Razorbacks', 'ORG', 67], ['Hot Springs', 'GPE', 45], ['Walmart', 'ORG', 89], ['Ozarks', 'LOC', 56]],
    CA: [['Los Angeles', 'GPE', 134], ['Google', 'ORG', 98], ['Hollywood', 'GPE', 76], ['Silicon Valley', 'GPE', 67], ['Newsom', 'PERSON', 45]],
    CO: [['Denver', 'GPE', 112], ['Rocky Mountains', 'LOC', 98], ['Boulder', 'GPE', 67], ['Broncos', 'ORG', 56], ['Coors', 'ORG', 45]],
    CT: [['Hartford', 'GPE', 78], ['Yale', 'ORG', 89], ['New Haven', 'GPE', 67], ['ESPN', 'ORG', 56], ['Mystic', 'GPE', 34]],
    DE: [['Wilmington', 'GPE', 67], ['Dover', 'GPE', 56], ['DuPont', 'ORG', 78], ['Rehoboth Beach', 'GPE', 45], ['Biden', 'PERSON', 89]],
    FL: [['Miami', 'GPE', 123], ['Disney World', 'FAC', 98], ['DeSantis', 'PERSON', 76], ['Everglades', 'GPE', 56], ['Tampa Bay', 'GPE', 45]],
    GA: [['Atlanta', 'GPE', 134], ['Coca-Cola', 'ORG', 89], ['Savannah', 'GPE', 78], ['Braves', 'ORG', 67], ['Martin Luther King', 'PERSON', 56]],
    HI: [['Honolulu', 'GPE', 98], ['Maui', 'GPE', 87], ['Pearl Harbor', 'FAC', 67], ['Kilauea', 'LOC', 56], ['Waikiki', 'GPE', 78]],
    ID: [['Boise', 'GPE', 89], ['Sun Valley', 'GPE', 56], ['Micron', 'ORG', 45], ['Snake River', 'LOC', 67], ['Sawtooth', 'LOC', 34]],
    IL: [['Chicago', 'GPE', 167], ['Bears', 'ORG', 78], ['Lake Michigan', 'LOC', 56], ['Wrigley Field', 'FAC', 45], ['O\'Hare', 'FAC', 34]],
    IN: [['Indianapolis', 'GPE', 112], ['Indy 500', 'EVENT', 98], ['Pacers', 'ORG', 56], ['Notre Dame', 'ORG', 78], ['Purdue', 'ORG', 45]],
    IA: [['Des Moines', 'GPE', 78], ['Iowa State Fair', 'EVENT', 89], ['Hawkeyes', 'ORG', 67], ['Cedar Rapids', 'GPE', 45], ['John Deere', 'ORG', 56]],
    KS: [['Kansas City', 'GPE', 98], ['Wichita', 'GPE', 67], ['Chiefs', 'ORG', 89], ['Dodge City', 'GPE', 45], ['Eisenhower', 'PERSON', 34]],
    KY: [['Louisville', 'GPE', 98], ['Kentucky Derby', 'EVENT', 112], ['Lexington', 'GPE', 67], ['Bourbon Trail', 'FAC', 56], ['McConnell', 'PERSON', 45]],
    LA: [['New Orleans', 'GPE', 145], ['Mardi Gras', 'EVENT', 123], ['LSU', 'ORG', 89], ['French Quarter', 'FAC', 78], ['Baton Rouge', 'GPE', 56]],
    ME: [['Portland', 'GPE', 89], ['Acadia', 'LOC', 78], ['Bar Harbor', 'GPE', 56], ['L.L. Bean', 'ORG', 45], ['Stephen King', 'PERSON', 67]],
    MD: [['Baltimore', 'GPE', 112], ['Chesapeake Bay', 'LOC', 98], ['Ravens', 'ORG', 67], ['Annapolis', 'GPE', 56], ['Johns Hopkins', 'ORG', 78]],
    MA: [['Boston', 'GPE', 145], ['Harvard', 'ORG', 112], ['MIT', 'ORG', 98], ['Red Sox', 'ORG', 78], ['Cape Cod', 'GPE', 67]],
    MI: [['Detroit', 'GPE', 134], ['Ford', 'ORG', 98], ['Ann Arbor', 'GPE', 67], ['Wolverines', 'ORG', 78], ['Mackinac', 'GPE', 56]],
    MN: [['Minneapolis', 'GPE', 112], ['Mall of America', 'FAC', 89], ['Vikings', 'ORG', 78], ['Prince', 'PERSON', 67], ['Mayo Clinic', 'ORG', 98]],
    MS: [['Jackson', 'GPE', 78], ['Ole Miss', 'ORG', 67], ['Mississippi River', 'LOC', 89], ['Biloxi', 'GPE', 45], ['B.B. King', 'PERSON', 56]],
    MO: [['St. Louis', 'GPE', 123], ['Cardinals', 'ORG', 98], ['Kansas City', 'GPE', 89], ['Gateway Arch', 'FAC', 78], ['Branson', 'GPE', 45]],
    MT: [['Glacier National Park', 'LOC', 98], ['Billings', 'GPE', 67], ['Yellowstone', 'LOC', 89], ['Missoula', 'GPE', 56], ['Big Sky', 'GPE', 45]],
    NE: [['Omaha', 'GPE', 98], ['Cornhuskers', 'ORG', 89], ['Lincoln', 'GPE', 67], ['Berkshire Hathaway', 'ORG', 78], ['Warren Buffett', 'PERSON', 56]],
    NV: [['Las Vegas', 'GPE', 145], ['Reno', 'GPE', 67], ['Lake Tahoe', 'LOC', 89], ['The Strip', 'FAC', 78], ['Raiders', 'ORG', 56]],
    NH: [['Concord', 'GPE', 56], ['White Mountains', 'LOC', 78], ['Mount Washington', 'LOC', 67], ['Dartmouth', 'ORG', 89], ['Portsmouth', 'GPE', 45]],
    NJ: [['Newark', 'GPE', 89], ['Jersey Shore', 'LOC', 98], ['Atlantic City', 'GPE', 78], ['Springsteen', 'PERSON', 67], ['Rutgers', 'ORG', 56]],
    NM: [['Albuquerque', 'GPE', 98], ['Santa Fe', 'GPE', 89], ['Los Alamos', 'GPE', 67], ['White Sands', 'LOC', 78], ['Carlsbad Caverns', 'LOC', 56]],
    NY: [['Manhattan', 'GPE', 156], ['Yankees', 'ORG', 89], ['Brooklyn', 'GPE', 78], ['Wall Street', 'FAC', 67], ['Adams', 'PERSON', 45]],
    NC: [['Charlotte', 'GPE', 112], ['Duke', 'ORG', 89], ['Raleigh', 'GPE', 78], ['Blue Ridge', 'LOC', 67], ['Outer Banks', 'LOC', 56]],
    ND: [['Fargo', 'GPE', 78], ['Bismarck', 'GPE', 56], ['Theodore Roosevelt', 'PERSON', 67], ['Bakken', 'LOC', 45], ['NDSU', 'ORG', 34]],
    OH: [['Columbus', 'GPE', 112], ['Ohio State', 'ORG', 98], ['Cleveland', 'GPE', 89], ['Cincinnati', 'GPE', 78], ['Rock Hall', 'FAC', 56]],
    OK: [['Oklahoma City', 'GPE', 98], ['Tulsa', 'GPE', 78], ['Thunder', 'ORG', 67], ['Sooners', 'ORG', 89], ['Will Rogers', 'PERSON', 45]],
    OR: [['Portland', 'GPE', 123], ['Nike', 'ORG', 98], ['Crater Lake', 'LOC', 78], ['Eugene', 'GPE', 67], ['Ducks', 'ORG', 56]],
    PA: [['Philadelphia', 'GPE', 134], ['Steelers', 'ORG', 89], ['Pittsburgh', 'GPE', 98], ['Penn State', 'ORG', 78], ['Liberty Bell', 'FAC', 67]],
    RI: [['Providence', 'GPE', 78], ['Newport', 'GPE', 67], ['Brown University', 'ORG', 56], ['Narragansett Bay', 'LOC', 45], ['RISD', 'ORG', 34]],
    SC: [['Charleston', 'GPE', 98], ['Myrtle Beach', 'GPE', 89], ['Clemson', 'ORG', 78], ['Fort Sumter', 'FAC', 56], ['Hilton Head', 'GPE', 67]],
    SD: [['Mount Rushmore', 'FAC', 98], ['Sioux Falls', 'GPE', 67], ['Badlands', 'LOC', 89], ['Sturgis', 'GPE', 78], ['Crazy Horse', 'FAC', 56]],
    TN: [['Nashville', 'GPE', 134], ['Grand Ole Opry', 'FAC', 98], ['Memphis', 'GPE', 89], ['Dolly Parton', 'PERSON', 78], ['Titans', 'ORG', 56]],
    TX: [['Austin', 'GPE', 89], ['Dallas Cowboys', 'ORG', 67], ['Ted Cruz', 'PERSON', 45], ['SXSW', 'EVENT', 34], ['NASA', 'ORG', 28]],
    UT: [['Salt Lake City', 'GPE', 98], ['Zion', 'LOC', 89], ['Brigham Young', 'ORG', 67], ['Park City', 'GPE', 78], ['Arches', 'LOC', 56]],
    VT: [['Burlington', 'GPE', 67], ['Ben & Jerry\'s', 'ORG', 89], ['Green Mountains', 'LOC', 78], ['Bernie Sanders', 'PERSON', 56], ['Stowe', 'GPE', 45]],
    VA: [['Richmond', 'GPE', 98], ['Arlington', 'GPE', 89], ['Virginia Tech', 'ORG', 67], ['Shenandoah', 'LOC', 78], ['Mount Vernon', 'FAC', 56]],
    WA: [['Seattle', 'GPE', 134], ['Amazon', 'ORG', 112], ['Microsoft', 'ORG', 98], ['Mount Rainier', 'LOC', 78], ['Seahawks', 'ORG', 67]],
    WV: [['Charleston', 'GPE', 67], ['New River Gorge', 'LOC', 78], ['Morgantown', 'GPE', 56], ['Mountaineers', 'ORG', 45], ['Appalachian Trail', 'LOC', 34]],
    WI: [['Milwaukee', 'GPE', 112], ['Packers', 'ORG', 98], ['Madison', 'GPE', 78], ['Lambeau Field', 'FAC', 89], ['Harley-Davidson', 'ORG', 56]],
    WY: [['Yellowstone', 'LOC', 98], ['Cheyenne', 'GPE', 67], ['Grand Teton', 'LOC', 89], ['Devils Tower', 'LOC', 56], ['Jackson Hole', 'GPE', 78]],
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
    AL: [['football,crimson,tide,touchdown,tailgate', 4.2], ['barbecue,catfish,southern,sweet,cooking', 3.8], ['church,gospel,faith,sunday,community', 3.4], ['humidity,summer,heat,storm,weather', 3.0], ['NASCAR,racing,speedway,track,motor', 2.7]],
    AK: [['wilderness,aurora,tundra,glacier,denali', 4.5], ['salmon,fishing,halibut,catch,river', 3.9], ['pipeline,oil,drilling,energy,industry', 3.5], ['moose,bear,wildlife,eagle,whale', 3.1], ['bush,remote,village,native,culture', 2.8]],
    AZ: [['drought,water,heat,desert,climate', 4.3], ['canyon,hiking,trail,mesa,sedona', 3.9], ['border,immigration,fence,crossing,policy', 3.5], ['saguaro,monsoon,cactus,sunset,landscape', 3.1], ['pueblo,tribal,native,reservation,heritage', 2.7]],
    AR: [['barbecue,catfish,delta,southern,cooking', 4.1], ['ozark,mountain,trail,river,nature', 3.7], ['razorback,football,hog,gameday,stadium', 3.3], ['gospel,church,faith,community,revival', 2.9], ['walmart,bentonville,retail,business,jobs', 2.6]],
    CA: [['housing,rent,cost,apartment,mortgage', 4.5], ['wildfire,drought,climate,water,smoke', 4.1], ['tech,startup,silicon,venture,ai', 3.7], ['beach,surf,ocean,coast,sunset', 3.2], ['traffic,commute,freeway,transit,congestion', 2.8]],
    CO: [['trails,hiking,mountain,fourteener,altitude', 4.3], ['brewery,craft,beer,taproom,pour', 3.9], ['powder,skiing,resort,slope,snowboard', 3.5], ['dispensary,cannabis,legalization,edible,shop', 3.1], ['wildfire,smoke,drought,climate,burn', 2.7]],
    CT: [['commute,train,metro,transit,traffic', 4.0], ['hedge,finance,greenwich,wealth,fund', 3.6], ['pizza,apizza,new,haven,colony', 3.2], ['foliage,autumn,leaf,color,season', 2.8], ['coastline,shore,sailing,harbor,beach', 2.5]],
    DE: [['beach,boardwalk,shore,sand,summer', 4.1], ['corporate,tax,business,company,incorporate', 3.7], ['crab,seafood,bay,catch,feast', 3.3], ['colonial,history,heritage,revolution,museum', 2.9], ['dupont,chemical,industry,science,research', 2.5]],
    FL: [['hurricane,storm,surge,evacuation,damage', 4.4], ['beach,sand,surf,coast,wave', 4.0], ['gator,swamp,everglades,wildlife,nature', 3.6], ['theme,disney,universal,park,tourism', 3.2], ['retirement,senior,community,golf,sunshine', 2.8]],
    GA: [['peach,southern,sweet,hospitality,charm', 4.2], ['atlanta,airport,traffic,beltline,midtown', 3.8], ['braves,football,dawgs,stadium,gameday', 3.4], ['peanut,cotton,farm,agriculture,field', 3.0], ['savannah,history,colonial,riverfront,moss', 2.7]],
    HI: [['aloha,mahalo,ohana,spirit,culture', 4.5], ['surf,wave,beach,pipeline,ocean', 4.0], ['volcano,lava,kilauea,eruption,flow', 3.5], ['poke,spam,plate,musubi,food', 3.1], ['tourism,hotel,resort,vacation,visitor', 2.7]],
    ID: [['potato,farm,harvest,spud,agriculture', 4.2], ['wilderness,mountain,river,forest,trail', 3.8], ['trout,fishing,fly,stream,catch', 3.4], ['gem,mining,sapphire,garnet,opal', 2.9], ['boise,growth,tech,moving,development', 2.6]],
    IL: [['pizza,deepdish,hotdog,sausage,beef', 4.3], ['wind,lake,winter,cold,blizzard', 3.9], ['cubs,bears,bulls,sox,stadium', 3.5], ['transit,cta,metra,train,commute', 3.1], ['blues,jazz,music,festival,club', 2.7]],
    IN: [['racing,indy,speedway,lap,motor', 4.3], ['basketball,hoosier,court,march,madness', 3.9], ['corn,farm,field,harvest,agriculture', 3.4], ['pork,tenderloin,breaded,diner,comfort', 3.0], ['barn,covered,bridge,rural,heritage', 2.6]],
    IA: [['corn,soybean,farm,harvest,field', 4.4], ['caucus,primary,politics,candidate,vote', 3.8], ['fair,fried,ride,butter,state', 3.4], ['hog,pork,livestock,barn,agriculture', 3.0], ['ethanol,wind,renewable,energy,green', 2.6]],
    KS: [['tornado,storm,shelter,warning,chase', 4.3], ['wheat,farm,harvest,grain,field', 3.9], ['prairie,flatland,plain,grass,horizon', 3.4], ['barbecue,burnt,ends,sauce,smoke', 3.0], ['wizard,oz,dorothy,yellow,brick', 2.6]],
    KY: [['bourbon,distillery,barrel,whiskey,proof', 4.4], ['derby,horse,race,churchill,jockey', 4.0], ['bluegrass,music,banjo,fiddle,festival', 3.5], ['coal,mining,mountain,hollow,industry', 3.0], ['fried,chicken,colonel,biscuit,comfort', 2.7]],
    LA: [['crawfish,gumbo,jambalaya,roux,cajun', 4.5], ['jazz,music,brass,second,line', 4.0], ['mardi,gras,parade,krewe,beads', 3.6], ['bayou,swamp,moss,water,wildlife', 3.2], ['voodoo,creole,french,quarter,culture', 2.8]],
    ME: [['lobster,trap,boat,pound,butter', 4.4], ['lighthouse,coast,harbor,rocky,shore', 3.9], ['blueberry,wild,harvest,pie,farm', 3.4], ['moose,pine,forest,wildlife,trail', 3.0], ['fog,island,maritime,sailing,bay', 2.6]],
    MD: [['crab,chesapeake,bay,steamed,feast', 4.3], ['beltway,dc,commute,traffic,metro', 3.9], ['lacrosse,ravens,orioles,game,stadium', 3.4], ['harbor,naval,academy,annapolis,ship', 3.0], ['oyster,seafood,waterfront,dock,catch', 2.6]],
    MA: [['wicked,accent,boston,pahk,cah', 4.3], ['harbor,tea,freedom,history,revolution', 3.9], ['lobster,chowder,clam,seafood,roll', 3.5], ['college,harvard,mit,campus,student', 3.1], ['patriots,sox,celtics,sports,fenway', 2.7]],
    MI: [['lakes,great,shore,beach,dune', 4.2], ['automotive,ford,gm,detroit,motor', 3.8], ['cherry,traverse,orchard,wine,harvest', 3.4], ['mitten,upper,peninsula,yooper,bridge', 3.0], ['snow,winter,ice,frozen,cold', 2.6]],
    MN: [['hotdish,tater,tot,casserole,comfort', 4.3], ['lakes,cabin,fishing,canoe,loon', 3.9], ['ope,dontcha,know,ya,nice', 3.4], ['prince,music,minneapolis,first,avenue', 3.0], ['nordic,lutefisk,lefse,scandinavian,heritage', 2.6]],
    MS: [['blues,delta,crossroads,guitar,juke', 4.3], ['catfish,fried,tamale,soul,food', 3.8], ['river,mississippi,levee,flood,bank', 3.4], ['gospel,church,faith,sunday,choir', 3.0], ['magnolia,porch,moss,southern,slow', 2.6]],
    MO: [['gateway,arch,landmark,monument,river', 4.1], ['barbecue,burnt,ends,ribs,sauce', 3.8], ['cardinals,baseball,stadium,busch,game', 3.4], ['ozark,lake,cave,spring,nature', 3.0], ['toasted,ravioli,provel,stl,food', 2.6]],
    MT: [['ranch,cattle,horse,cowboy,range', 4.3], ['glacier,mountain,park,trail,alpine', 3.9], ['bison,elk,wildlife,grizzly,bear', 3.5], ['sky,big,star,sunset,horizon', 3.1], ['rodeo,western,buckle,saddle,rope', 2.7]],
    NE: [['husker,football,memorial,stadium,red', 4.4], ['corn,farm,field,harvest,silo', 3.9], ['steak,beef,cattle,ranch,grill', 3.4], ['prairie,sandhill,crane,migration,bird', 3.0], ['runza,chili,comfort,food,diner', 2.6]],
    NV: [['casino,strip,vegas,gamble,jackpot', 4.4], ['desert,basin,valley,heat,sand', 3.9], ['neon,lights,show,entertainment,night', 3.4], ['drought,water,lake,mead,shortage', 3.0], ['mining,silver,gold,ore,ghost', 2.6]],
    NH: [['maple,syrup,sugar,shack,tap', 4.2], ['granite,mountain,notch,white,range', 3.8], ['foliage,autumn,color,leaf,season', 3.4], ['primary,vote,politics,town,hall', 3.0], ['skiing,resort,snow,powder,slope', 2.6]],
    NJ: [['diner,porkroll,taylor,ham,egg', 4.2], ['shore,boardwalk,beach,sand,ocean', 3.8], ['turnpike,traffic,commute,exit,toll', 3.4], ['springsteen,music,asbury,rock,jersey', 3.0], ['garden,tomato,farm,blueberry,fresh', 2.6]],
    NM: [['chile,green,red,hatch,roast', 4.4], ['adobe,pueblo,mesa,desert,sand', 3.9], ['turquoise,silver,jewelry,native,craft', 3.4], ['enchilada,sopapilla,tamale,salsa,food', 3.0], ['alien,roswell,ufo,area,mystery', 2.6]],
    NY: [['subway,mta,transit,delay,commute', 4.3], ['rent,housing,apartment,lease,landlord', 4.0], ['broadway,theater,show,performance,ticket', 3.5], ['food,restaurant,deli,bodega,brunch', 3.2], ['park,central,brooklyn,queens,bronx', 2.9]],
    NC: [['barbecue,vinegar,pork,smoke,pulled', 4.3], ['beach,outer,banks,coast,surf', 3.8], ['tobacco,farm,field,leaf,cure', 3.3], ['banking,charlotte,finance,growth,metro', 2.9], ['smoky,mountain,trail,blue,ridge', 2.6]],
    ND: [['prairie,bison,badlands,grassland,plain', 4.3], ['oil,bakken,drilling,boom,pipeline', 3.8], ['wheat,farm,harvest,grain,elevator', 3.3], ['blizzard,cold,winter,snow,freeze', 2.9], ['fargo,flood,river,valley,town', 2.5]],
    OH: [['buckeye,football,ohio,state,scarlet', 4.3], ['chili,skyline,cincinnati,three,way', 3.8], ['rust,belt,industry,steel,factory', 3.3], ['cornhole,tailgate,game,backyard,toss', 2.9], ['lake,erie,shore,cedar,point', 2.5]],
    OK: [['rodeo,cowboy,western,buckle,bull', 4.2], ['tornado,storm,alley,shelter,warning', 3.8], ['sooner,football,boomer,gameday,stadium', 3.4], ['oil,energy,drilling,rig,industry', 3.0], ['frybread,tribal,native,powwow,dance', 2.6]],
    OR: [['hiking,trail,forest,mountain,waterfall', 4.3], ['craft,beer,brewery,tap,pour', 3.9], ['rain,drizzle,grey,cloud,mist', 3.4], ['portland,weird,food,truck,bridge', 3.0], ['coast,beach,tide,dune,lighthouse', 2.6]],
    PA: [['jawn,philly,yo,joint,that', 4.3], ['cheesesteak,hoagie,wiz,onion,south', 3.9], ['liberty,bell,independence,history,revolution', 3.4], ['amish,lancaster,buggy,farm,quilt', 3.0], ['steel,pittsburgh,bridge,river,industry', 2.6]],
    RI: [['clambake,quahog,seafood,bay,shore', 4.2], ['sailing,newport,mansion,yacht,harbor', 3.8], ['coffee,milk,del,cabinet,drink', 3.3], ['lighthouse,coast,island,rocky,point', 2.9], ['providence,risd,art,college,hill', 2.5]],
    SC: [['grits,shrimp,lowcountry,boil,sweet', 4.2], ['palmetto,beach,coast,myrtle,sand', 3.8], ['charleston,history,cobblestone,market,ghost', 3.4], ['barbecue,mustard,vinegar,pulled,pork', 3.0], ['gullah,sweetgrass,basket,heritage,culture', 2.6]],
    SD: [['rushmore,monument,face,granite,carve', 4.3], ['bison,badlands,prairie,herd,range', 3.9], ['sturgis,motorcycle,rally,ride,leather', 3.4], ['pheasant,hunt,field,season,bird', 2.9], ['deadwood,gold,mine,saloon,wild', 2.5]],
    TN: [['country,music,nashville,guitar,song', 4.4], ['whiskey,moonshine,barrel,distillery,sip', 3.9], ['barbecue,rib,smoke,memphis,dry', 3.4], ['honky,tonk,broadway,live,band', 3.0], ['smoky,mountain,trail,cabin,dollywood', 2.6]],
    TX: [['barbecue,ranch,cattle,rodeo,western', 4.2], ['oil,energy,drilling,pipeline,gas', 3.8], ['football,cowboys,longhorns,stadium,tailgate', 3.5], ['border,immigration,policy,federal,wall', 3.1], ['austin,tech,startup,music,festival', 2.9]],
    UT: [['canyon,arch,mesa,slot,red', 4.3], ['temple,church,community,faith,family', 3.9], ['powder,skiing,resort,park,city', 3.5], ['desert,salt,flat,lake,basin', 3.0], ['hive,beehive,industry,work,pioneer', 2.6]],
    VT: [['syrup,maple,sugar,shack,pancake', 4.4], ['foliage,autumn,leaf,color,peak', 3.9], ['cheddar,cheese,dairy,farm,cow', 3.4], ['skiing,snowboard,stowe,killington,resort', 3.0], ['craft,beer,cider,local,taproom', 2.6]],
    VA: [['history,colonial,battlefield,revolution,monument', 4.2], ['navy,military,base,pentagon,service', 3.8], ['tobacco,farm,heritage,field,leaf', 3.3], ['shenandoah,mountain,trail,valley,blue', 2.9], ['ham,oyster,seafood,coast,tidewater', 2.5]],
    WA: [['coffee,espresso,roast,cafe,latte', 4.3], ['rain,drizzle,grey,cloud,umbrella', 3.9], ['tech,amazon,microsoft,startup,hire', 3.5], ['salmon,fishing,orca,whale,sound', 3.1], ['hiking,rainier,cascade,trail,mountain', 2.7]],
    WV: [['mountain,appalachian,ridge,valley,peak', 4.3], ['coal,mining,industry,shaft,hollow', 3.9], ['holler,country,road,banjo,porch', 3.4], ['pepperoni,roll,comfort,food,diner', 3.0], ['river,gorge,bridge,rapid,rafting', 2.6]],
    WI: [['cheese,curd,dairy,cheddar,factory', 4.4], ['packers,lambeau,football,green,bay', 4.0], ['brats,beer,tailgate,grill,summer', 3.5], ['supper,club,friday,fish,fry', 3.0], ['frozen,tundra,winter,snow,cold', 2.6]],
    WY: [['yellowstone,geyser,bison,thermal,park', 4.4], ['cowboy,ranch,rodeo,saddle,western', 3.9], ['frontier,wilderness,open,range,land', 3.4], ['antelope,elk,wildlife,hunt,trophy', 3.0], ['wind,prairie,wide,sky,horizon', 2.6]],
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
