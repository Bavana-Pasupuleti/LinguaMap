import logging
from collections import Counter
import spacy
from pipeline.db import get_connection, get_cursor, execute_batch, log_pipeline_run

logger = logging.getLogger(__name__)

nlp = None


def get_nlp():
    global nlp
    if nlp is None:
        nlp = spacy.load("en_core_web_sm", disable=["tagger", "parser", "lemmatizer"])
    return nlp


ENTITY_TYPES = {"PERSON", "ORG", "GPE", "EVENT", "WORK_OF_ART", "FAC", "NORP", "LOC"}


def extract_entities(texts, batch_size=100):
    model = get_nlp()
    entity_counts = Counter()

    for doc in model.pipe(texts, batch_size=batch_size):
        for ent in doc.ents:
            if ent.label_ in ENTITY_TYPES and len(ent.text) > 1:
                entity_counts[(ent.text.strip(), ent.label_)] += 1

    return entity_counts


def extract_and_store(state, texts, source=None):
    if not texts:
        return 0

    entity_counts = extract_entities(texts)

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            data = [
                (state, entity_text, entity_type, count, source)
                for (entity_text, entity_type), count in entity_counts.most_common(100)
            ]
            execute_batch(cur, """
                INSERT INTO state_entities (state, date, entity_text, entity_type, frequency, source)
                VALUES (%s, CURRENT_DATE, %s, %s, %s, %s)
                ON CONFLICT (state, date, entity_text, entity_type)
                DO UPDATE SET frequency = state_entities.frequency + EXCLUDED.frequency
            """, data)

    return len(data)


def run_entity_extraction():
    from pipeline.config import STATES
    import time

    start = time.time()
    total = 0
    errors = 0

    logger.info("Starting entity extraction")

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for state_code in STATES:
                try:
                    cur.execute("""
                        SELECT text, source FROM raw_posts
                        WHERE state = %s AND DATE(ingested_at) = CURRENT_DATE
                    """, (state_code,))
                    rows = cur.fetchall()

                    if not rows:
                        continue

                    texts = [r["text"] for r in rows]
                    count = extract_and_store(state_code, texts)
                    total += count
                    logger.info(f"  {state_code}: {count} entities extracted")
                except Exception as e:
                    errors += 1
                    logger.error(f"  {state_code}: entity extraction failed - {e}")

    duration = time.time() - start
    log_pipeline_run("entity_extraction", "success" if errors == 0 else "partial", total, errors, duration)
    return total


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_entity_extraction()
