"""
XingHe ZhiAn - FGSM attack related Pydantic models.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime


class FGSMAttackParams(BaseModel):
    """FGSM attack parameters."""
    epsilon: float = Field(0.03, ge=0.0, le=0.2, description="Perturbation magnitude (L-infinity bound)")
    targeted: bool = Field(False, description="Whether to run targeted attack")


class FGSMAttackRequest(BaseModel):
    """FGSM attack request model."""
    image: str = Field(..., description="Base64 encoded image")
    model_name: Optional[str] = Field("resnet100_imagenet", description="Model name")
    params: FGSMAttackParams = Field(default_factory=FGSMAttackParams, description="Attack parameters")

    @validator('image')
    def validate_image(cls, v):
        if not v.startswith('data:image/'):
            raise ValueError('Invalid image format, must start with data:image/')
        return v


class FGSMAttackResponse(BaseModel):
    """FGSM attack response model."""
    original_image: str = Field(..., description="Original image (Base64)")
    adversarial_image: str = Field(..., description="Adversarial image (Base64)")
    heatmap: str = Field(..., description="Heatmap (Base64)")
    original_probs: List[float] = Field(..., description="Original prediction probabilities")
    adversarial_probs: List[float] = Field(..., description="Adversarial prediction probabilities")
    success: bool = Field(..., description="Whether attack succeeded")
    time_elapsed: float = Field(..., description="Elapsed time (seconds)")
    metadata: Dict[str, Any] = Field(..., description="Additional metadata")


class FGSMAsyncTaskResponse(BaseModel):
    """FGSM async task response model."""
    task_id: str = Field(..., description="Task ID")
    status: str = Field(..., description="Task status")


class FGSMTaskStatusResponse(BaseModel):
    """FGSM task status response model."""
    task_id: str = Field(..., description="Task ID")
    status: str = Field(..., description="Task status")
    result: Optional[FGSMAttackResponse] = Field(None, description="Attack result")
    error: Optional[str] = Field(None, description="Error message")
    progress: Optional[float] = Field(None, description="Progress percentage")
    created_at: Optional[datetime] = Field(None, description="Created time")
    completed_at: Optional[datetime] = Field(None, description="Completed time")


class FGSMHistoryResponse(BaseModel):
    """FGSM attack history response model."""
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


class FGSMHistoryListResponse(BaseModel):
    """FGSM attack history list response model."""
    histories: List[FGSMHistoryResponse]
    total: int
    page: int
    size: int
    pages: int


# Backward-compatible aliases
CWAttackParams = FGSMAttackParams
CWAttackRequest = FGSMAttackRequest
CWAttackResponse = FGSMAttackResponse
CWAsyncTaskResponse = FGSMAsyncTaskResponse
CWTaskStatusResponse = FGSMTaskStatusResponse
CWHistoryResponse = FGSMHistoryResponse
CWHistoryListResponse = FGSMHistoryListResponse
