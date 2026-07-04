import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class PredictionResult(Base):
    """Output of the hybrid GNN+LSTM fusion model for one region at one point in time."""
    __tablename__ = "prediction_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("regions.id"))
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"))
    period: Mapped[str] = mapped_column(String(20))
    hesitancy_score: Mapped[float] = mapped_column(Float)       # 0..1
    confidence: Mapped[float] = mapped_column(Float)            # 0..1
    risk_level: Mapped[str] = mapped_column(String(20))         # low / moderate / high / critical
    gnn_embedding_norm: Mapped[float] = mapped_column(Float, default=0.0)
    lstm_trend_slope: Mapped[float] = mapped_column(Float, default=0.0)
    model_version: Mapped[str] = mapped_column(String(50), default="hybrid-gnn-lstm-v0-heuristic")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
