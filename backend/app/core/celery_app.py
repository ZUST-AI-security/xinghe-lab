"""
Canonical Celery application instance.

All task modules and configuration live here. Other modules should
import `celery_app` from this module.

队列配置（自适应资源分配，Requirement 11）：
  high    — FGSM 等单步算法，高优先级
  default — I-FGSM、PGD 等迭代算法，中优先级
  low     — C&W、DeepFool 等优化算法，低优先级

Worker 消费比例：high:default:low = 4:2:1
启动命令：celery -A app.workers.celery_app worker --queues=high,default,low --concurrency=1 -O fair
"""
from celery import Celery
from kombu import Queue, Exchange
from app.core.config import settings

from celery.schedules import crontab

celery_app = Celery(
    "xinghe_zhi_an",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.attack_task",
        "app.workers.cleanup_tasks",
        "app.workers.robustness_task",
    ],
)

celery_app.conf.beat_schedule = {
    "cleanup-old-task-files-daily": {
        "task": "app.workers.cleanup_tasks.cleanup_old_task_files",
        "schedule": crontab(hour=2, minute=0),  # Runs daily at 2:00 AM
    },
}

# 定义三个优先级队列
_default_exchange = Exchange("default", type="direct")

celery_app.conf.task_queues = (
    Queue("high",    _default_exchange, routing_key="high"),
    Queue("default", _default_exchange, routing_key="default"),
    Queue("low",     _default_exchange, routing_key="low"),
)

# 默认队列（未指定 queue 时使用）
celery_app.conf.task_default_queue = "default"
celery_app.conf.task_default_exchange = "default"
celery_app.conf.task_default_routing_key = "default"

# 任务路由：攻击任务默认走 default 队列，
# 实际队列由 API 层通过 apply_async(queue=queue_name) 覆盖
celery_app.conf.task_routes = {
    "app.workers.attack_task.run_attack": {"queue": "default"},
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
