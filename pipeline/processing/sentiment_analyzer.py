import logging
import numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
from pipeline.db import get_connection, get_cursor, execute_batch, log_pipeline_run

logger = logging.getLogger(__name__)

vader = SentimentIntensityAnalyzer()


def analyze_sentiment(text):
    vader_scores = vader.polarity_scores(text)
    blob = TextBlob(text)

    return {
        "compound": vader_scores["compound"],
        "positive": vader_scores["pos"],
        "negative": vader_scores["neg"],
        "neutral": vader_scores["neu"],
        "subjectivity": blob.sentiment.subjectivity,
    }


def analyze_batch(texts):
    results = []
    for text in texts:
        try:
            result = analyze_sentiment(text)
            results.append(result)
        except Exception as e:
            logger.warning(f"Sentiment analysis failed for text: {e}")
            results.append({
                "compound": 0, "positive": 0, "negative": 0,
                "neutral": 1, "subjectivity": 0
            })
    return results


def aggregate_state_sentiment(sentiments):
    if not sentiments:
        return {
            "compound_mean": 0, "compound_median": 0, "compound_std": 0,
            "positive_ratio": 0, "negative_ratio": 0, "neutral_ratio": 0,
            "subjectivity_mean": 0,
            "dominant": "neutral",
        }

    compounds = [s["compound"] for s in sentiments]
    positives = [s["positive"] for s in sentiments]
    negatives = [s["negative"] for s in sentiments]
    neutrals = [s["neutral"] for s in sentiments]
    subjectivities = [s["subjectivity"] for s in sentiments]

    mean_compound = float(np.mean(compounds))
    if mean_compound > 0.05:
        dominant = "positive"
    elif mean_compound < -0.05:
        dominant = "negative"
    else:
        dominant = "neutral"

    return {
        "compound_mean": mean_compound,
        "compound_median": float(np.median(compounds)),
        "compound_std": float(np.std(compounds)),
        "positive_ratio": float(np.mean(positives)),
        "negative_ratio": float(np.mean(negatives)),
        "neutral_ratio": float(np.mean(neutrals)),
        "subjectivity_mean": float(np.mean(subjectivities)),
        "dominant": dominant,
    }


def detect_anomalies(state, current_agg, historical_means, historical_stds):
    anomalies = []
    compound = current_agg["compound_mean"]

    if historical_means and historical_stds:
        hist_mean = historical_means.get("compound_mean", 0)
        hist_std = historical_stds.get("compound_std", 0.1)

        if hist_std > 0:
            z_score = (compound - hist_mean) / hist_std
            if abs(z_score) > 2:
                anomalies.append({
                    "state": state,
                    "anomaly_type": "sentiment_spike",
                    "metric": "compound_sentiment",
                    "value": compound,
                    "baseline": hist_mean,
                    "z_score": z_score,
                    "description": f"Sentiment {'surge' if z_score > 0 else 'drop'}: {compound:.3f} vs 30-day avg {hist_mean:.3f} (z={z_score:.2f})"
                })

    return anomalies


def store_sentiment_timeseries(state, sentiments, source=None):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            data = [
                (state, s["compound"], s["positive"], s["negative"],
                 s["neutral"], s["subjectivity"], source)
                for s in sentiments
            ]
            execute_batch(cur, """
                INSERT INTO state_sentiment_ts
                    (state, measured_at, compound_score, positive_ratio,
                     negative_ratio, neutral_ratio, subjectivity, source)
                VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s)
            """, data)


def get_historical_sentiment(state, days=30):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT
                    AVG(compound_score) as compound_mean,
                    STDDEV(compound_score) as compound_std
                FROM state_sentiment_ts
                WHERE state = %s
                  AND measured_at > NOW() - INTERVAL '%s days'
            """, (state, days))
            row = cur.fetchone()
            if row and row["compound_mean"] is not None:
                return (
                    {"compound_mean": float(row["compound_mean"])},
                    {"compound_std": float(row["compound_std"] or 0.1)}
                )
            return None, None
