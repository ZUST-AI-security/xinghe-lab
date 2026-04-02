"""
星河智安 (XingHe ZhiAn) - Celery应用配置
异步任务队列配置，用于处理耗时的攻击算法
"""

from celery import Celery
from app.core.config import settings

# 创建Celery应用
celery_app = Celery(
    "app",  # 修正：使用简短的应用名
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.cw_task"],  # 修正：使用正确的模块路径
    broker_connection_retry_on_startup=True,  # 启动时重试连接
    broker_connection_max_retries=10,  # 最大重试次数
    broker_connection_retry_delay=2.0,  # 重试延迟
)

# Celery配置
celery_app.conf.update(
    # 任务配置
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Windows平台特殊配置：修复unpack错误
    task_protocol=1,  # 使用协议1避免fast_trace问题
    worker_pool="solo",  # Windows上使用solo池避免进程问题
    
    # Redis连接池配置
    broker_pool_limit=10,  # 连接池大小
    broker_connection_timeout=30,  # 连接超时
    result_backend_pool_limit=10,  # 结果后端连接池大小
    result_backend_transport_options={
        'master_name': 'mymaster',
        'visibility_timeout': 3600,
        'retry_policy': {
            'timeout': 5.0
        }
    },
    
    # 任务路由
    task_routes={
        "app.tasks.cw_task.run_cw_attack": {"queue": "attack_tasks"},
    },
    
    # 任务优先级
    task_default_priority=5,
    worker_prefetch_multiplier=1,
    
    # 结果过期时间
    result_expires=7200,  # 2小时
    
    # 任务超时配置 - 针对C&W攻击优化
    task_soft_time_limit=120,   # 2分钟软超时
    task_time_limit=400,        # 6分40秒硬超时
    
    # 重试配置
    task_acks_late=True,
    worker_disable_rate_limits=False,
    
    # 监控配置
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # 任务追踪
    task_track_started=True,
    task_publish_retry_policy={
        'max_retries': 3,
        'interval_start': 0,
        'interval_step': 0.2,
        'interval_max': 0.2,
    },
)

# 定期任务配置
celery_app.conf.beat_schedule = {
    # 暂时禁用定期任务，避免导入错误
}

if __name__ == "__main__":
    celery_app.start()
