import time
import json
import logging
import requests
from datetime import datetime, timezone, timedelta
from pipeline.config import REDDIT_USER_AGENT, STATES, REGIONAL_SUBREDDITS

logger = logging.getLogger(__name__)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": REDDIT_USER_AGENT or "LinguaMap/1.0"
})

_seen_ids = set()


def is_already_ingested(post_id):
    return post_id in _seen_ids


def mark_ingested(post_id):
    _seen_ids.add(post_id)


def fetch_subreddit_json(subreddit_name, sort="hot", limit=100):
    posts = []
    url = f"https://www.reddit.com/r/{subreddit_name}/{sort}.json"
    params = {"limit": min(limit, 100), "raw_json": 1}
    after = None

    pages = 0
    while len(posts) < limit and pages < 4:
        if after:
            params["after"] = after

        try:
            resp = SESSION.get(url, params=params, timeout=15)
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 60))
                logger.warning(f"Rate limited on r/{subreddit_name}, waiting {retry_after}s")
                time.sleep(retry_after)
                continue
            if resp.status_code != 200:
                logger.warning(f"r/{subreddit_name} returned {resp.status_code}")
                break

            data = resp.json()
            children = data.get("data", {}).get("children", [])
            if not children:
                break

            for child in children:
                post = child.get("data", {})
                post_id = post.get("id")
                if not post_id or is_already_ingested(post_id):
                    continue

                created = datetime.fromtimestamp(post.get("created_utc", 0), tz=timezone.utc)
                if created < datetime.now(timezone.utc) - timedelta(days=2):
                    continue

                title = post.get("title", "")
                selftext = post.get("selftext", "")
                text = f"{title} {selftext}".strip()
                if len(text) < 10:
                    continue

                posts.append({
                    "post_id": post_id,
                    "text": text,
                    "metadata": {
                        "subreddit": subreddit_name,
                        "author_flair": post.get("author_flair_text"),
                        "upvotes": post.get("score", 0),
                        "num_comments": post.get("num_comments", 0),
                        "created_utc": post.get("created_utc"),
                        "post_type": "submission",
                        "url": post.get("url"),
                        "is_self": post.get("is_self", False)
                    }
                })
                mark_ingested(post_id)

            after = data.get("data", {}).get("after")
            if not after:
                break
            pages += 1
            time.sleep(2)

        except requests.RequestException as e:
            logger.error(f"Request failed for r/{subreddit_name}: {e}")
            break

    return posts


def fetch_comments_json(subreddit_name, post_id, limit=50):
    comments = []
    url = f"https://www.reddit.com/r/{subreddit_name}/comments/{post_id}.json"
    params = {"limit": limit, "raw_json": 1, "sort": "top"}

    try:
        resp = SESSION.get(url, params=params, timeout=15)
        if resp.status_code != 200:
            return comments

        data = resp.json()
        if len(data) < 2:
            return comments

        comment_listing = data[1].get("data", {}).get("children", [])
        for child in comment_listing:
            if child.get("kind") != "t1":
                continue
            cdata = child.get("data", {})
            cid = cdata.get("id")
            body = cdata.get("body", "")

            if not cid or not body or body == "[deleted]" or body == "[removed]":
                continue
            if is_already_ingested(f"c_{cid}"):
                continue

            comments.append({
                "post_id": f"c_{cid}",
                "text": body,
                "metadata": {
                    "subreddit": subreddit_name,
                    "author_flair": cdata.get("author_flair_text"),
                    "upvotes": cdata.get("score", 0),
                    "created_utc": cdata.get("created_utc"),
                    "post_type": "comment",
                    "parent_id": cdata.get("parent_id")
                }
            })
            mark_ingested(f"c_{cid}")

    except requests.RequestException as e:
        logger.warning(f"Comments fetch failed for {post_id}: {e}")

    return comments


def ingest_state(state_code, state_info):
    all_posts = []
    for sub in state_info.get("subreddits", []):
        posts = fetch_subreddit_json(sub, limit=100)

        top_posts = sorted(posts, key=lambda p: p["metadata"].get("num_comments", 0), reverse=True)[:5]
        for p in top_posts:
            comments = fetch_comments_json(sub, p["post_id"], limit=30)
            for c in comments:
                c["state"] = state_code
            all_posts.extend(comments)
            time.sleep(1)

        for p in posts:
            p["state"] = state_code
        all_posts.extend(posts)
        time.sleep(2)

    return all_posts


def store_posts(posts):
    if not posts:
        return 0

    try:
        from pipeline.db import get_connection, get_cursor, execute_batch

        with get_connection() as conn:
            with get_cursor(conn) as cur:
                query = """
                    INSERT INTO raw_posts (state, source, post_id, text, metadata)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (source, post_id) DO NOTHING
                """
                data = [
                    (p["state"], "reddit", p["post_id"], p["text"], json.dumps(p["metadata"]))
                    for p in posts
                ]
                execute_batch(cur, query, data)

        return len(posts)
    except Exception as e:
        logger.error(f"Failed to store posts: {e}")
        return 0


def run_reddit_ingestion():
    from pipeline.db import log_pipeline_run

    start_time = time.time()
    total_posts = 0
    errors = 0

    logger.info("Starting Reddit ingestion (public JSON)")
    _seen_ids.clear()

    for state_code, state_info in STATES.items():
        try:
            posts = ingest_state(state_code, state_info)
            stored = store_posts(posts)
            total_posts += stored
            logger.info(f"  {state_code}: {stored} posts ingested")
        except Exception as e:
            errors += 1
            logger.error(f"  {state_code}: FAILED - {e}")

    for sub in REGIONAL_SUBREDDITS:
        try:
            posts = fetch_subreddit_json(sub, limit=50)
            for p in posts:
                p["state"] = "US"
            stored = store_posts(posts)
            total_posts += stored
        except Exception as e:
            errors += 1
            logger.error(f"  Regional r/{sub}: FAILED - {e}")

    duration = time.time() - start_time
    status = "success" if errors == 0 else "partial"
    log_pipeline_run("ingest_reddit", status, total_posts, errors, duration)
    logger.info(f"Reddit ingestion complete: {total_posts} posts, {errors} errors, {duration:.1f}s")
    return total_posts


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_reddit_ingestion()
