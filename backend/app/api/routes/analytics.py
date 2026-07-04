from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.prediction import PredictionResult
from app.models.region import Region
from app.models.dataset import VaccinationRecord

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/risk-distribution")
def risk_distribution(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (
        db.query(PredictionResult.risk_level, func.count(PredictionResult.id))
        .group_by(PredictionResult.risk_level)
        .all()
    )
    return {level: count for level, count in rows}


@router.get("/top-regions")
def top_regions(limit: int = 10, db: Session = Depends(get_db), _=Depends(get_current_user)):
    subq = (
        db.query(
            PredictionResult.region_id,
            func.max(PredictionResult.created_at).label("max_created"),
        )
        .group_by(PredictionResult.region_id)
        .subquery()
    )
    rows = (
        db.query(Region.name, PredictionResult.hesitancy_score, PredictionResult.risk_level)
        .join(PredictionResult, PredictionResult.region_id == Region.id)
        .join(
            subq,
            (PredictionResult.region_id == subq.c.region_id)
            & (PredictionResult.created_at == subq.c.max_created),
        )
        .order_by(PredictionResult.hesitancy_score.desc())
        .limit(limit)
        .all()
    )
    return [{"region_name": n, "hesitancy_score": s, "risk_level": r} for n, s, r in rows]


@router.get("/coverage-trend")
def coverage_trend(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (
        db.query(
            VaccinationRecord.period,
            func.sum(VaccinationRecord.doses_administered).label("doses"),
            func.avg(VaccinationRecord.hesitancy_rate).label("avg_hesitancy"),
        )
        .group_by(VaccinationRecord.period)
        .order_by(VaccinationRecord.period.asc())
        .all()
    )
    return [
        {"period": p, "doses_administered": int(d or 0), "avg_hesitancy_rate": round(float(h or 0), 4)}
        for p, d, h in rows
    ]
