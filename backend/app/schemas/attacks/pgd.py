from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from enum import Enum

class NormType(str, Enum):
    LINF = "Linf"
    L2 = "L2"

class PGDAttackParams(BaseModel):
    """PGD攻击参数验证模型"""
    epsilon: float = Field(
        default=8/255,
        ge=1/255,
        le=32/255,
        description="最大扰动范围"
    )
    alpha: float = Field(
        default=2/255,
        ge=0.5/255,
        le=8/255,
        description="步长"
    )
    num_iter: int = Field(
        default=40,
        ge=10,
        le=100,
        description="迭代次数"
    )
    random_start: bool = Field(
        default=True,
        description="随机初始化"
    )
    targeted: bool = Field(
        default=False,
        description="是否为定向攻击"
    )
    target_label: Optional[int] = Field(
        default=None,
        ge=0,
        le=999,
        description="目标标签（定向攻击时使用）"
    )
    norm: NormType = Field(
        default=NormType.LINF,
        description="范数类型"
    )
    confidence_threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="置信度阈值"
    )
    
    @validator('alpha')
    def alpha_must_be_less_than_epsilon(cls, v, values):
        """验证步长不超过epsilon"""
        if 'epsilon' in values and v > values['epsilon']:
            raise ValueError(f'步长(alpha={v})不能大于最大扰动(epsilon={values["epsilon"]})')
        return v
    
    @validator('num_iter')
    def validate_iterations(cls, v):
        """验证迭代次数在合理范围"""
        if v < 10:
            raise ValueError('迭代次数至少为10')
        if v > 100:
            raise ValueError('迭代次数超过100可能导致超时')
        return v

class PredictionItem(BaseModel):
    """预测结果项"""
    label: str
    confidence: float

class HistoryItem(BaseModel):
    """历史记录项"""
    loss: float
    perturbation_norm: float
    iteration: int

class PGDAttackResponse(BaseModel):
    """PGD攻击响应模型"""
    success: bool
    message: str
    original_image: str  # base64
    adversarial_image: str  # base64
    heatmap: str  # base64
    original_predictions: List[PredictionItem]
    adversarial_predictions: List[PredictionItem]
    success_rate: float
    avg_perturbation_norm: float
    execution_time: float
    history: Dict[str, List[float]]