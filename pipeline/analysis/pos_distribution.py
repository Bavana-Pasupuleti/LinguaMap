import logging
from collections import defaultdict
from pipeline.db import get_connection, get_cursor

logger = logging.getLogger(__name__)


def get_state_pos_distribution(state, days=7):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT pos_tag, SUM(frequency) as total
                FROM state_word_daily
                WHERE state = %s
                  AND date >= CURRENT_DATE - INTERVAL '%s days'
                  AND pos_tag IS NOT NULL
                GROUP BY pos_tag
                ORDER BY total DESC
            """, (state, days))
            rows = cur.fetchall()

    total = sum(r["total"] for r in rows)
    if total == 0:
        return {}

    return {
        row["pos_tag"]: {
            "count": row["total"],
            "ratio": row["total"] / total
        }
        for row in rows
    }


def get_all_states_pos():
    from pipeline.config import STATES

    results = {}
    for state_code in STATES:
        dist = get_state_pos_distribution(state_code)
        if dist:
            results[state_code] = dist
    return results


def classify_state_orientation(pos_dist):
    """
    Noun-heavy = thing-oriented
    Verb-heavy = action-oriented
    Adj-heavy = evaluation-oriented
    """
    noun_ratio = pos_dist.get("NOUN", {}).get("ratio", 0)
    verb_ratio = pos_dist.get("VERB", {}).get("ratio", 0)
    adj_ratio = pos_dist.get("ADJ", {}).get("ratio", 0)

    max_ratio = max(noun_ratio, verb_ratio, adj_ratio)

    if max_ratio == noun_ratio:
        return "thing-oriented"
    elif max_ratio == verb_ratio:
        return "action-oriented"
    else:
        return "evaluation-oriented"


def get_orientation_map():
    all_pos = get_all_states_pos()
    return {
        state: classify_state_orientation(dist)
        for state, dist in all_pos.items()
    }
