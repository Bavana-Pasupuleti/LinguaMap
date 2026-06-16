import time
import json
import logging
from datetime import datetime, timedelta
from newsapi import NewsApiClient
import redis
from pipeline.config import NEWSAPI_KEY, STATES, REDIS_URL
from pipeline.db import get_connection, get_cursor, execute_batch, log_pipeline_run

logger = logging.getLogger(__name__)

redis_client = redis.from_url(REDIS_URL)


def create_news_client():
    return NewsApiClient(api_key=NEWSAPI_KEY)


def fetch_state_news(client, state_code, state_info):
    posts = []
    query = f'"{state_info["name"]}"'

    try:
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        today = datetime.utcnow().strftime("%Y-%m-%d")

        response = client.get_everything(
            q=query,
            from_param=yesterday,
            to=today,
            language="en",
            sort_by="relevancy",
            page_size=50
        )

        for article in response.get("articles", []):
            article_id = article.get("url", "")
            if redis_client.exists(f"ingested:news:{article_id}"):
                continue

            title = article.get("title", "") or ""
            description = article.get("description", "") or ""
            text = f"{title}. {description}".strip()

            if len(text) < 15:
                continue

            posts.append({
                "state": state_code,
                "post_id": article_id,
                "text": text,
                "metadata": {
                    "source_name": article.get("source", {}).get("name", ""),
                    "author": article.get("author", ""),
                    "published_at": article.get("publishedAt", ""),
                    "url": article_id,
                    "post_type": "news_headline",
                    "title": title,
                    "description": description
                }
            })

    except Exception as e:
        logger.error(f"Error fetching news for {state_code}: {e}")

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
                (p["state"], "news", p["post_id"], p["text"], json.dumps(p["metadata"]))
                for p in posts
            ]
            execute_batch(cur, query, data)

    for p in posts:
        redis_client.setex(f"ingested:news:{p['post_id']}", timedelta(days=2), "1")

    return len(posts)


def run_news_ingestion():
    start_time = time.time()
    total_posts = 0
    errors = 0

    logger.info("Starting News API ingestion")
    client = create_news_client()

    for state_code, state_info in STATES.items():
        try:
            posts = fetch_state_news(client, state_code, state_info)
            stored = store_posts(posts)
            total_posts += stored
            logger.info(f"  {state_code}: {stored} articles")
        except Exception as e:
            errors += 1
            logger.error(f"  {state_code}: FAILED - {e}")

        time.sleep(0.5)  # NewsAPI rate limit: 100 requests/day on free tier

    duration = time.time() - start_time
    status = "success" if errors == 0 else "partial"
    log_pipeline_run("ingest_news", status, total_posts, errors, duration)
    logger.info(f"News ingestion complete: {total_posts} articles, {errors} errors, {duration:.1f}s")
    return total_posts


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_news_ingestion()
