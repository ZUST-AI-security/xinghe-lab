"""
TaskScheduler — 自适应资源分配模块

根据算法类型评估任务计算复杂度，并将任务路由到对应的 Celery 队列。
该模块不依赖 Celery 内部实现，可被 API 层直接调用。

队列优先级映射：
  high    — FGSM（单步算法）
  default — I-FGSM、PGD（迭代算法）
  low     — C&W、DeepFool（优化算法）
"""

import logging
from datetime import datetime, timedelta, timezone
from enum import Enum

logger = logging.getLogger(__name__)


class TaskPriority(Enum):
    HIGH = "high"       # FGSM（单步）
    DEFAULT = "default" # I-FGSM, PGD（迭代）
    LOW = "low"         # C&W, DeepFool（优化）


def evaluate_complexity(algorithm: str, params: dict) -> TaskPriority:
    """
    根据算法类型评估任务计算复杂度，返回对应的 TaskPriority。

    分类依据：
      - 单步算法（FGSM）→ HIGH
      - 迭代算法（I-FGSM、PGD）→ DEFAULT
      - 优化算法（C&W、DeepFool）→ LOW

    Args:
        algorithm: 算法名称（不区分大小写），如 "fgsm"、"ifgsm"、"pgd"、"cw"、"deepfool"
        params: 算法参数字典（当前版本仅用于扩展，暂不影响优先级判断）

    Returns:
        TaskPriority 枚举值
    """
    algo = algorithm.lower().strip()

    if algo == "fgsm":
        return TaskPriority.HIGH

    if algo in ("ifgsm", "pgd"):
        return TaskPriority.DEFAULT

    # cw, deepfool 及其他未知算法均归为低优先级
    return TaskPriority.LOW


def get_queue_name(priority: TaskPriority) -> str:
    """
    将 TaskPriority 转换为 Celery 队列名称字符串。

    Args:
        priority: TaskPriority 枚举值

    Returns:
        队列名称字符串（"high" | "default" | "low"）
    """
    return priority.value


def apply_param_limits(
    algorithm: str,
    params: dict,
    queue_depth: int,
    threshold: int,
) -> tuple[dict, bool, str]:
    """
    当队列深度超过阈值时，自动限制耗时算法（C&W、DeepFool）的参数上限。

    Args:
        algorithm: 算法名称（不区分大小写），如 "cw"、"deepfool"
        params: 原始算法参数字典
        queue_depth: 当前队列中待处理任务数量
        threshold: 触发限制的队列深度阈值（来自 settings.task_queue_threshold）

    Returns:
        (limited_params, param_limited, reason)
        - limited_params: 经过限制后的参数字典（若未触发限制则与原始参数相同）
        - param_limited: 是否实际发生了参数限制（True 仅在参数被修改时）
        - reason: 限制原因说明字符串（未限制时为空字符串）
    """
    if queue_depth <= threshold:
        return params.copy(), False, ""

    algo = algorithm.lower().strip()
    limited = params.copy()
    reason_parts: list[str] = []

    if algo == "cw":
        if limited.get("max_iter", 0) > 200:
            limited["max_iter"] = 200
            reason_parts.append("max_iter 限制为 200")
        if limited.get("binary_search_steps", 0) > 3:
            limited["binary_search_steps"] = 3
            reason_parts.append("binary_search_steps 限制为 3")
    elif algo == "deepfool":
        if limited.get("max_iter", 0) > 30:
            limited["max_iter"] = 30
            reason_parts.append("max_iter 限制为 30")

    param_limited = bool(reason_parts)
    return limited, param_limited, "；".join(reason_parts)


def check_concurrent_limit(user_id: int, db) -> int:
    """
    查询该用户当前处于 running 或 pending 状态的 TaskRecord 数量。

    Args:
        user_id: 用户 ID
        db: SQLAlchemy Session

    Returns:
        当前活跃任务数量（status IN ('running', 'pending')）
    """
    from app.models.task_record import TaskRecord
    from app.core.config import settings

    # Reclaim slots left behind by killed workers or older deployments.  These
    # records block submission but cannot be matched to a live Celery task.
    now = datetime.now(timezone.utc)
    stale_after = max(
        int(getattr(settings, "active_task_stale_seconds", 0) or 0),
        int(getattr(settings, "celery_task_time_limit", 1900) or 1900) + 300,
    )
    cutoff = now - timedelta(seconds=stale_after)
    active_records = (
        db.query(TaskRecord)
        .filter(
            TaskRecord.user_id == user_id,
            TaskRecord.status.in_(["running", "pending"]),
        )
        .all()
    )
    reclaimed = 0
    for record in active_records:
        result = dict(record.result) if isinstance(record.result, dict) else {}
        created_at = record.created_at
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        is_stale = bool(created_at and created_at < cutoff)
        is_untracked = not result.get("task_id")
        if not (is_stale or is_untracked):
            continue
        record.status = "failed"
        record.completed_at = now
        result["error"] = (
            "任务超时或 worker 异常退出，已自动释放并发名额"
            if is_stale
            else "历史孤儿任务记录缺少 task_id，已自动释放并发名额"
        )
        record.result = result
        reclaimed += 1

    if reclaimed:
        db.commit()
        logger.warning("Reclaimed %d stale task slots for user_id=%s", reclaimed, user_id)

    active_count = (
        db.query(TaskRecord)
        .filter(
            TaskRecord.user_id == user_id,
            TaskRecord.status.in_(["running", "pending"]),
        )
        .count()
    )
    return active_count


def get_low_queue_depth() -> int:
    """
    查询 'low' 优先级队列（C&W、DeepFool 使用）的当前待处理任务数量。

    通过 Redis LLEN 命令查询队列长度。若 Redis 不可用，返回 0（不触发限制）。

    Returns:
        队列中待处理任务数量，查询失败时返回 0
    """
    try:
        import redis
        from app.core.config import settings

        client = redis.from_url(settings.redis_url, socket_connect_timeout=2)
        # Celery 使用 kombu 将队列存储为 Redis list，key 即队列名
        depth = client.llen("low")
        return int(depth)
    except Exception as exc:
        logger.warning("get_low_queue_depth: Redis query failed, defaulting to 0. Error: %s", exc)
        return 0
