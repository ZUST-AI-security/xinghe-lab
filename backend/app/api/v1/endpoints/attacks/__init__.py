"""
星河智安 (XingHe ZhiAn) - 攻击算法API路由模块
"""

from .cw import router as cw_router
from .pgd import router as pgd_router

# 合并所有攻击路由
from fastapi import APIRouter
router = APIRouter()
router.include_router(cw_router)
router.include_router(pgd_router)

# 导出路由供外部使用
__all__ = ["router"]
