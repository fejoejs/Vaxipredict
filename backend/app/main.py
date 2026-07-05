from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# Import all models to register them on the Base metadata prior to table creation
from app.models.user import User
from app.models.region import Region, RegionEdge
from app.models.dataset import Dataset, VaccinationRecord
from app.models.prediction import PredictionResult
from app.models.knowledge import KnowledgeArticle
from app.models.rumor import RumorReport
from app.models.reminder import Reminder
from app.models.intervention import InterventionPlan
from app.models.notification import Notification
from app.models.config import SystemConfig
from app.models.report import ReportLog

from app.api.routes import (
    auth,
    dashboard,
    datasets,
    predictions,
    heatmap,
    interventions,
    reminders,
    rumors,
    knowledge,
    analytics,
    reports,
    admin,
    notifications,
    ai,
)

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = settings.API_V1_PREFIX
for router in (
    auth.router,
    dashboard.router,
    datasets.router,
    predictions.router,
    heatmap.router,
    interventions.router,
    reminders.router,
    rumors.router,
    knowledge.router,
    analytics.router,
    reports.router,
    admin.router,
    notifications.router,
    ai.router,
):
    app.include_router(router, prefix=API)


@app.on_event("startup")
def on_startup():
    # For an initial deploy without Alembic migrations wired up yet, this
    # creates all tables if they don't already exist. Once the schema
    # stabilizes, switch to `alembic upgrade head` in the Render build step
    # and remove this call.
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"service": settings.PROJECT_NAME, "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}
