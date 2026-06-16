import logging
from datetime import date, timedelta
from collections import defaultdict
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
from pipeline.db import get_connection, get_cursor, execute_batch, log_pipeline_run

logger = logging.getLogger(__name__)


def get_state_texts_for_week(state, week_start):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT text FROM raw_posts
                WHERE state = %s
                  AND ingested_at >= %s
                  AND ingested_at < %s + INTERVAL '7 days'
            """, (state, week_start, week_start))
            return [row["text"] for row in cur.fetchall()]


def run_lda(texts, n_topics=5, max_features=5000):
    if len(texts) < 10:
        return None

    vectorizer = CountVectorizer(
        max_features=max_features,
        stop_words="english",
        min_df=2,
        max_df=0.95
    )

    try:
        dtm = vectorizer.fit_transform(texts)
    except ValueError:
        return None

    feature_names = vectorizer.get_feature_names_out()

    lda = LatentDirichletAllocation(
        n_components=n_topics,
        random_state=42,
        max_iter=20,
        learning_method="online"
    )
    lda.fit(dtm)

    topics = []
    for idx, topic in enumerate(lda.components_):
        top_indices = topic.argsort()[-10:][::-1]
        top_words = [feature_names[i] for i in top_indices]
        weight = float(topic[top_indices[0]])

        topics.append({
            "topic_id": idx,
            "top_words": top_words,
            "weight": weight
        })

    return topics


def store_topics(state, week_start, topics):
    if not topics:
        return

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                DELETE FROM state_topics
                WHERE state = %s AND week_start = %s
            """, (state, week_start))

            data = [
                (state, week_start, t["topic_id"], t["top_words"], t["weight"])
                for t in topics
            ]
            execute_batch(cur, """
                INSERT INTO state_topics (state, week_start, topic_id, top_words, weight)
                VALUES (%s, %s, %s, %s, %s)
            """, data)


def run_weekly_topic_modeling():
    today = date.today()
    if today.weekday() != 0:  # only run on Mondays
        logger.info("Topic modeling only runs on Mondays, skipping")
        return

    week_start = today - timedelta(days=7)
    total = 0
    errors = 0

    from pipeline.config import STATES

    logger.info(f"Running topic modeling for week starting {week_start}")

    for state_code in STATES:
        try:
            texts = get_state_texts_for_week(state_code, week_start)
            if not texts:
                continue

            topics = run_lda(texts, n_topics=5)
            if topics:
                store_topics(state_code, week_start, topics)
                total += len(topics)
                logger.info(f"  {state_code}: {len(topics)} topics extracted from {len(texts)} texts")
        except Exception as e:
            errors += 1
            logger.error(f"  {state_code}: topic modeling failed - {e}")

    log_pipeline_run("topic_modeling", "success" if errors == 0 else "partial", total, errors, 0)
    return total


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_weekly_topic_modeling()
