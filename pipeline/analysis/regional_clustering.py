import logging
import numpy as np
from collections import defaultdict
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from pipeline.db import get_connection, get_cursor, execute_batch, log_pipeline_run
from pipeline.config import STATES

logger = logging.getLogger(__name__)

CENSUS_REGIONS = {
    "Northeast": ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
    "Midwest": ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"],
    "South": ["DE", "FL", "GA", "MD", "NC", "SC", "VA", "WV", "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX"],
    "West": ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY", "AK", "CA", "HI", "OR", "WA"],
}


def build_state_word_vectors():
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT state, word, tfidf_score
                FROM state_word_daily
                WHERE date = CURRENT_DATE AND tfidf_score > 0
                ORDER BY state, tfidf_score DESC
            """)
            rows = cur.fetchall()

    state_docs = defaultdict(list)
    for row in rows:
        state_docs[row["state"]].append(f"{row['word']}:{row['tfidf_score']:.4f}")

    state_texts = {}
    for state, words in state_docs.items():
        state_texts[state] = " ".join(w.split(":")[0] for w in words[:50])

    return state_texts


def cluster_states(n_clusters=6):
    state_texts = build_state_word_vectors()
    if len(state_texts) < n_clusters:
        logger.warning(f"Only {len(state_texts)} states have data, need {n_clusters}")
        return []

    states = sorted(state_texts.keys())
    texts = [state_texts[s] for s in states]

    vectorizer = TfidfVectorizer(max_features=500)
    tfidf_matrix = vectorizer.fit_transform(texts)

    sim_matrix = cosine_similarity(tfidf_matrix)

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(tfidf_matrix)

    cluster_labels = {}
    for cluster_id in range(n_clusters):
        cluster_states_list = [states[i] for i, l in enumerate(labels) if l == cluster_id]
        matching_region = _find_closest_region(cluster_states_list)
        cluster_labels[cluster_id] = matching_region or f"Cluster {cluster_id + 1}"

    results = []
    for i, state in enumerate(states):
        cluster_id = int(labels[i])
        centroid_sim = float(1 - np.linalg.norm(
            tfidf_matrix[i].toarray() - kmeans.cluster_centers_[cluster_id]
        ))

        results.append({
            "state": state,
            "cluster_id": cluster_id,
            "cluster_label": cluster_labels[cluster_id],
            "similarity_score": max(0, centroid_sim),
        })

    return results


def _find_closest_region(cluster_states):
    best_match = None
    best_overlap = 0

    for region, region_states in CENSUS_REGIONS.items():
        overlap = len(set(cluster_states) & set(region_states))
        if overlap > best_overlap:
            best_overlap = overlap
            best_match = region

    if best_overlap >= len(cluster_states) * 0.5:
        return f"Linguistic {best_match}"
    return None


def store_clusters(clusters):
    if not clusters:
        return

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            data = [
                (c["state"], c["cluster_id"], c["cluster_label"], c["similarity_score"])
                for c in clusters
            ]
            execute_batch(cur, """
                INSERT INTO regional_clusters (state, date, cluster_id, cluster_label, similarity_score)
                VALUES (%s, CURRENT_DATE, %s, %s, %s)
                ON CONFLICT (state, date)
                DO UPDATE SET cluster_id = EXCLUDED.cluster_id,
                              cluster_label = EXCLUDED.cluster_label,
                              similarity_score = EXCLUDED.similarity_score
            """, data)


def run_clustering():
    logger.info("Running regional linguistic clustering")
    clusters = cluster_states(n_clusters=6)
    store_clusters(clusters)
    logger.info(f"Stored {len(clusters)} state cluster assignments")
    return clusters


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_clustering()
