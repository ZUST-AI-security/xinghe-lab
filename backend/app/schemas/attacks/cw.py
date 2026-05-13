"""
C&W (Carlini & Wagner L2) attack — per-algorithm Pydantic schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class CWParams(BaseModel):
    c: float = Field(1.0, ge=0.001, le=10.0, description="Trade-off constant (higher = prioritize attack success)")
    kappa: float = Field(0.0, ge=0.0, le=10.0, description="Confidence threshold (higher = more confident attack)")
    lr: float = Field(0.01, gt=0.0, description="Adam optimizer learning rate")
    max_iter: int = Field(500, ge=1, le=2000, description="Max optimization iterations")
    binary_search_steps: int = Field(9, ge=1, le=20, description="Binary search steps for optimal c")
    init_const: float = Field(0.01, gt=0.0, description="Initial c value for binary search")
    targeted: bool = Field(False, description="Targeted attack (random non-true-label target)")
    abort_early: bool = Field(True, description="Stop early when loss stops improving")
    early_stop_iters: int = Field(50, ge=1, description="Steps without improvement before early stop")


class CWAttackRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded image (data:image/... prefix required)")
    model_name: Optional[str] = Field("resnet100_imagenet", description="Model identifier")
    params: CWParams = Field(default_factory=CWParams, description="C&W hyper-parameters")

    class Config:
        json_schema_extra = {
            "example": {
                "image": "data:image/jpeg;base64,...",
                "model_name": "resnet100_imagenet",
                "params": {"c": 1.0, "kappa": 0.0, "max_iter": 500},
            }
        }


class CWAttackResponse(BaseModel):
    original_image: str
    adversarial_image: str
    heatmap: str
    original_probs: List[float]
    adversarial_probs: List[float]
    success: bool
    time_elapsed: float
    metadata: Dict[str, Any]


class CWAsyncTaskResponse(BaseModel):
    task_id: str
    status: str
    param_limited: bool = False
    param_limit_reason: str = ""


class CWTaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[CWAttackResponse] = None
    error: Optional[str] = None
    progress: Optional[float] = None
    completed_at: Optional[datetime] = None


class CWHistoryResponse(BaseModel):
    id: int
    attack_algorithm: str
    model_name: str
    attack_params: Dict[str, Any]
    success: bool
    execution_time: float
    l2_norm: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CWHistoryListResponse(BaseModel):
    histories: List[CWHistoryResponse]
    total: int
    page: int
    size: int
    pages: int
