from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    "owner": "linguamap",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

dag = DAG(
    "linguamap_daily_pipeline",
    default_args=default_args,
    description="Daily linguistic data ingestion and analysis pipeline",
    schedule_interval="0 3 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["linguamap", "nlp", "data-pipeline"],
)


def task_ingest_reddit():
    from pipeline.ingestion.reddit_ingestor import run_reddit_ingestion
    return run_reddit_ingestion()


def task_ingest_mastodon():
    from pipeline.ingestion.mastodon_ingestor import run_mastodon_ingestion
    return run_mastodon_ingestion()


def task_ingest_news():
    from pipeline.ingestion.news_ingestor import run_news_ingestion
    return run_news_ingestion()


def task_clean_and_tokenize():
    from pipeline.orchestrator import run_cleaning_and_tokenization
    return run_cleaning_and_tokenization()


def task_sentiment():
    from pipeline.orchestrator import run_sentiment
    return run_sentiment()


def task_word_scoring(**context):
    from pipeline.orchestrator import run_word_scoring
    ti = context["ti"]
    state_word_counts, state_source_map = ti.xcom_pull(task_ids="clean_and_tokenize")
    sentiments = ti.xcom_pull(task_ids="run_sentiment")
    return run_word_scoring(state_word_counts, state_source_map, sentiments)


def task_entity_extraction():
    from pipeline.processing.entity_extractor import run_entity_extraction
    return run_entity_extraction()


def task_topic_modeling():
    from pipeline.processing.topic_modeler import run_weekly_topic_modeling
    return run_weekly_topic_modeling()


def task_update_profiles(**context):
    from pipeline.orchestrator import update_daily_profiles
    ti = context["ti"]
    scored = ti.xcom_pull(task_ids="run_word_scoring")
    update_daily_profiles(scored)


def task_detect_anomalies():
    from pipeline.analysis.linguistic_drift import detect_drift_anomalies
    return detect_drift_anomalies()


def task_refresh_views():
    from pipeline.orchestrator import refresh_materialized_views
    refresh_materialized_views()


def task_invalidate_cache():
    from pipeline.orchestrator import invalidate_cache
    invalidate_cache()


def task_clustering():
    from pipeline.analysis.regional_clustering import run_clustering
    run_clustering()


def task_health_report(**context):
    from pipeline.db import log_pipeline_run
    log_pipeline_run("daily_pipeline_complete", "success", metadata={"dag_run": str(context.get("run_id"))})


ingest_reddit = PythonOperator(task_id="ingest_reddit", python_callable=task_ingest_reddit, dag=dag)
ingest_mastodon = PythonOperator(task_id="ingest_mastodon", python_callable=task_ingest_mastodon, dag=dag)
ingest_news = PythonOperator(task_id="ingest_news", python_callable=task_ingest_news, dag=dag)

clean_and_tokenize = PythonOperator(task_id="clean_and_tokenize", python_callable=task_clean_and_tokenize, dag=dag)
run_sentiment = PythonOperator(task_id="run_sentiment", python_callable=task_sentiment, dag=dag)
run_word_scoring = PythonOperator(task_id="run_word_scoring", python_callable=task_word_scoring, provide_context=True, dag=dag)
entity_extraction = PythonOperator(task_id="entity_extraction", python_callable=task_entity_extraction, dag=dag)
topic_modeling = PythonOperator(task_id="topic_modeling", python_callable=task_topic_modeling, dag=dag)
update_profiles = PythonOperator(task_id="update_profiles", python_callable=task_update_profiles, provide_context=True, dag=dag)
detect_anomalies = PythonOperator(task_id="detect_anomalies", python_callable=task_detect_anomalies, dag=dag)
clustering = PythonOperator(task_id="clustering", python_callable=task_clustering, dag=dag)
refresh_views = PythonOperator(task_id="refresh_views", python_callable=task_refresh_views, dag=dag)
invalidate_cache = PythonOperator(task_id="invalidate_cache", python_callable=task_invalidate_cache, dag=dag)
health_report = PythonOperator(task_id="health_report", python_callable=task_health_report, provide_context=True, dag=dag)

# DAG dependencies
[ingest_reddit, ingest_mastodon, ingest_news] >> clean_and_tokenize
clean_and_tokenize >> run_sentiment
run_sentiment >> run_word_scoring
run_word_scoring >> [entity_extraction, topic_modeling]
[entity_extraction, topic_modeling] >> update_profiles
update_profiles >> detect_anomalies
detect_anomalies >> clustering
clustering >> refresh_views
refresh_views >> invalidate_cache
invalidate_cache >> health_report
