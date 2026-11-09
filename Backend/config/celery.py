"""Celery application for Logistimus background tasks."""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("logistimus")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Long-running work must never run inside HTTP request handlers (see
# docs/backend/API_SPECIFICATION.md). JSON only, idempotency-friendly defaults.
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    result_expires=3600 * 24,
    broker_connection_retry_on_startup=True,
    task_default_retry_delay=30,
    task_annotations={"*": {"max_retries": 5}},
)


@app.task(bind=True, ignore_result=True)
def debug_task(self):  # pragma: no cover
    print(f"Request: {self.request!r}")
