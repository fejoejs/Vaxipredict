from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user, require_analyst_up
from app.models.user import User
from app.models.region import Region
from app.models.intervention import InterventionPlan
from app.models.prediction import PredictionResult
from app.schemas.common import InterventionIn
from app.services.interventions import simulate

router = APIRouter(prefix="/interventions", tags=["interventions"])


@router.post("/simulate")
def create_intervention(payload: InterventionIn, db: Session = Depends(get_db), user: User = Depends(require_analyst_up)):
    region = db.query(Region).filter(Region.id == uuid.UUID(payload.region_id)).first()
    if not region:
        raise HTTPException(404, "Region not found")

    latest = (
        db.query(PredictionResult)
        .filter(PredictionResult.region_id == region.id)
        .order_by(PredictionResult.created_at.desc())
        .first()
    )
    current_hesitancy = latest.hesitancy_score if latest else 0.5

    projected_drop, budget = simulate(payload.strategy, current_hesitancy, region.population or 10000)

    plan = InterventionPlan(
        region_id=region.id,
        created_by=user.id,
        strategy=payload.strategy,
        target_group=payload.target_group,
        projected_hesitancy_drop=projected_drop,
        budget_estimate=budget,
        notes=payload.notes,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return {
        "id": str(plan.id),
        "region_id": str(region.id),
        "region_name": region.name,
        "strategy": plan.strategy,
        "current_hesitancy": current_hesitancy,
        "projected_hesitancy_drop": plan.projected_hesitancy_drop,
        "projected_hesitancy_after": round(max(current_hesitancy - plan.projected_hesitancy_drop, 0), 4),
        "budget_estimate": plan.budget_estimate,
    }


@router.get("")
def list_interventions(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (
        db.query(InterventionPlan, Region.name)
        .join(Region, Region.id == InterventionPlan.region_id)
        .order_by(InterventionPlan.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(p.id),
            "region_id": str(p.region_id),
            "region_name": region_name,
            "strategy": p.strategy,
            "target_group": p.target_group,
            "projected_hesitancy_drop": p.projected_hesitancy_drop,
            "budget_estimate": p.budget_estimate,
            "notes": p.notes,
            "created_at": p.created_at,
        }
        for p, region_name in rows
    ]
