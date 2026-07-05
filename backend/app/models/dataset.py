import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class Dataset(Base):
    """A single uploaded file (CSV/Excel/JSON) and its processing state."""
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(20))
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="uploaded")  # uploaded -> preprocessed -> failed
    quality_score: Mapped[float] = mapped_column(Float, default=0.0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VaccinationRecord(Base):
    """Normalized per-region, per-time-step record — the temporal signal for the LSTM."""
    __tablename__ = "vaccination_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"))
    region_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("regions.id"), index=True)
    period: Mapped[str] = mapped_column(String(20), index=True)  # e.g. "2026-05"
    doses_administered: Mapped[int] = mapped_column(Integer, default=0)
    eligible_population: Mapped[int] = mapped_column(Integer, default=0)
    hesitancy_rate: Mapped[float] = mapped_column(Float, default=0.0)
    misinformation_index: Mapped[float] = mapped_column(Float, default=0.0)
