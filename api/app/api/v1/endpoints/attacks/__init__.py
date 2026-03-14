"""
星河智安 (XingHe ZhiAn) - 攻击算法API路由模块
"""

from .cw import router

# 导出路由供外部使用
router = router

__all__ = ["router"]
