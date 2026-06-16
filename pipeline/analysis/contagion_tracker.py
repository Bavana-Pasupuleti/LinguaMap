import logging
from collections import defaultdict
from pipeline.db import get_connection, get_cursor

logger = logging.getLogger(__name__)


def get_word_spread_history(word, days=30):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT state, date, frequency, distinctiveness_score
                FROM state_word_daily
                WHERE word = %s
                  AND date >= CURRENT_DATE - INTERVAL '%s days'
                ORDER BY date ASC, frequency DESC
            """, (word, days))
            rows = cur.fetchall()

    timeline = defaultdict(list)
    for row in rows:
        timeline[str(row["date"])].append({
            "state": row["state"],
            "frequency": row["frequency"],
            "distinctiveness": row["distinctiveness_score"],
        })

    return dict(timeline)


def find_origin_state(word):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT first_seen_state, first_seen_date,
                       states_reached, spread_velocity
                FROM word_spread_log
                WHERE word = %s
            """, (word,))
            return cur.fetchone()


def get_active_contagions(min_states=3, days=14):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT word, states_reached, spread_velocity,
                       first_seen_state, first_seen_date
                FROM word_spread_log
                WHERE array_length(states_reached, 1) >= %s
                  AND first_seen_date >= CURRENT_DATE - INTERVAL '%s days'
                ORDER BY spread_velocity DESC
                LIMIT 20
            """, (min_states, days))
            return cur.fetchall()


def compute_spread_trajectory(word, days=30):
    history = get_word_spread_history(word, days)
    if not history:
        return None

    trajectory = []
    cumulative_states = set()

    for date_str in sorted(history.keys()):
        states_today = [s["state"] for s in history[date_str]]
        cumulative_states.update(states_today)

        trajectory.append({
            "date": date_str,
            "new_states": states_today,
            "cumulative_count": len(cumulative_states),
            "total_frequency": sum(s["frequency"] for s in history[date_str]),
        })

    return {
        "word": word,
        "trajectory": trajectory,
        "total_states_reached": len(cumulative_states),
        "states_list": sorted(cumulative_states),
    }


def get_top_spreading_words(limit=10):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT word,
                       array_length(states_reached, 1) as num_states,
                       spread_velocity,
                       first_seen_state,
                       first_seen_date
                FROM word_spread_log
                WHERE spread_velocity > 0
                ORDER BY spread_velocity DESC
                LIMIT %s
            """, (limit,))
            return cur.fetchall()
