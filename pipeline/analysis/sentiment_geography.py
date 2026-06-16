import logging
from pipeline.db import get_connection, get_cursor

logger = logging.getLogger(__name__)


def get_sentiment_heatmap(days=30):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT state, DATE(measured_at) as date,
                       AVG(compound_score) as avg_sentiment,
                       COUNT(*) as sample_size
                FROM state_sentiment_ts
                WHERE measured_at >= NOW() - INTERVAL '%s days'
                GROUP BY state, DATE(measured_at)
                ORDER BY state, date
            """, (days,))
            return cur.fetchall()


def get_persistent_sentiment_clusters():
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT state,
                       AVG(compound_score) as avg_sentiment,
                       STDDEV(compound_score) as sentiment_volatility,
                       COUNT(*) as data_points
                FROM state_sentiment_ts
                WHERE measured_at >= NOW() - INTERVAL '30 days'
                GROUP BY state
                HAVING COUNT(*) >= 10
                ORDER BY avg_sentiment DESC
            """)
            return cur.fetchall()


def get_state_sentiment_trend(state, days=30):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT DATE(measured_at) as date,
                       AVG(compound_score) as compound,
                       AVG(positive_ratio) as positive,
                       AVG(negative_ratio) as negative,
                       AVG(subjectivity) as subjectivity,
                       COUNT(*) as sample_size
                FROM state_sentiment_ts
                WHERE state = %s
                  AND measured_at >= NOW() - INTERVAL '%s days'
                GROUP BY DATE(measured_at)
                ORDER BY date
            """, (state, days))
            return cur.fetchall()
