from datetime import date, datetime
from pydantic import BaseModel


class RegionOut(BaseModel):
    id: str
    name: str
    state: str
    latitude: float
    longitude: float
    population: int

    class Config:
        from_attributes = True


class PredictionOut(BaseModel):
    region_id: str
    region_name: str
    period: str
    hesitancy_score: float
    confidence: float
    risk_level: str
    gnn_embedding_norm: float
    lstm_trend_slope: float
    model_version: str


class ReminderIn(BaseModel):
    region_id: str
    beneficiary_name: str
    contact: str
    vaccine_name: str
    due_date: date


class ReminderOut(ReminderIn):
    id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class RumorIn(BaseModel):
    region_id: str
    source: str
    content: str


class RumorOut(BaseModel):
    id: str
    region_id: str
    source: str
    content: str
    risk_score: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class InterventionIn(BaseModel):
    region_id: str
    strategy: str
    target_group: str = "general"
    notes: str = ""


class InterventionOut(InterventionIn):
    id: str
    projected_hesitancy_drop: float
    budget_estimate: float
    created_at: datetime

    class Config:
        from_attributes = True


class KnowledgeOut(BaseModel):
    id: str
    vaccine_name: str
    category: str
    summary: str
    recommended_schedule: str
    common_myths: str

    class Config:
        from_attributes = True
