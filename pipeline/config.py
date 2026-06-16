import os
from dotenv import load_dotenv

load_dotenv()

REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USERNAME = os.getenv("REDDIT_USERNAME", "")
REDDIT_PASSWORD = os.getenv("REDDIT_PASSWORD", "")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "LinguaMap/1.0")

MASTODON_ACCESS_TOKEN = os.getenv("MASTODON_ACCESS_TOKEN", "")
MASTODON_INSTANCE_URL = os.getenv("MASTODON_INSTANCE_URL", "https://mastodon.social")

NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://linguamap:linguamap@localhost:5432/linguamap")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

CRON_SCHEDULE = os.getenv("CRON_SCHEDULE", "0 3 * * *")

import json
import pathlib

SEEDS_DIR = pathlib.Path(__file__).parent.parent / "db" / "seeds"

def load_state_config():
    with open(SEEDS_DIR / "state_subreddits.json") as f:
        return json.load(f)

STATE_CONFIG = load_state_config()
STATES = STATE_CONFIG["states"]
REGIONAL_SUBREDDITS = STATE_CONFIG["regional_subreddits"]
