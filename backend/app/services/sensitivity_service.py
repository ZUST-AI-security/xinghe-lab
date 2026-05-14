"""
攻击参数敏感性分析服务 (Sensitivity Analysis Service)

固定图片，扫描某个参数的多个取值，批量提交 AttackTask，
并将 scan_id → {task_ids, param_values} 存入 Redis（TTL 3600s）。

关联需求：Requirement 9
"""

import json
import logging
import uuid
from typing import Any, Dict, List, Optional

import numpy as np
import redis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Algorithms and their scannable parameter names
SCANNABLE_PARAMS: Dict[str, str] = {
    "fgsm": "epsilon",
    "ifgsm": "epsilon",
    "pgd": "epsilon",
    "cw": "c",
    "deepfool": "overshoot",
}

#: Redis key prefix for sensitivity scan records
REDIS_KEY_PREFIX = "sensitivity:scan:"

#: TTL for scan records in Redis (seconds)
SCAN_TTL = 3600


# ---------------------------------------------------------------------------
# SensitivityService
# ---------------------------------------------------------------------------

class SensitivityService:
    """
    Manages parameter sensitivity scans.

    A scan consists of:
      1. Validating the input parameters.
      2. Uniformly sampling `steps` values in [param_min, param_max].
      3. Submitting one AttackTask per sampled value.
      4. Storing the scan metadata (task_ids, param_values) in Redis.
    """

    def submit_scan(
        self,
        algorithm: str,
        image_b64: str,
        model_id: str,
        scan_param: str,
        param_min: float,
        param_max: float,
        steps: int,
        base_params: Dict[str, Any],
        user_id: int,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Validate inputs, sample parameter values, submit AttackTasks, and
        persist the scan record in Redis.

        Args:
            algorithm:   Algorithm name (e.g. "fgsm", "cw").
            image_b64:   Base64-encoded input image.
            model_id:    Registered model ID (e.g. "resnet100_imagenet").
            scan_param:  Name of the parameter to scan.
            param_min:   Minimum value of the scan range (inclusive).
            param_max:   Maximum value of the scan range (exclusive upper bound).
            steps:       Number of uniformly-spaced values to sample (1–20).
            base_params: Base algorithm parameters; scan_param will be overridden
                         for each step.
            user_id:     Requesting user ID.
            db:          SQLAlchemy database session.

        Returns:
            dict with keys:
              - "scan_id":     Unique scan identifier (UUID string).
              - "task_ids":    List of Celery task IDs (one per step).
              - "param_values": List of sampled parameter values.

        Raises:
            ValidationError: If `steps` is not a positive integer in [1, 20],
                             or if `param_min >= param_max`.
        """
        # ------------------------------------------------------------------
        # Input validation
        # ------------------------------------------------------------------
        self._validate_inputs(steps, param_min, param_max)

        # ------------------------------------------------------------------
        # Uniform sampling
        # ------------------------------------------------------------------
        param_values: List[float] = np.linspace(param_min, param_max, steps).tolist()

        # ------------------------------------------------------------------
        # Submit one AttackTask per sampled value
        # ------------------------------------------------------------------
        from app.workers.attack_task import run_attack
        from app.core.task_scheduler import evaluate_complexity, get_queue_name

        priority = evaluate_complexity(algorithm, base_params)
        queue_name = get_queue_name(priority)

        task_ids: List[str] = []
        for param_value in param_values:
            # Build per-step params by overriding the scan parameter
            step_params = dict(base_params)
            step_params[scan_param] = param_value

            task = run_attack.apply_async(
                kwargs=dict(
                    algorithm=algorithm,
                    model_name=model_id,
                    image=image_b64,
                    params=step_params,
                    user_id=user_id,
                ),
                queue=queue_name,
            )
            task_ids.append(task.id)

        # ------------------------------------------------------------------
        # Persist scan record in Redis
        # ------------------------------------------------------------------
        scan_id = str(uuid.uuid4())
        scan_record = {
            "scan_id": scan_id,
            "algorithm": algorithm,
            "model_id": model_id,
            "scan_param": scan_param,
            "param_min": param_min,
            "param_max": param_max,
            "steps": steps,
            "task_ids": task_ids,
            "param_values": param_values,
        }
        self._save_scan_to_redis(scan_id, scan_record)

        logger.info(
            "Sensitivity scan submitted (scan_id=%s, algorithm=%s, steps=%d, user=%d)",
            scan_id,
            algorithm,
            steps,
            user_id,
        )

        return {
            "scan_id": scan_id,
            "task_ids": task_ids,
            "param_values": param_values,
        }

    # ------------------------------------------------------------------
    # Result aggregation
    # ------------------------------------------------------------------

    def get_scan_result(self, scan_id: str) -> Dict[str, Any]:
        """
        Aggregate the results of all AttackTasks belonging to a scan.

        Args:
            scan_id: Unique scan identifier returned by submit_scan().

        Returns:
            dict with keys:
              - "status":      "running" | "completed" | "partial"
              - "data_points": list of per-step result dicts
              - "scan_param":  name of the scanned parameter
              - "algorithm":   algorithm name

        Raises:
            ValidationError: If the scan_id is not found in Redis.
        """
        scan_record = self._load_scan_from_redis(scan_id)
        if scan_record is None:
            raise ValidationError(
                f"扫描记录 '{scan_id}' 不存在或已过期",
                details={"scan_id": scan_id},
            )

        from celery.result import AsyncResult
        from app.workers.celery_app import celery_app

        task_ids: List[str] = scan_record["task_ids"]
        param_values: List[float] = scan_record["param_values"]

        data_points = []
        completed_count = 0
        failed_count = 0

        for task_id, param_value in zip(task_ids, param_values):
            task = AsyncResult(task_id, app=celery_app)
            state = (task.state or "PENDING").upper()

            if state == "SUCCESS":
                result = task.get()
                meta = result.get("metadata", {})
                data_points.append(
                    {
                        "param_value": param_value,
                        "success_rate": meta.get("success_rate", 0.0),
                        "l2_norm": meta.get("l2_norm") or meta.get("avg_l2_norm") or 0.0,
                        "status": "ok",
                        "error": None,
                    }
                )
                completed_count += 1

            elif state in {"FAILURE", "REVOKED"}:
                error_info = task.info
                error_str = str(error_info) if error_info else "任务执行失败"
                data_points.append(
                    {
                        "param_value": param_value,
                        "success_rate": None,
                        "l2_norm": None,
                        "status": "failed",
                        "error": error_str,
                    }
                )
                failed_count += 1

            else:
                # PENDING / STARTED / PROGRESS
                data_points.append(
                    {
                        "param_value": param_value,
                        "success_rate": None,
                        "l2_norm": None,
                        "status": "pending",
                        "error": None,
                    }
                )

        total = len(task_ids)
        finished = completed_count + failed_count

        if finished == 0:
            overall_status = "running"
        elif finished < total:
            overall_status = "partial"
        else:
            overall_status = "completed"

        return {
            "status": overall_status,
            "data_points": data_points,
            "scan_param": scan_record.get("scan_param"),
            "algorithm": scan_record.get("algorithm"),
            "steps": total,
            "completed": completed_count,
            "failed": failed_count,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_inputs(steps: int, param_min: float, param_max: float) -> None:
        """
        Validate scan inputs.

        Raises:
            ValidationError: If validation fails.
        """
        # steps must be a positive integer in [1, 20]
        if not isinstance(steps, int) or isinstance(steps, bool):
            raise ValidationError(
                "steps 必须为正整数",
                details={"steps": steps},
            )
        if steps < 1 or steps > 20:
            raise ValidationError(
                f"steps 必须在 1 到 20 之间，当前值为 {steps}",
                details={"steps": steps, "valid_range": [1, 20]},
            )

        # param_min must be strictly less than param_max
        if param_min >= param_max:
            raise ValidationError(
                f"param_min ({param_min}) 必须小于 param_max ({param_max})",
                details={"param_min": param_min, "param_max": param_max},
            )

    @staticmethod
    def _get_redis_client() -> redis.Redis:
        """Return a Redis client using the application settings."""
        return redis.from_url(settings.redis_url, socket_connect_timeout=5)

    def _save_scan_to_redis(self, scan_id: str, scan_record: Dict[str, Any]) -> None:
        """Persist a scan record in Redis with TTL."""
        key = f"{REDIS_KEY_PREFIX}{scan_id}"
        try:
            client = self._get_redis_client()
            client.setex(key, SCAN_TTL, json.dumps(scan_record))
            logger.debug("Saved scan record to Redis (key=%s, ttl=%ds)", key, SCAN_TTL)
        except Exception as exc:
            # Redis 保存失败时记录错误，但不抛出异常
            # 此时 Celery 任务已提交，scan_id 将无法查询结果
            logger.error(
                "Failed to save scan record to Redis (scan_id=%s): %s. "
                "Tasks have been submitted but results will be unqueryable.",
                scan_id,
                exc,
                exc_info=True,
            )
            raise ValidationError(
                f"扫描任务已提交但无法保存扫描记录（Redis 不可用），请稍后重试",
                details={"scan_id": scan_id},
            )

    def _load_scan_from_redis(self, scan_id: str) -> Optional[Dict[str, Any]]:
        """Load a scan record from Redis. Returns None if not found."""
        key = f"{REDIS_KEY_PREFIX}{scan_id}"
        try:
            client = self._get_redis_client()
            raw = client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as exc:
            logger.error("Failed to load scan record from Redis: %s", exc, exc_info=True)
            return None
