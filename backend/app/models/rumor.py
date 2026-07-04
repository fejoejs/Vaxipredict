import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class RumorReport(Base):
    __tablename__ = "rumor_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("regions.id"))
    submitted_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    source: Mapped[str] = mapped_column(String(120))  # social_media / community / sms / other
    content: Mapped[str] = mapped_column(Text)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)   # 0..1, keyword+heuristic scored
    status: Mapped[str] = mapped_column(String(20), default="flagged")  # flagged / reviewed / dismissed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
