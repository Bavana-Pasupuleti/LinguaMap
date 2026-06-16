import logging
from collections import defaultdict
from pipeline.db import get_connection, get_cursor

logger = logging.getLogger(__name__)


def compute_word_turnover(state, weeks=4):
    """
    How fast are a state's top words turning over week-over-week?
    High turnover = culturally volatile; low = linguistically stable.
    """
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT date, word, distinctiveness_score
                FROM state_word_daily
                WHERE state = %s
                  AND date >= CURRENT_DATE - INTERVAL '%s weeks'
                  AND distinctiveness_score > 0
                ORDER BY date, distinctiveness_score DESC
            """, (state, weeks))
            rows = cur.fetchall()

    weekly_tops = defaultdict(set)
    for row in rows:
        week_key = row["date"].isocalendar()[1]
        if len(weekly_tops[week_key]) < 10:
            weekly_tops[week_key].add(row["word"])

    sorted_weeks = sorted(weekly_tops.keys())
    if len(sorted_weeks) < 2:
        return {"turnover_rate": 0, "weeks_analyzed": 0}

    turnovers = []
    for i in range(1, len(sorted_weeks)):
        prev = weekly_tops[sorted_weeks[i - 1]]
        curr = weekly_tops[sorted_weeks[i]]
        if prev and curr:
            overlap = len(prev & curr) / max(len(prev), len(curr))
            turnovers.append(1 - overlap)

    return {
        "turnover_rate": sum(turnovers) / len(turnovers) if turnovers else 0,
        "weeks_analyzed": len(sorted_weeks),
        "weekly_turnovers": turnovers,
    }


def get_all_state_drift_rates():
    from pipeline.config import STATES

    results = []
    for state_code in STATES:
        drift = compute_word_turnover(state_code)
        results.append({
            "state": state_code,
            "drift_rate": drift["turnover_rate"],
            "weeks_analyzed": drift["weeks_analyzed"],
        })

    return sorted(results, key=lambda x: x["drift_rate"], reverse=True)


def detect_drift_anomalies(threshold=0.8):
    drift_rates = get_all_state_drift_rates()
    return [d for d in drift_rates if d["drift_rate"] > threshold]
