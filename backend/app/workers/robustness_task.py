"""
Celery task for robustness evaluation.

Wraps RobustnessService.evaluate() with a 120-second soft time limit.
On timeout, the task transitions to FAILURE state with a descriptive error.

关联需求：Requirement 7
"""

import logging
from typing import Any, Dict, List

from app.workers.celery_app import celery_app
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.workers.robustness_task.run_robustness_evaluation",
    soft_time_limit=120,
    time_limit=130,
)
def run_robustness_evaluation(
    self,
    image_b64: str,
    algorithms: List[str],
    model_id: str,
    user_id: int,
) -> Dict[str, Any]:
    """
    Celery task: evaluate adversarial robustness against defense transforms.

    Args:
        image_b64:  Base64-encoded input image.
        algorithms: List of algorithm names to evaluate.
        model_id:   Registered model ID.
        user_id:    Requesting user ID (for logging).

    Returns:
        dict with "matrix", "algorithms", "defenses", "time_elapsed" keys.

    Raises:
        SoftTimeLimitExceeded: When the 120-second soft limit is hit.
    """
    from celery.exceptions import SoftTimeLimitExceeded

    self.update_state(state="PROGRESS", meta={"progress": 0, "status": "Starting evaluation..."})

    db = SessionLocal()
    try:
        from app.services.robustness_service import RobustnessService

        self.update_state(
            state="PROGRESS",
            meta={"progress": 10, "status": "Loading model and algorithms..."},
        )

        service = RobustnessService()
        result = service.evaluate(
            image_b64=image_b64,
            algorithms=algorithms,
            model_id=model_id,
            db=db,
        )

        self.update_state(state="PROGRESS", meta={"progress": 100, "status": "Completed"})
        logger.info(
            "Robustness evaluation task completed (user=%s, model=%s, algorithms=%s)",
            user_id,
            model_id,
            algorithms,
        )
        return result

    except SoftTimeLimitExceeded:
        logger.warning(
            "Robustness evaluation timed out after 120s (user=%s, model=%s)",
            user_id,
            model_id,
        )
        raise

    except Exception as exc:
        logger.error(
            "Robustness evaluation failed (user=%s, model=%s): %s",
            user_id,
            model_id,
            exc,
            exc_info=True,
        )
        raise

    finally:
        db.close()
