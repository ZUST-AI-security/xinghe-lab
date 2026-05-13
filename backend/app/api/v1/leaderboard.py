"""
模型鲁棒性排行榜 API (Model Robustness Leaderboard API)

Endpoints:
  GET /api/v1/leaderboard  — 获取模型鲁棒性排行榜（需认证，支持 ?algorithm=fgsm 查询参数）

关联需求：Requirement 10
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.attack_history import AttackHistory
from app.models.user import User

router = APIRouter(prefix="/leaderboard", tags=["排行榜"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class LeaderboardEntry(BaseModel):
    model_name: str
    total_attacks: int
    success_count: int
    avg_success_rate: float
    avg_l2_norm: Optional[float]
    avg_linf_norm: Optional[float]

    class Config:
        from_attributes = True


class LeaderboardResponse(BaseModel):
    algorithm: Optional[str]
    entries: List[LeaderboardEntry]
    total: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    algorithm: Optional[str] = Query(
        default=None,
        description="按攻击算法过滤，例如 fgsm、pgd、cw。不传则返回所有算法的聚合数据。",
    ),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    获取模型鲁棒性排行榜。

    聚合 AttackHistory 表，按 model_name 分组统计：
    - 总攻击次数
    - 攻击成功次数
    - 平均攻击成功率
    - 平均 L2 范数
    - 平均 Linf 范数

    结果按 avg_success_rate 升序排列（成功率越低表示模型越鲁棒，排名越靠前）。
    无数据时返回空列表。
    """
    try:
        query = db.query(
            AttackHistory.model_name,
            func.count(AttackHistory.id).label("total_attacks"),
            func.sum(
                case((AttackHistory.success == True, 1), else_=0)
            ).label("success_count"),
            func.avg(AttackHistory.success_rate).label("avg_success_rate"),
            func.avg(AttackHistory.l2_norm).label("avg_l2_norm"),
            func.avg(AttackHistory.linf_norm).label("avg_linf_norm"),
        )

        if algorithm:
            query = query.filter(AttackHistory.algorithm == algorithm.lower())

        rows = (
            query
            .group_by(AttackHistory.model_name)
            .order_by(func.avg(AttackHistory.success_rate).asc())
            .all()
        )

        entries = [
            LeaderboardEntry(
                model_name=row.model_name,
                total_attacks=row.total_attacks,
                success_count=int(row.success_count or 0),
                avg_success_rate=float(row.avg_success_rate or 0.0),
                avg_l2_norm=float(row.avg_l2_norm) if row.avg_l2_norm is not None else None,
                avg_linf_norm=float(row.avg_linf_norm) if row.avg_linf_norm is not None else None,
            )
            for row in rows
        ]

        logger.info(
            "Leaderboard queried (algorithm=%s, entries=%d, user=%s)",
            algorithm,
            len(entries),
            current_user.id,
        )

        return LeaderboardResponse(
            algorithm=algorithm,
            entries=entries,
            total=len(entries),
        )

    except Exception as exc:
        logger.error("Failed to fetch leaderboard: %s", exc, exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"获取排行榜数据失败: {exc}")
