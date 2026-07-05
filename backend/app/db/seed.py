import os
import csv
from datetime import datetime, timedelta

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.user import User, UserRole
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
from app.core.security import hash_password
from app.core.config import settings
from app.ml.pipeline import run_hybrid_prediction

# Re-initialize tables
if engine.url.drivername.startswith("postgresql"):
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.commit()
else:
    Base.metadata.drop_all(bind=engine)

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# 1. Seed users
print("Seeding users...")
admin_user = User(
    full_name="System Administrator",
    email="admin@vaxipredict.io",
    hashed_password=hash_password("Admin@123"),
    role=UserRole.ADMIN,
)
db.add(admin_user)

analyst_user = User(
    full_name="Jane Doe (Analyst)",
    email="analyst@vaxipredict.io",
    hashed_password=hash_password("Analyst@123"),
    role=UserRole.ANALYST,
)
db.add(analyst_user)

worker_user = User(
    full_name="Dr. John Smith",
    email="worker@vaxipredict.io",
    hashed_password=hash_password("Worker@123"),
    role=UserRole.HEALTH_WORKER,
)
db.add(worker_user)
db.flush()

# 2. Seed CDC Dataset and records
print("Seeding CDC dataset and vaccination records...")
dataset = Dataset(
    filename="cdc_vaccine_hesitancy.csv",
    file_type="csv",
    uploaded_by=analyst_user.id,
    row_count=120,  # 20 states * 6 periods
    status="preprocessed",
    quality_score=0.98,
)
db.add(dataset)
db.flush()

# Map states metadata
STATES_METADATA = [
    ("Uttar Pradesh", 200000000, 26.8467, 80.9462),
    ("Maharashtra", 112000000, 19.7515, 75.7139),
    ("Bihar", 104000000, 25.0961, 85.3131),
    ("West Bengal", 91000000, 22.9868, 87.8550),
    ("Madhya Pradesh", 72000000, 22.9734, 78.6569),
    ("Tamil Nadu", 72000000, 11.1271, 78.6569),
    ("Rajasthan", 68000000, 27.0238, 74.2179),
    ("Karnataka", 61000000, 15.3173, 75.7139),
    ("Gujarat", 60000000, 22.2587, 71.1924),
    ("Andhra Pradesh", 49000000, 15.9129, 79.7400),
    ("Odisha", 41000000, 20.9517, 85.0985),
    ("Telangana", 35000000, 18.1124, 79.0193),
    ("Kerala", 33000000, 10.8505, 76.2711),
    ("Jharkhand", 32000000, 23.6102, 85.2799),
    ("Assam", 31000000, 26.2006, 92.9376),
    ("Punjab", 27000000, 31.1471, 75.3412),
    ("Haryana", 25000000, 29.0588, 76.0856),
    ("Chhattisgarh", 25000000, 21.2787, 81.8661),
    ("Delhi", 19000000, 28.6139, 77.2090),
    ("Jammu & Kashmir", 12000000, 33.7782, 76.5762),
]

regions_by_name = {}
for name, pop, lat, lon in STATES_METADATA:
    r = Region(name=name, state=name, population=pop, latitude=lat, longitude=lon)
    db.add(r)
    regions_by_name[name] = r
db.flush()

# Read CSV records and insert into DB
csv_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads",
    "cdc_vaccine_hesitancy.csv",
)
with open(csv_path, mode="r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        state_name = row["region"]
        region = regions_by_name[state_name]
        rec = VaccinationRecord(
            dataset_id=dataset.id,
            region_id=region.id,
            period=row["period"],
            doses_administered=int(row["doses_administered"]),
            eligible_population=int(row["eligible_population"]),
            hesitancy_rate=float(row["hesitancy_rate"]),
            misinformation_index=float(row["misinformation_index"]),
        )
        db.add(rec)
db.flush()

# 3. Seed region edges
print("Seeding geographical edges...")
EDGES = [
    ("Jammu & Kashmir", "Punjab"),
    ("Punjab", "Haryana"),
    ("Punjab", "Rajasthan"),
    ("Haryana", "Delhi"),
    ("Haryana", "Rajasthan"),
    ("Haryana", "Uttar Pradesh"),
    ("Delhi", "Uttar Pradesh"),
    ("Rajasthan", "Gujarat"),
    ("Rajasthan", "Madhya Pradesh"),
    ("Gujarat", "Maharashtra"),
    ("Gujarat", "Madhya Pradesh"),
    ("Madhya Pradesh", "Uttar Pradesh"),
    ("Madhya Pradesh", "Chhattisgarh"),
    ("Madhya Pradesh", "Maharashtra"),
    ("Uttar Pradesh", "Bihar"),
    ("Bihar", "Jharkhand"),
    ("Bihar", "West Bengal"),
    ("Jharkhand", "West Bengal"),
    ("Jharkhand", "Odisha"),
    ("Jharkhand", "Chhattisgarh"),
    ("Chhattisgarh", "Odisha"),
    ("Chhattisgarh", "Maharashtra"),
    ("Chhattisgarh", "Andhra Pradesh"),
    ("Odisha", "Andhra Pradesh"),
    ("Odisha", "West Bengal"),
    ("Maharashtra", "Karnataka"),
    ("Maharashtra", "Telangana"),
    ("Karnataka", "Telangana"),
    ("Karnataka", "Andhra Pradesh"),
    ("Karnataka", "Tamil Nadu"),
    ("Karnataka", "Kerala"),
    ("Andhra Pradesh", "Telangana"),
    ("Andhra Pradesh", "Tamil Nadu"),
    ("Tamil Nadu", "Kerala"),
    ("Assam", "West Bengal"),
]

for u, v in EDGES:
    edge = RegionEdge(
        source_id=regions_by_name[u].id,
        target_id=regions_by_name[v].id,
        weight=1.0,
    )
    db.add(edge)
db.flush()

# 4. Run model predictions and seed PredictionResult
print("Running AI model predictions and seeding risk scores...")
pairs = run_hybrid_prediction(db)
for region, output in pairs:
    pred = PredictionResult(
        region_id=region.id,
        dataset_id=dataset.id,
        period="2026-06",
        hesitancy_score=output.hesitancy_score,
        confidence=output.confidence,
        risk_level=output.risk_level,
        gnn_embedding_norm=output.gnn_embedding_norm,
        lstm_trend_slope=output.lstm_trend_slope,
        model_version=output.model_version,
    )
    db.add(pred)
db.flush()

# 5. Seed knowledge articles
print("Seeding knowledge library...")
knowledge_seed = [
    ("MMR (Measles, Mumps, Rubella)", "childhood",
     "Protects against measles, mumps, and rubella with two doses.",
     "Dose 1 at 12-15 months, Dose 2 at 4-6 years.",
     "Myth: causes autism — repeatedly disproven by large-scale studies."),
    ("DTP (Diphtheria, Tetanus, Pertussis)", "childhood",
     "Protects against three serious bacterial diseases.",
     "5-dose series between 2 months and 6 years.",
     "Myth: natural immunity is safer — untreated cases can be fatal."),
    ("Influenza", "adult",
     "Annual vaccine reducing seasonal flu severity and spread.",
     "One dose annually, ideally before flu season.",
     "Myth: the flu shot gives you the flu — it uses inactivated virus."),
    ("HPV", "adult",
     "Protects against HPV strains linked to several cancers.",
     "2-3 doses depending on age at first dose.",
     "Myth: only necessary for one gender — HPV affects everyone."),
    ("Yellow Fever", "travel",
     "Required for entry to many countries in endemic zones.",
     "Single dose, lifetime protection for most travelers.",
     "Myth: only needed for direct exposure regions — required by transit rules too."),
    ("BCG (Tuberculosis)", "childhood",
     "Protects infants against tuberculous meningitis and disseminated tuberculosis.",
     "Single dose given at birth.",
     "Myth: BCG makes a child immune to COVID-19 — there is no conclusive scientific evidence supporting this claim."),
    ("OPV & IPV (Polio)", "childhood",
     "Protects against polio paralysis. India is polio-free, but routine drops prevent resurgence.",
     "OPV drops at birth, 6, 10, 14 weeks. IPV injected at 6 and 14 weeks.",
     "Myth: polio drops cause sterilization — a thoroughly disproven rumor from population health studies."),
    ("Pentavalent Vaccine", "childhood",
     "Protects against Diphtheria, Pertussis, Tetanus, Hepatitis B, and Haemophilus influenzae type b.",
     "Three doses at 6, 10, and 14 weeks.",
     "Myth: too many vaccines at once overload a baby — infant immune systems safely process multiple antigens."),
    ("Rotavirus Vaccine", "childhood",
     "Protects infants against severe dehydrating rotavirus diarrhea.",
     "Three oral drops at 6, 10, and 14 weeks.",
     "Myth: oral drops cause infection — they contain weakened virus to train immunity safely."),
]
for name, cat, summary, schedule, myths in knowledge_seed:
    db.add(KnowledgeArticle(
        vaccine_name=name,
        category=cat,
        summary=summary,
        recommended_schedule=schedule,
        common_myths=myths,
    ))

# 6. Seed rumors
print("Seeding rumors...")
rumors = [
    ("Uttar Pradesh", "social_media", "Viral posts claim MMR vaccines contain secret microchips.", 0.65, "flagged"),
    ("Maharashtra", "community", "Local flyers claim flu shots make you more susceptible to COVID.", 0.42, "flagged"),
    ("Bihar", "social_media", "TikTok videos allege HPV vaccines cause early menopause.", 0.78, "flagged"),
    ("West Bengal", "sms", "Spam texts warning against childhood vaccines.", 0.28, "reviewed"),
    ("Madhya Pradesh", "other", "Flyers at a local transit station advising against travel vaccines.", 0.12, "dismissed"),
]
for reg_name, src, content, score, status in rumors:
    db.add(RumorReport(
        region_id=regions_by_name[reg_name].id,
        submitted_by=worker_user.id,
        source=src,
        content=content,
        risk_score=score,
        status=status,
    ))

# 7. Seed reminders
print("Seeding reminders...")
due_1 = datetime.utcnow().date() + timedelta(days=2)
due_2 = datetime.utcnow().date() + timedelta(days=5)
due_3 = datetime.utcnow().date() + timedelta(days=12)

reminders = [
    ("Uttar Pradesh", "Amit Sharma", "+91-98765-43210", "MMR", due_1, "pending"),
    ("Maharashtra", "Priya Patil", "+91-98234-56789", "DTP", due_2, "pending"),
    ("Bihar", "Rahul Kumar", "+91-99345-67890", "HPV", due_3, "sent"),
]
for reg_name, name, contact, vaccine, due, status in reminders:
    db.add(Reminder(
        region_id=regions_by_name[reg_name].id,
        created_by=worker_user.id,
        beneficiary_name=name,
        contact=contact,
        vaccine_name=vaccine,
        due_date=due,
        status=status,
    ))

# 8. Seed interventions
print("Seeding interventions...")
interventions = [
    ("Uttar Pradesh", "awareness_campaign", "Parents", 0.08, 12000),
    ("Maharashtra", "mobile_clinic", "Rural families", 0.12, 35000),
]
for reg_name, strategy, target, drop, budget in interventions:
    db.add(InterventionPlan(
        region_id=regions_by_name[reg_name].id,
        created_by=analyst_user.id,
        strategy=strategy,
        target_group=target,
        projected_hesitancy_drop=drop,
        budget_estimate=budget,
        notes="Pre-seeded campaign",
    ))

# 9. Seed notifications
print("Seeding notifications...")
notifications = [
    (admin_user.id, "Welcome to VaxiPredict", "The platform is fully configured. The trained Indian GNN-LSTM model is loaded."),
    (admin_user.id, "Indian Dataset Uploaded", "The original Indian vaccine hesitancy dataset has been parsed and seeded successfully."),
    (analyst_user.id, "Pipeline Ran Successfully", "AI model completed forecasting hesitancy levels across all 20 Indian states."),
    (worker_user.id, "Pending Reminders Alert", "You have 2 pending vaccination reminders due in the next 5 days."),
]
for uid, title, msg in notifications:
    db.add(Notification(
        user_id=uid,
        title=title,
        message=msg,
        is_read=False,
    ))

# 10. Seed System configurations
print("Seeding system configuration parameters...")
if settings.GEMINI_API_KEY:
    db.add(SystemConfig(key="gemini_api_key", value=settings.GEMINI_API_KEY))
else:
    print("Warning: GEMINI_API_KEY not configured in .env. Skipping config seeding.")

db.commit()
db.close()
print("Database seeding completed successfully!")
