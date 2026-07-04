from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user, require_analyst_up, require_worker_up
from app.models.user import User
from app.models.rumor import RumorReport
from app.models.region import Region
from app.schemas.common import RumorIn
from app.services.rumor_nlp import analyze_rumor_content

router = APIRouter(prefix="/rumors", tags=["rumors"])


@router.post("")
def submit_rumor(payload: RumorIn, db: Session = Depends(get_db), user: User = Depends(require_worker_up)):
    analysis = analyze_rumor_content(payload.content)
    risk_score = analysis["risk_score"]
    report = RumorReport(
        region_id=uuid.UUID(payload.region_id),
        submitted_by=user.id,
        source=payload.source,
        content=payload.content,
        risk_score=risk_score,
        status="flagged" if risk_score >= 0.25 else "reviewed",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {
        "id": str(report.id),
        "risk_score": risk_score,
        "status": report.status,
        "classification": analysis["classification"]
    }


@router.get("")
def list_rumors(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (
        db.query(RumorReport, Region.name)
        .join(Region, Region.id == RumorReport.region_id)
        .order_by(RumorReport.created_at.desc())
        .all()
    )
    res = []
    for r, region_name in rows:
        analysis = analyze_rumor_content(r.content)
        res.append({
            "id": str(r.id),
            "region_id": str(r.region_id),
            "region_name": region_name,
            "source": r.source,
            "content": r.content,
            "risk_score": r.risk_score,
            "status": r.status,
            "created_at": r.created_at,
            "classification": analysis["classification"],
        })
    return res


@router.patch("/{rumor_id}/status")
def update_rumor_status(rumor_id: str, status: str, db: Session = Depends(get_db), _=Depends(require_analyst_up)):
    rumor = db.query(RumorReport).filter(RumorReport.id == uuid.UUID(rumor_id)).first()
    if not rumor:
        raise HTTPException(404, "Rumor report not found")
    if status not in {"flagged", "reviewed", "dismissed"}:
        raise HTTPException(400, "Invalid status")
    rumor.status = status
    db.commit()
    return {"id": str(rumor.id), "status": rumor.status}
