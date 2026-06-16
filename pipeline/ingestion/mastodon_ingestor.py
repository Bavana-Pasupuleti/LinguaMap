import time
import json
import logging
import re
from datetime import datetime, timezone, timedelta
from mastodon import Mastodon
import redis
from pipeline.config import (
    MASTODON_ACCESS_TOKEN, MASTODON_INSTANCE_URL,
    STATES, REDIS_URL
)
from pipeline.db import get_connection, get_cursor, execute_batch, log_pipeline_run

logger = logging.getLogger(__name__)

redis_client = redis.from_url(REDIS_URL)


def create_mastodon_client():
    return Mastodon(
        access_token=MASTODON_ACCESS_TOKEN,
        api_base_url=MASTODON_INSTANCE_URL
    )


def extract_hashtags(content):
    return re.findall(r'#(\w+)', content)


def strip_html(text):
    return re.sub(r'<[^>]+>', ' ', text).strip()


def match_state(text, hashtags):
    text_lower = text.lower()
    hashtags_lower = [h.lower() for h in hashtags]

    for code, info in STATES.items():
        state_name = info["name"].lower()
        cities = [c.lower() for c in info["cities"]]

        if state_name in text_lower or state_name in hashtags_lower:
            return code
        for city in cities:
            if city in text_lower or city.replace(" ", "") in hashtags_lower:
                return code

    return None


def fetch_public_timeline(mastodon, limit=400):
    posts = []
    try:
        statuses = mastodon.timeline_public(limit=40)
        seen = set()

        pages = 0
        while statuses and len(posts) < limit and pages < 10:
            for status in statuses:
                if status["id"] in seen:
                    continue
                seen.add(status["id"])

                if redis_client.exists(f"ingested:mastodon:{status['id']}"):
                    continue

                if status.get("language") and status["language"] != "en":
                    continue

                content = strip_html(status["content"])
                if len(content) < 10:
                    continue

                hashtags = extract_hashtags(status["content"])
                state = match_state(content, hashtags)

                if state:
                    posts.append({
                        "state": state,
                        "post_id": str(status["id"]),
                        "text": content,
                        "metadata": {
                            "instance_url": MASTODON_INSTANCE_URL,
                            "status_id": str(status["id"]),
                            "language": status.get("language", "en"),
                            "boost_count": status.get("reblogs_count", 0),
                            "reply_count": status.get("replies_count", 0),
                            "favourite_count": status.get("favourites_count", 0),
                            "created_at": status["created_at"].isoformat() if isinstance(status["created_at"], datetime) else str(status["created_at"]),
                            "hashtags": hashtags,
                            "post_type": "status"
                        }
                    })

            statuses = mastodon.fetch_next(statuses)
            pages += 1
            time.sleep(1)

    except Exception as e:
        logger.error(f"Error fetching Mastodon timeline: {e}")

    return posts


def search_state_toots(mastodon, state_code, state_info):
    posts = []
    search_terms = [state_info["name"]] + state_info["cities"][:2]

    for term in search_terms:
        try:
            results = mastodon.search_v2(term, result_type="statuses")
            for status in results.get("statuses", [])[:30]:
                if redis_client.exists(f"ingested:mastodon:{status['id']}"):
                    continue

                content = strip_html(status["content"])
                if len(content) < 10:
                    continue

                hashtags = extract_hashtags(status["content"])

                posts.append({
                    "state": state_code,
                    "post_id": str(status["id"]),
                    "text": content,
                    "metadata": {
                        "instance_url": MASTODON_INSTANCE_URL,
                        "status_id": str(status["id"]),
                        "language": status.get("language", "en"),
                        "boost_count": status.get("reblogs_count", 0),
                        "reply_count": status.get("replies_count", 0),
                        "created_at": status["created_at"].isoformat() if isinstance(status["created_at"], datetime) else str(status["created_at"]),
                        "hashtags": hashtags,
                        "search_term": term,
                        "post_type": "status"
                    }
                })

            time.sleep(2)  # respect rate limits
        except Exception as e:
            logger.warning(f"Search failed for '{term}': {e}")

    return posts


def store_posts(posts):
    if not posts:
        return 0

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            query = """
                INSERT INTO raw_posts (state, source, post_id, text, metadata)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (source, post_id) DO NOTHING
            """
            data = [
                (p["state"], "mastodon", p["post_id"], p["text"], json.dumps(p["metadata"]))
                for p in posts
            ]
            execute_batch(cur, query, data)

    for p in posts:
        redis_client.setex(f"ingested:mastodon:{p['post_id']}", timedelta(days=2), "1")

    return len(posts)


def run_mastodon_ingestion():
    start_time = time.time()
    total_posts = 0
    errors = 0

    logger.info("Starting Mastodon ingestion")
    mastodon = create_mastodon_client()

    # Public timeline scan
    try:
        timeline_posts = fetch_public_timeline(mastodon, limit=400)
        stored = store_posts(timeline_posts)
        total_posts += stored
        logger.info(f"  Public timeline: {stored} state-matched posts")
    except Exception as e:
        errors += 1
        logger.error(f"  Public timeline failed: {e}")

    # Targeted search per state
    for state_code, state_info in STATES.items():
        try:
            posts = search_state_toots(mastodon, state_code, state_info)
            stored = store_posts(posts)
            total_posts += stored
            logger.info(f"  {state_code}: {stored} posts via search")
        except Exception as e:
            errors += 1
            logger.error(f"  {state_code}: search failed - {e}")

    duration = time.time() - start_time
    status = "success" if errors == 0 else "partial"
    log_pipeline_run("ingest_mastodon", status, total_posts, errors, duration)
    logger.info(f"Mastodon ingestion complete: {total_posts} posts, {errors} errors, {duration:.1f}s")
    return total_posts


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_mastodon_ingestion()
