"""
星河智安 (XingHe ZhiAn) - Celery应用配置
异步任务队列配置，用于处理耗时的攻击算法
"""

from celery import Celery
from ..core.config import settings

# 创建Celery应用
celery_app = Celery(
    "xinghe_zhi_an",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks.cw_task"]
)

# Celery配置
celery_app.conf.update(
    # 任务配置
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # 任务路由
    task_routes={
        "app.workers.tasks.cw_task.run_cw_attack": {"queue": "attack_tasks"},
    },
    
    # 任务优先级
    task_default_priority=5,
    worker_prefetch_multiplier=1,
    
    # 结果过期时间
    result_expires=3600,  # 1小时
    
    # 任务超时配置
    task_soft_time_limit=1800,  # 30分钟软超时
    task_time_limit=1900,       # 31分钟硬超时
    
    # 重试配置
    task_acks_late=True,
    worker_disable_rate_limits=False,
    
    # 监控配置
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# 定期任务配置
celery_app.conf.beat_schedule = {
    # 清理过期任务结果
    'cleanup-expired-results': {
        'task': 'app.workers.tasks.cleanup.cleanup_expired_results',
        'schedule': 3600.0,  # 每小时执行一次
    },
}

if __name__ == "__main__":
    celery_app.start()
