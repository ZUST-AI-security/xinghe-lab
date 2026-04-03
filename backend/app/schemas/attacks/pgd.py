"""
XingHe ZhiAn - PGD attack related Pydantic models.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime


class PGDAttackParams(BaseModel):
    """PGD attack parameters."""
    epsilon: float = Field(0.03, ge=0.001, le=0.5, description="最大扰动幅度")
    alpha: float = Field(0.01, ge=0.0001, le=0.1, description="步长")
    num_iter: int = Field(40, ge=5, le=200, description="迭代次数")
    targeted: bool = Field(False, description="是否为定向攻击")
    random_start: bool = Field(True, description="是否随机初始化")
    loss_type: str = Field("ce", description="损失函数类型: ce(交叉熵) / dlr(差分逻辑回归)")
    norm: str = Field("linf", description="扰动范数: linf / l2")

    @field_validator('loss_type')
    @classmethod
    def validate_loss_type(cls, v):
        if v not in ['ce', 'dlr']:
            raise ValueError('loss_type 必须是 ce 或 dlr')
        return v

    @field_validator('norm')
    @classmethod
    def validate_norm(cls, v):
        if v not in ['linf', 'l2']:
            raise ValueError('norm 必须是 linf 或 l2')
        return v


class PGDAttackRequest(BaseModel):
    """PGD attack request model."""
    image: str = Field(..., description="Base64 encoded image")
    model_name: Optional[str] = Field("resnet100_imagenet", description="Model name")
    params: PGDAttackParams = Field(default_factory=PGDAttackParams, description="Attack parameters")

    @field_validator('image')
    @classmethod
    def validate_image(cls, v):
        if not v.startswith('data:image/'):
            raise ValueError('Invalid image format, must start with data:image/')
        return v


class PGDAttackResponse(BaseModel):
    """PGD attack response model."""
    original_image: str = Field(..., description="Original image (Base64)")
    adversarial_image: str = Field(..., description="Adversarial image (Base64)")
    heatmap: str = Field(..., description="Heatmap (Base64)")
    original_probs: List[float] = Field(..., description="Original prediction probabilities")
    adversarial_probs: List[float] = Field(..., description="Adversarial prediction probabilities")
    success: bool = Field(..., description="Whether attack succeeded")
    time_elapsed: float = Field(..., description="Elapsed time (seconds)")
    metadata: Dict[str, Any] = Field(..., description="Additional metadata")


class PGDAsyncTaskResponse(BaseModel):
    """PGD async task response model."""
    task_id: str = Field(..., description="Task ID")
    status: str = Field(..., description="Task status")


class PGDTaskStatusResponse(BaseModel):
    """PGD task status response model."""
    task_id: str = Field(..., description="Task ID")
    status: str = Field(..., description="Task status")
    result: Optional[PGDAttackResponse] = Field(None, description="Attack result")
    error: Optional[str] = Field(None, description="Error message")
    progress: Optional[float] = Field(None, description="Progress percentage")
    created_at: Optional[datetime] = Field(None, description="Created time")
    completed_at: Optional[datetime] = Field(None, description="Completed time")


class PGDHistoryResponse(BaseModel):
    """PGD attack history response model."""
    id: int
    attack_algorithm: str
    model_name: str
    model_type: str
    attack_params: Dict[str, Any]
    success: bool
    execution_time: float
    l2_norm: Optional[float] = None
    linf_norm: Optional[float] = None
    success_rate: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PGDHistoryListResponse(BaseModel):
    """PGD attack history list response model."""
    histories: List[PGDHistoryResponse]
    total: int
    page: int
    size: int
    pages: int
