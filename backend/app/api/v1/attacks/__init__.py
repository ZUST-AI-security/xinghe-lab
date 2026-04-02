"""
Attack algorithms router — aggregates all per-algorithm routers.

To add a new algorithm:
  1. Create app/api/v1/attacks/<algo>.py
  2. Add include_router() call below
"""

from fastapi import APIRouter
from app.api.v1.attacks import fgsm, cw, tasks
import app.algorithms  # side-effect: registers all algorithms

router = APIRouter()
router.include_router(fgsm.router)
router.include_router(cw.router)
router.include_router(tasks.router)
