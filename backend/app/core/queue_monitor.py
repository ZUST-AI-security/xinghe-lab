"""
QueueMonitor — 队列状态监控模块

提供队列深度查询、平均执行时间估算和队列状态汇总功能。
对应 Requirement 13：任务队列状态感知。

队列与算法映射：
  high    — FGSM（单步算法）
  default — I-FGSM、PGD（迭代算法）
  low     — C&W、DeepFool（优化算法）
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)

# 无历史数据时使用的默认平均执行时间（秒）
DEFAULT_AVG_TIMES: dict[str, float] = {
    "high": 30.0,
    "default": 120.0,
    "low": 300.0,
}

# 队列名称到算法列表的映射，用于从 AttackHistory 查询对应算法的平均耗时
QUEUE_ALGORITHMS: dict[str, list[str]] = {
    "high": ["fgsm"],
    "default": ["ifgsm", "pgd"],
    "low": ["cw", "deepfool"],
}


def _get_active_count_by_queue() -> dict[str, int]:
    """
    使用 Celery Inspect 查询各队列的 active（正在执行）任务数。

    Returns:
        {queue_name: active_count}，Inspect 不可用时返回空字典。
    """
    try:
        from app.workers.celery_app import celery_app

        inspector = celery_app.control.inspect(timeout=1.0)
        active_map = inspector.active() or {}
        counts: dict[str, int] = {}
        for worker_tasks in active_map.values():
            for task in worker_tasks:
                # delivery_info 包含 routing_key，与队列名一致
                q = (task.get("delivery_info") or {}).get("routing_key", "default")
                counts[q] = counts.get(q, 0) + 1
        return counts
    except Exception as exc:
        logger.debug("_get_active_count_by_queue: inspect failed: %s", exc)
        return {}


def get_queue_depth(queue_name: str) -> int:
    """
    查询指定队列的任务数量（等待中 + 正在执行）。

    - 等待中（pending）：通过 Redis LLEN 查询 kombu 队列 list。
    - 正在执行（active）：通过 Celery Inspect 查询 worker active 任务。

    两者之和才是用户感知到的"队列繁忙程度"；若只看 LLEN，
    worker 一旦取走任务就变 0，导致显示"空闲"但实际仍在处理。

    Args:
        queue_name: 队列名称（"high" | "default" | "low"）

    Returns:
        pending + active 数量之和；任一数据源不可用时用 0 代替。
    """
    pending = 0
    try:
        import redis
        from app.core.config import settings

        client = redis.from_url(settings.redis_url, socket_connect_timeout=2)
        pending = int(client.llen(queue_name))
    except Exception as exc:
        logger.warning(
            "get_queue_depth: Redis query failed for queue '%s', defaulting to 0. Error: %s",
            queue_name,
            exc,
        )

    active_counts = _get_active_count_by_queue()
    active = active_counts.get(queue_name, 0)
    return pending + active


def get_avg_execution_time(queue_name: str, db: Session) -> float:
    """
    从 AttackHistory 表查询指定队列对应算法的平均执行时间。

    平均耗时基于该队列所有关联算法的历史 execution_time 字段计算。
    若无历史数据，则返回对应队列的默认预估耗时。

    Args:
        queue_name: 队列名称（"high" | "default" | "low"）
        db: SQLAlchemy Session

    Returns:
        平均执行时间（秒）；无数据时返回默认值。
    """
    from app.models.attack_history import AttackHistory

    algorithms = QUEUE_ALGORITHMS.get(queue_name, [])
    if not algorithms:
        return DEFAULT_AVG_TIMES.get(queue_name, 120.0)

    try:
        result = (
            db.query(func.avg(AttackHistory.execution_time))
            .filter(
                AttackHistory.algorithm.in_(algorithms),
                AttackHistory.execution_time.isnot(None),
            )
            .scalar()
        )

        if result is not None:
            return float(result)

        # 无历史数据，使用默认值
        return DEFAULT_AVG_TIMES.get(queue_name, 120.0)

    except Exception as exc:
        logger.warning(
            "get_avg_execution_time: DB query failed for queue '%s', using default. Error: %s",
            queue_name,
            exc,
        )
        return DEFAULT_AVG_TIMES.get(queue_name, 120.0)


def get_queue_status(db: Session) -> dict:
    """
    返回三个队列（high、default、low）的当前状态。

    每个队列包含：
      - pending: 当前待处理任务数量（通过 Redis LLEN 查询）
      - estimated_wait_seconds: 预估等待时间（pending × 平均执行时间）

    Args:
        db: SQLAlchemy Session（用于查询 AttackHistory 平均耗时）

    Returns:
        形如以下结构的字典：
        {
            "high":    {"pending": int, "estimated_wait_seconds": float},
            "default": {"pending": int, "estimated_wait_seconds": float},
            "low":     {"pending": int, "estimated_wait_seconds": float},
        }
    """
    status: dict[str, dict] = {}

    for queue_name in ("high", "default", "low"):
        pending = get_queue_depth(queue_name)
        avg_time = get_avg_execution_time(queue_name, db)
        estimated_wait = pending * avg_time

        status[queue_name] = {
            "pending": pending,
            "estimated_wait_seconds": estimated_wait,
        }

    return status
