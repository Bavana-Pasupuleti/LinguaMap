# LinguaMap — USA Anthropological Word Intelligence Platform

A full-stack anthropological intelligence platform that tracks culturally distinctive language patterns across all 50 US states in real-time. Ingests data from Reddit, Mastodon, and NewsAPI, runs NLP pipelines including TF-IDF scoring, named entity recognition, LDA topic modeling, and sentiment analysis, then visualizes region-specific vocabulary on an interactive choropleth map.

![Map View](https://img.shields.io/badge/React-Vite-blue) ![Pipeline](https://img.shields.io/badge/Python-NLP-green) ![API](https://img.shields.io/badge/Node.js-Express-yellow) ![DB](https://img.shields.io/badge/SQLite-Database-purple) ![Deploy](https://img.shields.io/badge/Vercel-Deployed-black)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Data Sources                          │
│  Reddit (Public JSON)  ·  Mastodon  ·  NewsAPI  ·  Wiki │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Python Ingestion Layer                      │
│  State-targeted scraping · Deduplication · Rate limiting │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                NLP Processing Pipeline                   │
│  spaCy tokenization · VADER+TextBlob sentiment          │
│  TF-IDF scoring · Entity extraction · LDA topics        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Analytical Engine                           │
│  Word distinctiveness · Spread/contagion tracking        │
│  Linguistic drift · Regional clustering · Anomaly det.  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              SQLite / PostgreSQL                         │
│         13 tables · Seeded data for all 50 states       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│         Express REST API / Static JSON Generation        │
│              17 endpoints · Vercel-compatible            │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│            React Frontend                                │
│  D3.js choropleth · Recharts · Interactive dashboards   │
└─────────────────────────────────────────────────────────┘
```

## Features

### Interactive Choropleth Map
- D3.js SVG map of all 50 US states using TopoJSON atlas
- Each state displays its top trending word, colored by anthropological category (Identity, Cultural, Social Behavior, Dialect)
- Hover tooltips with sentiment scores, post volume, and word metadata
- Word change badges highlighting states where the top word shifted in the last 24 hours
- Filter by category, data source, and date

### State Deep Dive (All 50 States)
- 10 culturally authentic words per state with distinctiveness rankings and POS tags
- 30-day sentiment trend line chart with subjectivity overlay
- LDA topic modeling pie chart (5 topics per state)
- Named entity recognition results — 5 entities per state (PERSON, ORG, GPE, LOC, FAC, EVENT)
- Word history timeline showing daily top word progression

### National Trends
- Words trending across 3+ states simultaneously
- New word detection with novelty scoring
- Word contagion tracker — visualize how a word spreads from its origin state across the country with spread velocity metrics

### State Comparison
- Side-by-side comparison of 2-4 states
- Radar chart across 5 dimensions: sentiment, subjectivity, post volume, word diversity, top score
- Top words comparison with distinctiveness rankings

### Data Analysis Dashboard
- **Linguistic Drift** — Ranks states by vocabulary volatility (word turnover rate week-over-week)
- **POS Distribution** — Stacked bar chart classifying states as noun-heavy, verb-heavy, or adjective-heavy
- **Regional Clusters** — K-means clustering on TF-IDF vectors identifying 6 linguistic regions, compared against Census regions
- **Anomaly Detection** — Sentiment anomalies flagged when z-score exceeds 2 standard deviations from the 30-day rolling mean
- **Pipeline Health** — Real-time monitoring of all ingestion and processing stages

## Cultural Word Coverage

All 50 states have full anthropological data sets including:
- **10 culturally distinctive words** — e.g., Texas: rodeo, howdy, barbecue, ranch; Louisiana: crawfish, bayou, gumbo, mardi; Massachusetts: wicked, lobster, harbor, chowder
- **5 named entities** — mix of GPE, ORG, PERSON, FAC, LOC, EVENT types relevant to each state
- **5 LDA topics** — weekly topic models capturing regional discourse themes

## Data Pipeline

The pipeline runs daily (configurable via cron) and performs 8 stages:

| Stage | Description | Tools |
|-------|-------------|-------|
| **Ingestion** | Fetch posts from Reddit (public JSON — no API key needed), Mastodon, NewsAPI | requests, Mastodon.py, newsapi |
| **Text Cleaning** | URL stripping, contraction expansion (62 patterns including Southern dialect), language detection, emoji extraction | langdetect, regex |
| **Tokenization** | Lemmatization, POS tagging, n-gram frequency tables, cultural word preservation (40+ terms like "y'all", "jawn", "bodega") | spaCy |
| **Sentiment Analysis** | Dual scoring with anomaly detection | VADER, TextBlob |
| **Word Scoring** | TF-IDF (each state = document), spread scores, novelty decay, composite distinctiveness | scikit-learn |
| **Entity Extraction** | Named entity recognition | spaCy NER |
| **Topic Modeling** | Weekly LDA with 5 topics per state | scikit-learn |
| **Clustering & Drift** | Regional clustering, linguistic drift calculation | scikit-learn, k-means |

### Key Scoring Algorithms

- **Distinctiveness Score** = TF-IDF (40%) + Spread (20%) + Novelty (25%) + Drift (15%)
- **Spread Velocity** = states reached / days since first appearance
- **Linguistic Drift** = 1 - (overlap of top-10 words between consecutive weeks)
- **Anomaly Detection** = |current sentiment - 30-day rolling mean| / rolling std > 2

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, D3.js, Recharts, React Router, Tailwind CSS |
| API | Node.js, Express |
| Database | SQLite (local + build), PostgreSQL (optional production) |
| Static Generation | Pre-rendered JSON API (172+ files at build time) |
| NLP Pipeline | Python 3.11+, spaCy, VADER, TextBlob, scikit-learn |
| Deployment | Vercel (static), Render (full-stack) |

## Local Development

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Bavana-Pasupuleti/LinguaMap.git
cd LinguaMap

# 2. Set up environment
cp .env.example .env
# Add your API keys to .env (only NewsAPI and Mastodon needed)

# 3. Start the API server (uses SQLite automatically)
cd server
npm install
node setup-db.js    # Seeds 30 days of data for all 50 states
node index.js       # Starts on port 3001

# 4. Start the frontend
cd ../client
npm install
npm run dev         # Starts on port 5173
```

The app automatically uses SQLite with seeded data when no `DATABASE_URL` is set — no PostgreSQL required for local development.

### Running the Pipeline

```bash
cd pipeline
pip install -r requirements.txt
python -m spacy download en_core_web_sm
PYTHONPATH=.. python -m pipeline.orchestrator

# Individual stages
python -m pipeline.ingestion.reddit_ingestor    # No API key needed — uses public JSON
python -m pipeline.ingestion.mastodon_ingestor
python -m pipeline.ingestion.news_ingestor
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/map/today` | Top word + sentiment per state |
| `GET /api/map/date/:date` | Historical map data |
| `GET /api/state/:name/profile` | Full state profile (words, entities, topics, sentiment history) |
| `GET /api/state/:name/history/:days` | State time series |
| `GET /api/state/:name/words` | Ranked word list with anthropological metadata |
| `GET /api/state/compare/states?states=TX,CA` | Multi-state comparison |
| `GET /api/trending/national` | Words trending in 3+ states |
| `GET /api/trending/new` | High-novelty words |
| `GET /api/trending/contagion/:word` | Word spread trajectory |
| `GET /api/trending/leaderboard` | Top 20 words nationally |
| `GET /api/trending/word-changes` | 24h top word changes |
| `GET /api/analysis/clusters/today` | Linguistic region clusters |
| `GET /api/analysis/anomalies/recent` | Sentiment anomalies |
| `GET /api/analysis/sentiment/heatmap` | State-by-date sentiment matrix |
| `GET /api/analysis/drift/leaderboard` | Most volatile states |
| `GET /api/analysis/pos/distribution` | POS ratios by state |
| `GET /api/pipeline/status` | Pipeline health |

## Project Structure

```
├── client/                    React + Vite frontend
│   └── src/
│       ├── components/        USAMap, StatePanel, FilterBar, Leaderboard
│       ├── pages/             MapPage, StatePage, TrendsPage, ComparePage, AnalysisPage
│       ├── hooks/             useApi
│       └── utils/             api.js, constants.js, mockData.js
├── server/                    Express REST API
│   ├── routes/                map, state, trending, analysis, pipeline
│   ├── middleware/            DB connection (PostgreSQL/SQLite/sql.js)
│   ├── setup-db.js            SQLite schema + seed data (all 50 states)
│   └── generate-static-api.js Pre-renders all API endpoints as static JSON
├── pipeline/                  Python data pipeline
│   ├── ingestion/             reddit (public JSON), mastodon, news, wikipedia
│   ├── processing/            text_cleaner, tokenizer, sentiment, word_scorer, topics, entities
│   └── analysis/              clustering, contagion, drift, POS, sentiment geography
├── db/
│   ├── migrations/            PostgreSQL schema (13 tables)
│   └── seeds/                 State config, anthropological metadata
├── vercel.json                Vercel deployment config
└── render.yaml                Render deployment blueprint
```

## License

MIT
