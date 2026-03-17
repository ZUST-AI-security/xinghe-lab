"""
星河智安 (XingHe ZhiAn) - C&W攻击相关Pydantic模型
定义C&W攻击数据的验证和序列化模式
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime

class CWAttackParams(BaseModel):
    """C&W攻击参数模型"""
    c: float = Field(1.0, ge=0.001, le=10.0, description="权衡系数")
    kappa: float = Field(0.0, ge=0.0, le=10.0, description="置信度阈值")
    lr: float = Field(0.01, ge=1e-5, le=0.1, description="学习率")
    max_iter: int = Field(500, ge=100, le=1000, description="最大迭代次数")
    binary_search_steps: int = Field(9, ge=1, le=20, description="二分搜索步数")
    init_const: float = Field(1e-2, ge=1e-5, le=1.0, description="初始c值")
    targeted: bool = Field(False, description="是否为定向攻击")
    abort_early: bool = Field(True, description="是否提前终止")
    early_stop_iters: int = Field(50, ge=10, le=200, description="提前终止检查步数")

class CWAttackRequest(BaseModel):
    """C&W攻击请求模型"""
    image: str = Field(..., description="Base64编码的图片")
    model_name: Optional[str] = Field("resnet100_imagenet", description="模型名称")
    params: CWAttackParams = Field(default_factory=CWAttackParams, description="攻击参数")
    
    @validator('image')
    def validate_image(cls, v):
        """验证图片格式"""
        if not v.startswith('data:image/'):
            raise ValueError('图片格式无效，必须是data:image/开头')
        return v

class CWAttackResponse(BaseModel):
    """C&W攻击响应模型"""
    original_image: str = Field(..., description="原始图片Base64")
    adversarial_image: str = Field(..., description="对抗样本Base64")
    heatmap: str = Field(..., description="热力图Base64")
    original_probs: List[float] = Field(..., description="原始预测概率")
    adversarial_probs: List[float] = Field(..., description="对抗样本预测概率")
    success: bool = Field(..., description="攻击是否成功")
    time_elapsed: float = Field(..., description="耗时（秒）")
    metadata: Dict[str, Any] = Field(..., description="附加元数据")

class CWAsyncTaskResponse(BaseModel):
    """C&W异步任务响应模型"""
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")

class CWTaskStatusResponse(BaseModel):
    """C&W任务状态响应模型"""
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")
    result: Optional[CWAttackResponse] = Field(None, description="攻击结果")
    error: Optional[str] = Field(None, description="错误信息")
    progress: Optional[float] = Field(None, description="进度百分比")
    created_at: Optional[datetime] = Field(None, description="创建时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")

class CWHistoryResponse(BaseModel):
    """C&W攻击历史响应模型"""
    id: int
    attack_algorithm: str
    model_name: str
    model_type: str
    attack_params: Dict[str, Any]
    success: bool
    execution_time: float
    l2_norm: Optional[float] = None
    success_rate: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CWHistoryListResponse(BaseModel):
    """C&W攻击历史列表响应模型"""
    histories: List[CWHistoryResponse]
    total: int
    page: int
    size: int
    pages: int
