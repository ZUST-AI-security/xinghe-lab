"""
攻击参数敏感性分析 API (Sensitivity Analysis API)

Endpoints:
  POST /api/v1/sensitivity/scan                    — Submit a sensitivity scan (auth required)
  GET  /api/v1/sensitivity/result/{scan_id}        — Aggregate scan results (auth required)
  GET  /api/v1/sensitivity/history                 — List completed scans (auth required)
  GET  /api/v1/sensitivity/history/{scan_id}       — Get single scan detail (auth required)

关联需求：Requirement 9
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ValidationError
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.sensitivity_service import SCANNABLE_PARAMS, SensitivityService

router = APIRouter(prefix="/sensitivity", tags=["敏感性分析"])
logger = logging.getLogger(__name__)

_service = SensitivityService()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class SensitivityScanRequest(BaseModel):
    algorithm: str = Field(..., description="Attack algorithm name (e.g. 'fgsm', 'cw')")
    image: str = Field(..., description="Base64-encoded input image")
    model_name: str = Field(
        default="resnet100_imagenet",
        description="Registered model ID",
    )
    scan_param: str = Field(
        ...,
        description="Name of the parameter to scan (e.g. 'epsilon', 'c', 'overshoot')",
    )
    param_min: float = Field(..., description="Minimum value of the scan range")
    param_max: float = Field(..., description="Maximum value of the scan range")
    steps: int = Field(
        ...,
        ge=1,
        le=20,
        description="Number of uniformly-spaced values to sample (1–20)",
    )
    base_params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Base algorithm parameters; scan_param will be overridden per step",
    )

    @field_validator("algorithm")
    @classmethod
    def validate_algorithm(cls, v: str) -> str:
        algo = v.lower().strip()
        if algo not in SCANNABLE_PARAMS:
            raise ValueError(
                f"不支持的算法 '{v}'，支持的算法为: {list(SCANNABLE_PARAMS.keys())}"
            )
        return algo

    @field_validator("steps")
    @classmethod
    def validate_steps(cls, v: int) -> int:
        if v < 1 or v > 20:
            raise ValueError(f"steps 必须在 1 到 20 之间，当前值为 {v}")
        return v


class SensitivityScanResponse(BaseModel):
    scan_id: str
    task_ids: List[str]
    param_values: List[float]
    steps: int


class DataPoint(BaseModel):
    param_value: float
    success_rate: Optional[float] = None
    l2_norm: Optional[float] = None
    status: str  # "ok" | "failed" | "pending"
    error: Optional[str] = None


class SensitivityResultResponse(BaseModel):
    status: str  # "running" | "completed" | "partial"
    data_points: List[DataPoint]
    scan_param: Optional[str] = None
    algorithm: Optional[str] = None
    steps: int
    completed: int
    failed: int


class SensitivityHistoryItem(BaseModel):
    id: int
    scan_id: str
    algorithm: str
    model_name: str
    scan_param: str
    param_min: float
    param_max: float
    steps: int
    status: str
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


class SensitivityHistoryResponse(BaseModel):
    items: List[SensitivityHistoryItem]
    total: int
    page: int
    size: int
    pages: int


class SensitivityHistoryDetailResponse(SensitivityHistoryItem):
    data_points: List[DataPoint] = []
    completed: int = 0
    failed: int = 0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/scan", response_model=SensitivityScanResponse)
async def submit_sensitivity_scan(
    request: SensitivityScanRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Submit a parameter sensitivity scan.

    Validates the input, uniformly samples `steps` values in
    [param_min, param_max], and submits one AttackTask per value.

    Returns a scan_id for polling results via GET /sensitivity/result/{scan_id}.

    Validation errors (invalid steps or param range) return HTTP 422.
    """
    try:
        # 记录上传图片到文件库
        from app.utils.upload_recorder import record_attack_image
        record_attack_image(db, current_user.id, request.image)

        # Additional cross-field validation: param_min < param_max
        if request.param_min >= request.param_max:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": f"param_min ({request.param_min}) 必须小于 param_max ({request.param_max})",
                    "type": "ValidationError",
                },
            )

        result = _service.submit_scan(
            algorithm=request.algorithm,
            image_b64=request.image,
            model_id=request.model_name,
            scan_param=request.scan_param,
            param_min=request.param_min,
            param_max=request.param_max,
            steps=request.steps,
            base_params=request.base_params,
            user_id=current_user.id,
            db=db,
        )

        logger.info(
            "Sensitivity scan submitted (scan_id=%s, user=%d, algorithm=%s, steps=%d)",
            result["scan_id"],
            current_user.id,
            request.algorithm,
            request.steps,
        )

        return SensitivityScanResponse(
            scan_id=result["scan_id"],
            task_ids=result["task_ids"],
            param_values=result["param_values"],
            steps=request.steps,
        )

    except HTTPException:
        raise
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail={"message": exc.message, "details": exc.details})
    except Exception as exc:
        logger.error("Failed to submit sensitivity scan: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"扫描提交失败: {exc}")


@router.get("/result/{scan_id}", response_model=SensitivityResultResponse)
async def get_sensitivity_result(
    scan_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Aggregate and return the results of all AttackTasks in a sensitivity scan.

    Poll this endpoint until `status` is "completed" or "partial".

    - "running":   No tasks have finished yet.
    - "partial":   Some tasks have finished; others are still running.
    - "completed": All tasks have finished (some may have failed).

    Failed steps are included in data_points with status="failed" and an
    error message; they should be skipped when rendering the chart.
    When the scan has expired from Redis, completed results are served from DB.
    """
    try:
        result = _service.get_scan_result(scan_id, db=db)
        return SensitivityResultResponse(**result)

    except ValidationError as exc:
        raise HTTPException(status_code=404, detail={"message": exc.message, "details": exc.details})
    except Exception as exc:
        logger.error(
            "Failed to get sensitivity result for scan %s: %s", scan_id, exc, exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"获取扫描结果失败: {exc}")


@router.get("/history", response_model=SensitivityHistoryResponse)
async def get_sensitivity_history(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Return a paginated list of the current user's completed sensitivity scans.

    Only scans with status "completed" or "partial" are included.
    """
    try:
        result = _service.get_scan_history(
            user_id=current_user.id,
            page=page,
            size=size,
            db=db,
        )
        return SensitivityHistoryResponse(**result)
    except Exception as exc:
        logger.error("Failed to get sensitivity history for user %d: %s", current_user.id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取历史记录失败: {exc}")


@router.get("/history/{scan_id}", response_model=SensitivityHistoryDetailResponse)
async def get_sensitivity_history_detail(
    scan_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Return the full detail (including data_points) of a single completed scan.
    Only the owning user may access their own scan history.
    """
    try:
        result = _service.get_scan_by_id(scan_id=scan_id, user_id=current_user.id, db=db)
        if result is None:
            raise HTTPException(
                status_code=404,
                detail=f"扫描记录 '{scan_id}' 不存在或无权访问",
            )
        return SensitivityHistoryDetailResponse(**result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Failed to get sensitivity history detail for scan %s: %s", scan_id, exc, exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"获取扫描详情失败: {exc}")
