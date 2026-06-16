"""
Main pipeline orchestrator — runs the full daily pipeline.
Can be called by Airflow DAG or directly via CLI.
"""
import time
import logging
from collections import Counter, defaultdict
from pipeline.db import get_connection, get_cursor, execute_batch, log_pipeline_run
from pipeline.config import STATES

logger = logging.getLogger(__name__)


def run_ingestion():
    from pipeline.ingestion.reddit_ingestor import run_reddit_ingestion
    from pipeline.ingestion.mastodon_ingestor import run_mastodon_ingestion
    from pipeline.ingestion.news_ingestor import run_news_ingestion

    results = {}
    results["reddit"] = run_reddit_ingestion()
    results["mastodon"] = run_mastodon_ingestion()
    results["news"] = run_news_ingestion()
    return results


def run_cleaning_and_tokenization():
    from pipeline.processing.text_cleaner import clean_batch
    from pipeline.processing.tokenizer import tokenize_and_count

    start = time.time()
    state_word_counts = {}
    state_source_map = defaultdict(lambda: defaultdict(set))
    total_processed = 0

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for state_code in STATES:
                cur.execute("""
                    SELECT text, source FROM raw_posts
                    WHERE state = %s AND DATE(ingested_at) = CURRENT_DATE
                """, (state_code,))
                rows = cur.fetchall()

                if not rows:
                    continue

                texts = [r["text"] for r in rows]
                sources = [r["source"] for r in rows]

                cleaned = clean_batch(texts)
                cleaned_texts = [c["cleaned"] for c in cleaned["cleaned"]]

                if not cleaned_texts:
                    continue

                token_result = tokenize_and_count(cleaned_texts)
                state_word_counts[state_code] = token_result["unigrams"]
                total_processed += len(cleaned_texts)

                # Track which sources mention each word
                for text, source in zip(texts, sources):
                    for word in token_result["unigrams"]:
                        if word.lower() in text.lower():
                            state_source_map[state_code][word].add(source)

                # Store ngrams
                ngram_data = []
                for ngram, freq in token_result["unigrams"].most_common(200):
                    ngram_data.append((state_code, ngram, "unigram", freq))
                for ngram, freq in token_result["bigrams"].most_common(100):
                    ngram_data.append((state_code, ngram, "bigram", freq))
                for ngram, freq in token_result["trigrams"].most_common(50):
                    ngram_data.append((state_code, ngram, "trigram", freq))

                execute_batch(cur, """
                    INSERT INTO state_ngrams (state, date, ngram, ngram_type, frequency)
                    VALUES (%s, CURRENT_DATE, %s, %s, %s)
                    ON CONFLICT (date, state, ngram, ngram_type)
                    DO UPDATE SET frequency = EXCLUDED.frequency
                """, ngram_data)

                logger.info(f"  {state_code}: {len(cleaned_texts)} texts → {token_result['total_tokens']} tokens")

    duration = time.time() - start
    log_pipeline_run("clean_and_tokenize", "success", total_processed, 0, duration)
    return state_word_counts, dict(state_source_map)


def run_sentiment():
    from pipeline.processing.sentiment_analyzer import (
        analyze_batch, aggregate_state_sentiment,
        store_sentiment_timeseries, detect_anomalies,
        get_historical_sentiment
    )

    start = time.time()
    sentiments_by_state_word = {}
    anomalies = []
    total = 0

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for state_code in STATES:
                cur.execute("""
                    SELECT text, source FROM raw_posts
                    WHERE state = %s AND DATE(ingested_at) = CURRENT_DATE
                """, (state_code,))
                rows = cur.fetchall()
                if not rows:
                    continue

                texts = [r["text"] for r in rows]
                sentiments = analyze_batch(texts)
                store_sentiment_timeseries(state_code, sentiments)

                agg = aggregate_state_sentiment(sentiments)
                total += len(sentiments)

                hist_means, hist_stds = get_historical_sentiment(state_code)
                state_anomalies = detect_anomalies(state_code, agg, hist_means, hist_stds)
                anomalies.extend(state_anomalies)

                for i, text in enumerate(texts):
                    words = text.lower().split()
                    for word in set(words):
                        key = (state_code, word)
                        if key not in sentiments_by_state_word:
                            sentiments_by_state_word[key] = sentiments[i]["compound"]

    # Store anomalies
    if anomalies:
        with get_connection() as conn:
            with get_cursor(conn) as cur:
                execute_batch(cur, """
                    INSERT INTO anomaly_log (state, date, anomaly_type, metric, value, baseline, z_score, description)
                    VALUES (%s, CURRENT_DATE, %s, %s, %s, %s, %s, %s)
                """, [(a["state"], a["anomaly_type"], a["metric"], a["value"],
                       a["baseline"], a["z_score"], a["description"]) for a in anomalies])

    duration = time.time() - start
    log_pipeline_run("sentiment_analysis", "success", total, 0, duration)
    return sentiments_by_state_word


def run_word_scoring(state_word_counts, state_source_map, sentiments):
    from pipeline.processing.word_scorer import score_all_states, store_word_scores, update_word_spread_log

    start = time.time()
    scored = score_all_states(state_word_counts, state_source_map, sentiments)
    stored = store_word_scores(scored)
    update_word_spread_log(state_word_counts)

    duration = time.time() - start
    log_pipeline_run("word_scoring", "success", stored, 0, duration)
    return scored


def update_daily_profiles(scored_words):
    from pipeline.processing.sentiment_analyzer import aggregate_state_sentiment

    start = time.time()
    profiles = defaultdict(dict)

    for w in scored_words:
        state = w["state"]
        if state not in profiles or w["distinctiveness_score"] > profiles[state].get("top_score", 0):
            profiles[state]["top_word"] = w["word"]
            profiles[state]["top_score"] = w["distinctiveness_score"]

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for state_code, profile in profiles.items():
                # Get sentiment for state
                cur.execute("""
                    SELECT AVG(compound_score) as avg, STDDEV(compound_score) as std
                    FROM state_sentiment_ts
                    WHERE state = %s AND DATE(measured_at) = CURRENT_DATE
                """, (state_code,))
                sent = cur.fetchone()

                sentiment_avg = float(sent["avg"]) if sent and sent["avg"] else 0
                sentiment_std = float(sent["std"]) if sent and sent["std"] else 0

                if sentiment_avg > 0.05:
                    dominant = "positive"
                elif sentiment_avg < -0.05:
                    dominant = "negative"
                else:
                    dominant = "neutral"

                # Get post volume
                cur.execute("""
                    SELECT COUNT(*) as vol FROM raw_posts
                    WHERE state = %s AND DATE(ingested_at) = CURRENT_DATE
                """, (state_code,))
                vol = cur.fetchone()

                cur.execute("""
                    INSERT INTO state_daily_profile
                        (state, date, top_word, dominant_sentiment, sentiment_avg, sentiment_std, post_volume)
                    VALUES (%s, CURRENT_DATE, %s, %s, %s, %s, %s)
                    ON CONFLICT (state, date) DO UPDATE SET
                        top_word = EXCLUDED.top_word,
                        dominant_sentiment = EXCLUDED.dominant_sentiment,
                        sentiment_avg = EXCLUDED.sentiment_avg,
                        sentiment_std = EXCLUDED.sentiment_std,
                        post_volume = EXCLUDED.post_volume
                """, (state_code, profile["top_word"], dominant, sentiment_avg,
                      sentiment_std, vol["vol"] if vol else 0))

    duration = time.time() - start
    log_pipeline_run("update_profiles", "success", len(profiles), 0, duration)


def refresh_materialized_views():
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for view in ["mv_state_tfidf_rankings", "mv_national_trending", "mv_regional_clusters"]:
                try:
                    cur.execute(f"REFRESH MATERIALIZED VIEW {view}")
                    logger.info(f"  Refreshed {view}")
                except Exception as e:
                    logger.error(f"  Failed to refresh {view}: {e}")


def invalidate_cache():
    import redis as redis_lib
    from pipeline.config import REDIS_URL

    r = redis_lib.from_url(REDIS_URL)
    keys = r.keys("api:*")
    if keys:
        r.delete(*keys)
        logger.info(f"  Invalidated {len(keys)} cache keys")


def run_full_pipeline():
    """Execute the complete daily pipeline."""
    logger.info("=" * 60)
    logger.info("LINGUAMAP DAILY PIPELINE START")
    logger.info("=" * 60)

    pipeline_start = time.time()

    # Step 1: Ingestion
    logger.info("\n[1/8] Running data ingestion...")
    ingestion_results = run_ingestion()

    # Step 2: Clean & Tokenize
    logger.info("\n[2/8] Cleaning and tokenizing...")
    state_word_counts, state_source_map = run_cleaning_and_tokenization()

    # Step 3: Sentiment
    logger.info("\n[3/8] Running sentiment analysis...")
    sentiments = run_sentiment()

    # Step 4: Word scoring
    logger.info("\n[4/8] Scoring words (TF-IDF + spread + novelty)...")
    scored = run_word_scoring(state_word_counts, state_source_map, sentiments)

    # Step 5: Entity extraction
    logger.info("\n[5/8] Extracting named entities...")
    from pipeline.processing.entity_extractor import run_entity_extraction
    run_entity_extraction()

    # Step 6: Topic modeling (weekly)
    logger.info("\n[6/8] Topic modeling (weekly check)...")
    from pipeline.processing.topic_modeler import run_weekly_topic_modeling
    run_weekly_topic_modeling()

    # Step 7: Update profiles & clustering
    logger.info("\n[7/8] Updating state profiles and clusters...")
    update_daily_profiles(scored)
    from pipeline.analysis.regional_clustering import run_clustering
    run_clustering()

    # Step 8: Refresh views & cache
    logger.info("\n[8/8] Refreshing materialized views and cache...")
    refresh_materialized_views()
    invalidate_cache()

    total_duration = time.time() - pipeline_start
    log_pipeline_run("full_pipeline", "success", 0, 0, total_duration,
                     {"ingestion": ingestion_results})

    logger.info(f"\nPIPELINE COMPLETE in {total_duration:.1f}s")
    logger.info("=" * 60)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run_full_pipeline()
