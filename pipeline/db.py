import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from pipeline.config import DATABASE_URL


@contextmanager
def get_connection():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@contextmanager
def get_cursor(conn=None):
    if conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            yield cursor
        finally:
            cursor.close()
    else:
        with get_connection() as conn:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            try:
                yield cursor
            finally:
                cursor.close()


def execute_batch(cursor, query, data, page_size=1000):
    psycopg2.extras.execute_batch(cursor, query, data, page_size=page_size)


def log_pipeline_run(task_name, status, rows_processed=0, errors=0, duration=0, metadata=None):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                INSERT INTO pipeline_runs (run_date, task_name, status, rows_processed, errors, duration_seconds, metadata, started_at)
                VALUES (CURRENT_DATE, %s, %s, %s, %s, %s, %s, NOW())
            """, (task_name, status, rows_processed, errors, duration, psycopg2.extras.Json(metadata or {})))
