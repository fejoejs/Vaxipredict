import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vaccine_name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(60))  # childhood / adult / travel / outbreak-response
    summary: Mapped[str] = mapped_column(Text)
    recommended_schedule: Mapped[str] = mapped_column(Text, default="")
    common_myths: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
