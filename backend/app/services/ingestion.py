from __future__ import annotations

import io
import pandas as pd
from sqlalchemy.orm import Session

from app.models.region import Region
from app.models.dataset import Dataset, VaccinationRecord

REQUIRED_COLUMNS = {"region", "period", "doses_administered", "eligible_population"}
OPTIONAL_COLUMNS = {"hesitancy_rate", "misinformation_index", "state", "population"}


def parse_file(filename: str, content: bytes) -> pd.DataFrame:
    lower = filename.lower()
    if lower.endswith(".csv"):
        return pd.read_csv(io.BytesIO(content))
    if lower.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(content))
    if lower.endswith(".json"):
        return pd.read_json(io.BytesIO(content))
    raise ValueError("Unsupported file type. Please upload CSV, Excel, or JSON.")


def quality_score(df: pd.DataFrame) -> float:
    """Simple completeness + validity score used to surface data quality on
    the Preprocessing page, mirroring the 'data quality checks' step from
    the original pipeline."""
    if df.empty:
        return 0.0
    completeness = 1 - df.isnull().mean().mean()
    has_required = 1.0 if REQUIRED_COLUMNS.issubset({c.lower() for c in df.columns}) else 0.5
    return round(float(completeness) * has_required, 4)


def preprocess_and_store(db: Session, dataset: Dataset, df: pd.DataFrame) -> dict:
    df.columns = [c.strip().lower() for c in df.columns]
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        dataset.status = "failed"
        db.commit()
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

    df = df.dropna(subset=["region", "period"])
    df["doses_administered"] = pd.to_numeric(df["doses_administered"], errors="coerce").fillna(0)
    df["eligible_population"] = pd.to_numeric(df["eligible_population"], errors="coerce").fillna(0)
    df["hesitancy_rate"] = pd.to_numeric(df.get("hesitancy_rate", 0), errors="coerce").fillna(0).clip(0, 1)
    df["misinformation_index"] = pd.to_numeric(df.get("misinformation_index", 0), errors="coerce").fillna(0).clip(0, 1)

    created_records = 0
    for _, row in df.iterrows():
        region = db.query(Region).filter(Region.name == str(row["region"]).strip()).first()
        if not region:
            region = Region(
                name=str(row["region"]).strip(),
                state=str(row.get("state", "")).strip() or str(row["region"]).strip(),
                population=int(row.get("population", 0) or 0),
            )
            db.add(region)
            db.flush()

        record = VaccinationRecord(
            dataset_id=dataset.id,
            region_id=region.id,
            period=str(row["period"]),
            doses_administered=int(row["doses_administered"]),
            eligible_population=int(row["eligible_population"]),
            hesitancy_rate=float(row["hesitancy_rate"]),
            misinformation_index=float(row["misinformation_index"]),
        )
        db.add(record)
        created_records += 1

    dataset.row_count = created_records
    dataset.status = "preprocessed"
    dataset.quality_score = quality_score(df)
    db.commit()

    return {"records_created": created_records, "quality_score": dataset.quality_score}
