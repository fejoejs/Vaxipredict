import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_analyst_up
from app.models.user import User
from app.models.prediction import PredictionResult
from app.models.region import Region
from app.models.rumor import RumorReport
from app.models.intervention import InterventionPlan
from app.models.report import ReportLog
from app.services.report_builder import build_csv, build_excel, build_pdf

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_SOURCES = {"predictions", "interventions", "rumors"}


def _fetch_rows(db: Session, report_type: str) -> list[dict]:
    if report_type == "predictions":
        rows = (
            db.query(Region.name, PredictionResult.period, PredictionResult.hesitancy_score,
                      PredictionResult.confidence, PredictionResult.risk_level)
            .join(PredictionResult, PredictionResult.region_id == Region.id)
            .order_by(PredictionResult.created_at.desc())
            .limit(500)
            .all()
        )
        return [
            {"region": n, "period": p, "hesitancy_score": h, "confidence": c, "risk_level": r}
            for n, p, h, c, r in rows
        ]
    if report_type == "interventions":
        plans = db.query(InterventionPlan).order_by(InterventionPlan.created_at.desc()).limit(500).all()
        return [
            {
                "strategy": p.strategy,
                "target_group": p.target_group,
                "projected_hesitancy_drop": p.projected_hesitancy_drop,
                "budget_estimate": p.budget_estimate,
            }
            for p in plans
        ]
    if report_type == "rumors":
        rumors = db.query(RumorReport).order_by(RumorReport.created_at.desc()).limit(500).all()
        return [
            {"source": r.source, "risk_score": r.risk_score, "status": r.status, "content": r.content[:120]}
            for r in rumors
        ]
    return []


@router.post("/generate")
def generate_report(
    report_type: str,
    file_format: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_up),
):
    if report_type not in REPORT_SOURCES:
        raise HTTPException(400, f"report_type must be one of {sorted(REPORT_SOURCES)}")
    if file_format not in {"pdf", "csv", "excel"}:
        raise HTTPException(400, "file_format must be pdf, csv, or excel")

    rows = _fetch_rows(db, report_type)
    builder = {"pdf": build_pdf, "csv": build_csv, "excel": build_excel}[file_format]
    path = builder(rows, report_type)

    log = ReportLog(generated_by=user.id, report_type=report_type, file_format=file_format, file_path=path)
    db.add(log)
    db.commit()
    db.refresh(log)

    return {"report_id": str(log.id), "download_url": f"/api/v1/reports/{log.id}/download"}


@router.get("/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db), _=Depends(require_analyst_up)):
    log = db.query(ReportLog).filter(ReportLog.id == uuid.UUID(report_id)).first()
    if not log:
        raise HTTPException(404, "Report not found")
    if not os.path.exists(log.file_path):
        raise HTTPException(404, "Report file not found on disk")
    media_types = {"pdf": "application/pdf", "csv": "text/csv",
                   "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
    return FileResponse(log.file_path, media_type=media_types[log.file_format], filename=os.path.basename(log.file_path))


@router.get("")
def list_reports(db: Session = Depends(get_db), _=Depends(require_analyst_up)):
    logs = db.query(ReportLog).order_by(ReportLog.created_at.desc()).all()
    return [
        {"id": str(l.id), "report_type": l.report_type, "file_format": l.file_format, "created_at": l.created_at}
        for l in logs
    ]
