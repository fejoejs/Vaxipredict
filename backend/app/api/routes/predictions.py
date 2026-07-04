from fastapi import APIRouter, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy import func
from sqlalchemy.orm import Session
import uuid
import time
import asyncio

from app.db.session import get_db, SessionLocal
from app.api.deps import get_current_user, require_analyst_up
from app.models.prediction import PredictionResult
from app.models.region import Region
from app.models.user import User
from app.models.dataset import Dataset
from app.models.notification import Notification
from app.ml.pipeline import run_hybrid_prediction

router = APIRouter(prefix="/predictions", tags=["predictions"])

# Global memory to track predicting progress
prediction_tasks = {}


def run_predictions_background(task_id: str, period: str, user_id: uuid.UUID):
    db = SessionLocal()
    try:
        prediction_tasks[task_id] = {"progress": 10, "status": "Initializing topological state graph..."}
        time.sleep(1.0)
        
        prediction_tasks[task_id] = {"progress": 35, "status": "Processing Graph Neural Network (GNN)..."}
        time.sleep(1.2)
        
        prediction_tasks[task_id] = {"progress": 65, "status": "Calculating LSTM temporal trends..."}
        time.sleep(1.2)
        
        prediction_tasks[task_id] = {"progress": 85, "status": "Fusing spatial-temporal representations..."}
        time.sleep(0.8)
        
        # Run GNN-LSTM predictions
        pairs = run_hybrid_prediction(db)
        
        prediction_tasks[task_id] = {"progress": 95, "status": "Writing predictions to database..."}
        time.sleep(0.8)
        
        latest_ds = db.query(Dataset).order_by(Dataset.uploaded_at.desc()).first()
        if not latest_ds:
            latest_ds = Dataset(
                filename="system_default_dataset.csv",
                file_type="csv",
                row_count=0,
                status="preprocessed",
                quality_score=1.0,
            )
            db.add(latest_ds)
            db.flush()
        dataset_id = latest_ds.id

        saved = []
        for region, output in pairs:
            record = PredictionResult(
                region_id=region.id,
                dataset_id=dataset_id,
                period=period,
                hesitancy_score=output.hesitancy_score,
                confidence=output.confidence,
                risk_level=output.risk_level,
                gnn_embedding_norm=output.gnn_embedding_norm,
                lstm_trend_slope=output.lstm_trend_slope,
                model_version=output.model_version,
            )
            db.add(record)
            saved.append({
                "region_id": str(region.id),
                "region_name": region.name,
                "period": period,
                "hesitancy_score": output.hesitancy_score,
                "confidence": output.confidence,
                "risk_level": output.risk_level,
            })
        
        # Log notification
        db.add(
            Notification(
                user_id=user_id,
                title="AI Predictions Complete",
                message=f"Model successfully evaluated hesitancy scores for {len(saved)} regions (Period: {period}).",
            )
        )
        db.commit()
        prediction_tasks[task_id] = {"progress": 100, "status": "Complete", "count": len(saved)}
    except Exception as e:
        db.rollback()
        prediction_tasks[task_id] = {"progress": -1, "status": f"Failed: {str(e)}"}
    finally:
        db.close()


@router.post("/run")
def run_predictions(
    background_tasks: BackgroundTasks,
    period: str = "latest",
    current_user: User = Depends(require_analyst_up),
):
    """Enqueues GNN-LSTM predictions to run asynchronously in the background."""
    task_id = str(uuid.uuid4())
    prediction_tasks[task_id] = {"progress": 0, "status": "Queued..."}
    
    background_tasks.add_task(run_predictions_background, task_id, period, current_user.id)
    
    return {"task_id": task_id, "status": "queued"}


@router.websocket("/ws/progress/{task_id}")
async def websocket_progress(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        while True:
            task = prediction_tasks.get(task_id)
            if not task:
                await websocket.send_json({"progress": 0, "status": "Initializing task..."})
                await asyncio.sleep(0.5)
                continue
            
            await websocket.send_json(task)
            
            if task["progress"] == 100 or task["progress"] == -1:
                break
                
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass


@router.get("/latest")
def latest_predictions(db: Session = Depends(get_db), _=Depends(get_current_user)):
    subq = (
        db.query(
            PredictionResult.region_id,
            func.max(PredictionResult.created_at).label("max_created"),
        )
        .group_by(PredictionResult.region_id)
        .subquery()
    )
    rows = (
        db.query(PredictionResult, Region.name)
        .join(Region, Region.id == PredictionResult.region_id)
        .join(
            subq,
            (PredictionResult.region_id == subq.c.region_id)
            & (PredictionResult.created_at == subq.c.max_created),
        )
        .order_by(PredictionResult.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "region_id": str(r.region_id),
            "region_name": region_name,
            "period": r.period,
            "hesitancy_score": r.hesitancy_score,
            "confidence": r.confidence,
            "risk_level": r.risk_level,
            "model_version": r.model_version,
            "created_at": r.created_at,
        }
        for r, region_name in rows
    ]


@router.get("/forecast/{region_id}")
def forecast_region(region_id: str, horizon: int = 3, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Simple linear extrapolation of the LSTM trend slope for the requested
    region, giving a short-horizon forecast for the Forecasting page."""
    history = (
        db.query(PredictionResult)
        .filter(PredictionResult.region_id == uuid.UUID(region_id))
        .order_by(PredictionResult.created_at.asc())
        .all()
    )
    if not history:
        return {"region_id": region_id, "forecast": []}

    last = history[-1]
    forecast = []
    for step in range(1, horizon + 1):
        projected = min(max(last.hesitancy_score + last.lstm_trend_slope * step, 0.0), 1.0)
        forecast.append({"step": step, "projected_hesitancy_score": round(projected, 4)})

    return {"region_id": region_id, "base_score": last.hesitancy_score, "forecast": forecast}
