"""
星河智安 (XingHe ZhiAn) - PGD攻击相关Pydantic模型
定义PGD攻击数据的验证和序列化模式
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime


class PGDAttackParams(BaseModel):
    """PGD攻击参数模型"""
    epsilon: float = Field(0.03, ge=0.001, le=0.5, description="最大扰动幅度")
    alpha: float = Field(0.01, ge=0.0001, le=0.1, description="步长")
    num_iter: int = Field(40, ge=5, le=200, description="迭代次数")
    targeted: bool = Field(False, description="是否为定向攻击")
    random_start: bool = Field(True, description="是否随机初始化")
    loss_type: str = Field("ce", description="损失函数类型: ce(交叉熵) / dlr(差分逻辑回归)")
    norm: str = Field("linf", description="扰动范数: linf / l2")
    
    @validator('loss_type')
    def validate_loss_type(cls, v):
        if v not in ['ce', 'dlr']:
            raise ValueError('loss_type必须是ce或dlr')
        return v
    
    @validator('norm')
    def validate_norm(cls, v):
        if v not in ['linf', 'l2']:
            raise ValueError('norm必须是linf或l2')
        return v


class PGDAttackRequest(BaseModel):
    """PGD攻击请求模型"""
    image: str = Field(..., description="Base64编码的图片")
    model_name: Optional[str] = Field("resnet100_imagenet", description="模型名称")
    params: PGDAttackParams = Field(default_factory=PGDAttackParams, description="攻击参数")
    
    @validator('image')
    def validate_image(cls, v):
        """验证图片格式"""
        if not v.startswith('data:image/'):
            raise ValueError('图片格式无效，必须是data:image/开头')
        return v


class PGDAttackResponse(BaseModel):
    """PGD攻击响应模型"""
    original_image: str = Field(..., description="原始图片Base64")
    adversarial_image: str = Field(..., description="对抗样本Base64")
    heatmap: str = Field(..., description="热力图Base64")
    original_probs: List[float] = Field(..., description="原始预测概率")
    adversarial_probs: List[float] = Field(..., description="对抗样本预测概率")
    success: bool = Field(..., description="攻击是否成功")
    time_elapsed: float = Field(..., description="耗时（秒）")
    metadata: Dict[str, Any] = Field(..., description="附加元数据")


class PGDAsyncTaskResponse(BaseModel):
    """PGD异步任务响应模型"""
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")


class PGDTaskStatusResponse(BaseModel):
    """PGD任务状态响应模型"""
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")
    result: Optional[PGDAttackResponse] = Field(None, description="攻击结果")
    error: Optional[str] = Field(None, description="错误信息")
    progress: Optional[float] = Field(None, description="进度百分比")
    created_at: Optional[datetime] = Field(None, description="创建时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")


class PGDHistoryResponse(BaseModel):
    """PGD攻击历史响应模型"""
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
    """PGD攻击历史列表响应模型"""
    histories: List[PGDHistoryResponse]
    total: int
    page: int
    size: int
    pages: int