"""
Canonical Celery application instance.

All task modules and configuration live here. Other modules should
import `celery_app` from this module.
"""
from celery import Celery
from app.core.config import settings

from celery.schedules import crontab

celery_app = Celery(
    "xinghe_zhi_an",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.attack_task", "app.workers.cleanup_tasks"],
)

celery_app.conf.beat_schedule = {
    "cleanup-old-task-files-daily": {
        "task": "app.workers.cleanup_tasks.cleanup_old_task_files",
        "schedule": crontab(hour=2, minute=0),  # Runs daily at 2:00 AM
    },
}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    task_acks_late=True,
    result_expires=3600,
    task_soft_time_limit=1800,
    task_time_limit=1900,
    worker_send_task_events=True,
    task_send_sent_event=True,
)
