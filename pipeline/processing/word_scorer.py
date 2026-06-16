import logging
import math
from collections import Counter, defaultdict
from datetime import date, timedelta
from pipeline.db import get_connection, get_cursor, execute_batch

logger = logging.getLogger(__name__)


def compute_tfidf(state_word_counts):
    """
    Compute TF-IDF where each state is a "document" and the corpus
    is all states. Words that are common everywhere get low scores;
    words distinctive to one state get high scores.
    """
    num_states = len(state_word_counts)
    if num_states == 0:
        return {}

    doc_freq = Counter()
    for state, counts in state_word_counts.items():
        for word in counts:
            doc_freq[word] += 1

    tfidf = {}
    for state, counts in state_word_counts.items():
        total_words = sum(counts.values())
        if total_words == 0:
            continue

        tfidf[state] = {}
        for word, count in counts.items():
            tf = count / total_words
            idf = math.log(num_states / (1 + doc_freq[word]))
            tfidf[state][word] = tf * idf

    return tfidf


def compute_spread_score(word, state_source_map):
    """
    Spread score: how many distinct sources (reddit, mastodon, news)
    mention this word across how many states.
    Multi-source = higher spread = more culturally significant.
    """
    sources = set()
    states = set()

    for state, source_data in state_source_map.items():
        if word in source_data:
            states.add(state)
            sources.update(source_data[word])

    source_factor = len(sources) / 3.0  # max 3 sources
    state_factor = min(len(states) / 10.0, 1.0)  # normalize to 10 states

    return source_factor * 0.6 + state_factor * 0.4


def compute_novelty_score(word, state, current_date):
    """
    Check if this word appeared for the first time in the last 7 days.
    """
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT MIN(date) as first_seen
                FROM state_word_daily
                WHERE word = %s AND state = %s
            """, (word, state))
            row = cur.fetchone()

            if not row or not row["first_seen"]:
                return 1.0  # brand new word

            first_seen = row["first_seen"]
            days_since = (current_date - first_seen).days

            if days_since <= 7:
                return max(0, 1.0 - (days_since / 7.0))
            return 0.0


def compute_drift_score(word, state, current_freq, days=30):
    """
    How much has this word's frequency changed compared to its 30-day rolling average?
    """
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT AVG(frequency) as avg_freq, STDDEV(frequency) as std_freq
                FROM state_word_daily
                WHERE word = %s AND state = %s
                  AND date >= CURRENT_DATE - INTERVAL '%s days'
                  AND date < CURRENT_DATE
            """, (word, state, days))
            row = cur.fetchone()

            if not row or not row["avg_freq"] or row["avg_freq"] == 0:
                return 0.0

            avg = float(row["avg_freq"])
            std = float(row["std_freq"] or 1.0)
            if std == 0:
                std = 1.0

            return (current_freq - avg) / std


def compute_distinctiveness(tfidf_score, spread_score, novelty_score, drift_score=0):
    """
    Weighted combination of all scoring factors.
    TF-IDF is the primary signal; spread and novelty add depth.
    """
    return (
        tfidf_score * 0.40 +
        spread_score * 0.20 +
        novelty_score * 0.25 +
        max(0, drift_score * 0.05) * 0.15
    )


def score_all_states(state_word_counts, state_source_map, sentiments_by_state_word):
    """
    Full scoring pipeline: TF-IDF + spread + novelty + distinctiveness.
    Returns scored word dicts ready for DB insertion.
    """
    today = date.today()
    tfidf = compute_tfidf(state_word_counts)
    scored = []

    for state, word_scores in tfidf.items():
        top_words = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)[:100]

        for word, tfidf_score in top_words:
            freq = state_word_counts[state].get(word, 0)
            spread = compute_spread_score(word, state_source_map)

            novelty = 1.0 if freq > 0 else 0.0  # batch novelty check below
            sentiment = sentiments_by_state_word.get((state, word), 0.0)

            distinctiveness = compute_distinctiveness(tfidf_score, spread, novelty)

            scored.append({
                "state": state,
                "date": today,
                "word": word,
                "frequency": freq,
                "tfidf_score": tfidf_score,
                "sentiment_avg": sentiment,
                "spread_score": spread,
                "novelty_score": novelty,
                "distinctiveness_score": distinctiveness,
            })

    return scored


def store_word_scores(scored_words):
    if not scored_words:
        return 0

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            data = [
                (w["state"], w["date"], w["word"], w["frequency"],
                 w["tfidf_score"], w["sentiment_avg"], w["spread_score"],
                 w["novelty_score"], w["distinctiveness_score"])
                for w in scored_words
            ]
            execute_batch(cur, """
                INSERT INTO state_word_daily
                    (state, date, word, frequency, tfidf_score, sentiment_avg,
                     spread_score, novelty_score, distinctiveness_score)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (date, state, word)
                DO UPDATE SET
                    frequency = EXCLUDED.frequency,
                    tfidf_score = EXCLUDED.tfidf_score,
                    sentiment_avg = EXCLUDED.sentiment_avg,
                    spread_score = EXCLUDED.spread_score,
                    novelty_score = EXCLUDED.novelty_score,
                    distinctiveness_score = EXCLUDED.distinctiveness_score
            """, data)

    return len(scored_words)


def update_word_spread_log(state_word_counts):
    today = date.today()

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            all_words = set()
            for counts in state_word_counts.values():
                all_words.update(counts.keys())

            for word in all_words:
                states_with_word = [
                    s for s, counts in state_word_counts.items()
                    if word in counts and counts[word] > 0
                ]
                if not states_with_word:
                    continue

                cur.execute("""
                    INSERT INTO word_spread_log (word, first_seen_state, first_seen_date, states_reached, updated_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    ON CONFLICT (word) DO UPDATE SET
                        states_reached = %s,
                        spread_velocity = (
                            array_length(%s::text[], 1)::float /
                            GREATEST(1, EXTRACT(DAY FROM NOW() - word_spread_log.first_seen_date::timestamp))
                        ),
                        updated_at = NOW()
                """, (
                    word, states_with_word[0], today, states_with_word,
                    states_with_word, states_with_word
                ))
