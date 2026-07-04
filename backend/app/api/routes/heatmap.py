from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.region import Region
from app.models.prediction import PredictionResult

router = APIRouter(prefix="/heatmap", tags=["heatmap"])


@router.get("")
def get_heatmap(db: Session = Depends(get_db), _=Depends(get_current_user)):
    subq = (
        db.query(
            PredictionResult.region_id,
            func.max(PredictionResult.created_at).label("latest"),
        )
        .group_by(PredictionResult.region_id)
        .subquery()
    )

    rows = (
        db.query(Region, PredictionResult)
        .join(PredictionResult, PredictionResult.region_id == Region.id)
        .join(
            subq,
            (PredictionResult.region_id == subq.c.region_id)
            & (PredictionResult.created_at == subq.c.latest),
        )
        .all()
    )

    return [
        {
            "region_id": str(region.id),
            "region_name": region.name,
            "state": region.state,
            "latitude": region.latitude,
            "longitude": region.longitude,
            "hesitancy_score": prediction.hesitancy_score,
            "risk_level": prediction.risk_level,
        }
        for region, prediction in rows
    ]
