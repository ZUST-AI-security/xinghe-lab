"""
Attack algorithms router — aggregates all per-algorithm routers.

To add a new algorithm:
  1. Create app/api/v1/attacks/<algo>.py
  2. Add include_router() call below
"""

from fastapi import APIRouter, Depends
from app.api.v1.attacks import fgsm, cw, pgd, ifgsm, deepfool
import app.algorithms  # side-effect: registers all algorithms
from app.core.rate_limit import rate_limiter_dependency

router = APIRouter(dependencies=[Depends(rate_limiter_dependency)])
router.include_router(fgsm.router)
router.include_router(cw.router)
router.include_router(pgd.router)
router.include_router(ifgsm.router)
router.include_router(deepfool.router)
