from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_analyst_up
from app.models.user import User
from app.models.dataset import Dataset
from app.models.notification import Notification
from app.services.ingestion import parse_file, preprocess_and_store

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_up),
):
    content = await file.read()
    try:
        df = parse_file(file.filename, content)
    except Exception as exc:
        raise HTTPException(400, str(exc))

    file_type = file.filename.split(".")[-1].lower()
    dataset = Dataset(filename=file.filename, file_type=file_type, uploaded_by=user.id, row_count=len(df))
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    try:
        result = preprocess_and_store(db, dataset, df)
        # Create system notification for upload completion
        db.add(
            Notification(
                user_id=user.id,
                title="Dataset Ingestion Complete",
                message=f"CDC dataset '{dataset.filename}' processed successfully: Ingested {result['records_created']} rows (Quality Score: {result['quality_score']}).",
            )
        )
        db.commit()
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    return {"dataset_id": str(dataset.id), "filename": dataset.filename, **result}


@router.get("")
def list_datasets(db: Session = Depends(get_db), _=Depends(get_current_user)):
    datasets = db.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()
    return [
        {
            "id": str(d.id),
            "filename": d.filename,
            "file_type": d.file_type,
            "row_count": d.row_count,
            "status": d.status,
            "quality_score": d.quality_score,
            "uploaded_at": d.uploaded_at,
        }
        for d in datasets
    ]
