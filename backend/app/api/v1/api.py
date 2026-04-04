"""API v1 路由聚合"""

from fastapi import APIRouter

from .endpoints import auth, users, models, upload
from ..attacks import cw, ifgsm, algorithms

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户管理"])
api_router.include_router(models.router, prefix="/models", tags=["模型管理"])
api_router.include_router(upload.router, tags=["文件上传"])
api_router.include_router(algorithms.router, prefix="/algorithms", tags=["算法管理"])
api_router.include_router(cw.router, prefix="/attacks", tags=["C&W攻击"])
api_router.include_router(ifgsm.router, prefix="/attacks", tags=["I-FGSM攻击"])
