from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.region import Region
from app.models.dataset import Dataset, VaccinationRecord
from app.models.prediction import PredictionResult
from app.models.rumor import RumorReport
from app.models.reminder import Reminder

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    total_regions = db.query(func.count(Region.id)).scalar() or 0
    total_datasets = db.query(func.count(Dataset.id)).scalar() or 0
    avg_hesitancy = db.query(func.avg(PredictionResult.hesitancy_score)).scalar() or 0.0
    high_risk_regions = (
        db.query(func.count(func.distinct(PredictionResult.region_id)))
        .filter(PredictionResult.risk_level.in_(["high", "critical"]))
        .scalar()
        or 0
    )
    active_rumors = db.query(func.count(RumorReport.id)).filter(RumorReport.status == "flagged").scalar() or 0
    pending_reminders = db.query(func.count(Reminder.id)).filter(Reminder.status == "pending").scalar() or 0
    total_doses = db.query(func.sum(VaccinationRecord.doses_administered)).scalar() or 0

    risk_breakdown = dict(
        db.query(PredictionResult.risk_level, func.count(PredictionResult.id))
        .group_by(PredictionResult.risk_level)
        .all()
    )

    return {
        "total_regions": total_regions,
        "total_datasets": total_datasets,
        "average_hesitancy_score": round(float(avg_hesitancy), 4),
        "high_risk_regions": high_risk_regions,
        "active_rumors": active_rumors,
        "pending_reminders": pending_reminders,
        "total_doses_administered": int(total_doses),
        "risk_breakdown": risk_breakdown,
    }


@router.get("/regions")
def get_regions(db: Session = Depends(get_db), _=Depends(get_current_user)):
    regions = db.query(Region).order_by(Region.name.asc()).all()
    return [{"id": str(r.id), "name": r.name, "state": r.state, "population": r.population} for r in regions]
