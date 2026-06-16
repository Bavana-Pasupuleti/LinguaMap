-- LinguaMap Database Schema
-- Requires PostgreSQL 14+ with TimescaleDB extension

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Raw ingestion table
CREATE TABLE raw_posts (
    id BIGSERIAL PRIMARY KEY,
    state VARCHAR(2) NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('reddit', 'mastodon', 'news', 'wikipedia')),
    post_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source, post_id)
);

CREATE INDEX idx_raw_posts_state_date ON raw_posts (state, ingested_at);
CREATE INDEX idx_raw_posts_source ON raw_posts (source);

-- Processed word scores per state per day
CREATE TABLE state_word_daily (
    id BIGSERIAL,
    state VARCHAR(2) NOT NULL,
    date DATE NOT NULL,
    word VARCHAR(100) NOT NULL,
    pos_tag VARCHAR(10),
    frequency INTEGER NOT NULL DEFAULT 0,
    tfidf_score DOUBLE PRECISION DEFAULT 0,
    sentiment_avg DOUBLE PRECISION DEFAULT 0,
    spread_score DOUBLE PRECISION DEFAULT 0,
    novelty_score DOUBLE PRECISION DEFAULT 0,
    distinctiveness_score DOUBLE PRECISION DEFAULT 0,
    source VARCHAR(20),
    PRIMARY KEY (date, state, word)
);

SELECT create_hypertable('state_word_daily', 'date');

-- Daily state profile (aggregated)
CREATE TABLE state_daily_profile (
    state VARCHAR(2) NOT NULL,
    date DATE NOT NULL,
    top_word VARCHAR(100),
    top_bigram VARCHAR(200),
    dominant_sentiment VARCHAR(20),
    sentiment_avg DOUBLE PRECISION,
    sentiment_std DOUBLE PRECISION,
    dominant_topic INTEGER,
    post_volume INTEGER DEFAULT 0,
    unique_authors INTEGER DEFAULT 0,
    emoji_top5 TEXT[] DEFAULT '{}',
    category VARCHAR(30) DEFAULT 'unclassified',
    PRIMARY KEY (state, date)
);

-- Sentiment time series
CREATE TABLE state_sentiment_ts (
    id BIGSERIAL,
    state VARCHAR(2) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    compound_score DOUBLE PRECISION,
    positive_ratio DOUBLE PRECISION,
    negative_ratio DOUBLE PRECISION,
    neutral_ratio DOUBLE PRECISION,
    subjectivity DOUBLE PRECISION,
    source VARCHAR(20),
    PRIMARY KEY (measured_at, state)
);

SELECT create_hypertable('state_sentiment_ts', 'measured_at');

-- Topic model outputs
CREATE TABLE state_topics (
    id BIGSERIAL PRIMARY KEY,
    state VARCHAR(2) NOT NULL,
    week_start DATE NOT NULL,
    topic_id INTEGER NOT NULL,
    top_words TEXT[] NOT NULL,
    weight DOUBLE PRECISION DEFAULT 0,
    UNIQUE (state, week_start, topic_id)
);

-- Word spread tracking
CREATE TABLE word_spread_log (
    id BIGSERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    first_seen_state VARCHAR(2),
    first_seen_date DATE,
    states_reached TEXT[] DEFAULT '{}',
    spread_velocity DOUBLE PRECISION DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (word)
);

-- Anomaly events
CREATE TABLE anomaly_log (
    id BIGSERIAL PRIMARY KEY,
    state VARCHAR(2) NOT NULL,
    date DATE NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL,
    metric VARCHAR(50),
    value DOUBLE PRECISION,
    baseline DOUBLE PRECISION,
    z_score DOUBLE PRECISION,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomaly_state_date ON anomaly_log (state, date);

-- Named entities per state
CREATE TABLE state_entities (
    id BIGSERIAL PRIMARY KEY,
    state VARCHAR(2) NOT NULL,
    date DATE NOT NULL,
    entity_text VARCHAR(255) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    frequency INTEGER DEFAULT 1,
    source VARCHAR(20),
    UNIQUE (state, date, entity_text, entity_type)
);

-- N-gram frequency tables
CREATE TABLE state_ngrams (
    id BIGSERIAL,
    state VARCHAR(2) NOT NULL,
    date DATE NOT NULL,
    ngram TEXT NOT NULL,
    ngram_type VARCHAR(10) NOT NULL CHECK (ngram_type IN ('unigram', 'bigram', 'trigram')),
    frequency INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date, state, ngram, ngram_type)
);

SELECT create_hypertable('state_ngrams', 'date');

-- Pipeline run health tracking
CREATE TABLE pipeline_runs (
    id BIGSERIAL PRIMARY KEY,
    run_date DATE NOT NULL,
    task_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'success', 'failed', 'skipped')),
    rows_processed INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    duration_seconds DOUBLE PRECISION,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regional clustering results
CREATE TABLE regional_clusters (
    id BIGSERIAL PRIMARY KEY,
    state VARCHAR(2) NOT NULL,
    date DATE NOT NULL,
    cluster_id INTEGER NOT NULL,
    cluster_label VARCHAR(100),
    similarity_score DOUBLE PRECISION,
    UNIQUE (state, date)
);

-- Anthropological metadata for known words
CREATE TABLE word_anthropology (
    word VARCHAR(100) PRIMARY KEY,
    lens VARCHAR(50),
    context TEXT,
    social_signal TEXT,
    spread_pattern VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    classified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wikipedia baseline fingerprints
CREATE TABLE state_baseline (
    state VARCHAR(2) NOT NULL,
    word VARCHAR(100) NOT NULL,
    frequency INTEGER NOT NULL,
    last_refreshed DATE NOT NULL,
    PRIMARY KEY (state, word)
);

-- Materialized views
CREATE MATERIALIZED VIEW mv_state_tfidf_rankings AS
SELECT state, date, word, tfidf_score, distinctiveness_score,
       ROW_NUMBER() OVER (PARTITION BY state, date ORDER BY distinctiveness_score DESC) as rank
FROM state_word_daily
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
  AND distinctiveness_score > 0;

CREATE MATERIALIZED VIEW mv_national_trending AS
SELECT word, COUNT(DISTINCT state) as state_count,
       AVG(distinctiveness_score) as avg_distinctiveness,
       MAX(date) as latest_date
FROM state_word_daily
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
  AND distinctiveness_score > 0.1
GROUP BY word
HAVING COUNT(DISTINCT state) >= 3
ORDER BY avg_distinctiveness DESC;

CREATE MATERIALIZED VIEW mv_regional_clusters AS
SELECT rc.state, rc.cluster_id, rc.cluster_label, rc.similarity_score,
       sdp.top_word, sdp.dominant_sentiment
FROM regional_clusters rc
JOIN state_daily_profile sdp ON rc.state = sdp.state AND rc.date = sdp.date
WHERE rc.date = (SELECT MAX(date) FROM regional_clusters);

-- Retention policy: keep raw posts for 90 days
SELECT add_retention_policy('state_word_daily', INTERVAL '90 days');
SELECT add_retention_policy('state_sentiment_ts', INTERVAL '90 days');
SELECT add_retention_policy('state_ngrams', INTERVAL '90 days');
