import time
import logging
import re
from collections import Counter
import wikipediaapi
from pipeline.config import STATES
from pipeline.db import get_connection, get_cursor, execute_batch, log_pipeline_run

logger = logging.getLogger(__name__)

STOPWORDS = set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
    "neither", "each", "every", "all", "any", "few", "more", "most", "other",
    "some", "such", "no", "only", "own", "same", "than", "too", "very",
    "just", "because", "if", "when", "where", "how", "what", "which", "who",
    "whom", "this", "that", "these", "those", "it", "its", "he", "she",
    "they", "them", "his", "her", "their", "we", "us", "our", "you", "your",
    "i", "me", "my", "also", "about", "up", "there", "here", "while",
    "since", "until", "although", "though", "state", "united", "states",
    "county", "city", "area", "population", "census", "according",
    "first", "new", "one", "two", "three", "many", "much", "well", "part",
    "known", "including", "located", "became", "however", "several",
])


def fetch_state_article(state_name):
    wiki = wikipediaapi.Wikipedia(
        language='en',
        user_agent='LinguaMap/1.0 (linguistic research project)'
    )
    page = wiki.page(state_name)
    if not page.exists():
        page = wiki.page(f"{state_name} (U.S. state)")
    if not page.exists():
        return None
    return page.text


def extract_top_words(text, top_n=200):
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    filtered = [w for w in words if w not in STOPWORDS and len(w) > 2]
    return Counter(filtered).most_common(top_n)


def run_wikipedia_baseline():
    start_time = time.time()
    total = 0
    errors = 0

    logger.info("Starting Wikipedia baseline extraction")

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for state_code, state_info in STATES.items():
                try:
                    text = fetch_state_article(state_info["name"])
                    if not text:
                        logger.warning(f"  {state_code}: No Wikipedia article found")
                        errors += 1
                        continue

                    top_words = extract_top_words(text, top_n=200)

                    cur.execute("DELETE FROM state_baseline WHERE state = %s", (state_code,))
                    data = [(state_code, word, freq, "now()") for word, freq in top_words]
                    execute_batch(cur, """
                        INSERT INTO state_baseline (state, word, frequency, last_refreshed)
                        VALUES (%s, %s, %s, CURRENT_DATE)
                    """, data)

                    total += len(top_words)
                    logger.info(f"  {state_code}: {len(top_words)} baseline words stored")

                    time.sleep(1)  # polite crawling
                except Exception as e:
                    errors += 1
                    logger.error(f"  {state_code}: FAILED - {e}")

    duration = time.time() - start_time
    log_pipeline_run("wikipedia_baseline", "success" if errors == 0 else "partial", total, errors, duration)
    logger.info(f"Wikipedia baseline complete: {total} words, {errors} errors, {duration:.1f}s")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_wikipedia_baseline()
