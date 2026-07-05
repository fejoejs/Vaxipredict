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
from app.ml.pipeline import run_hybrid_prediction

# 1. Create tables if they do not exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # 2. Check if admin user exists, if so skip seeding
    admin_exists = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if admin_exists:
        print("Database already initialized. Skipping seeding.")
    else:
        print("Initializing and seeding database...")
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
            ("Jharkhand", "Chhattisgarh"),
            ("Jharkhand", "Odisha"),
            ("Chhattisgarh", "Maharashtra"),
            ("Chhattisgarh", "Andhra Pradesh"),
            ("Chhattisgarh", "Odisha"),
            ("Maharashtra", "Karnataka"),
            ("Maharashtra", "Telangana"),
            ("Andhra Pradesh", "Odisha"),
            ("Andhra Pradesh", "Karnataka"),
            ("Andhra Pradesh", "Tamil Nadu"),
            ("Andhra Pradesh", "Telangana"),
            ("Karnataka", "Goa"),
            ("Karnataka", "Kerala"),
            ("Karnataka", "Tamil Nadu"),
            ("Tamil Nadu", "Kerala"),
            ("West Bengal", "Assam"),
        ]
        for src_name, dst_name in EDGES:
            if src_name in regions_by_name and dst_name in regions_by_name:
                u = regions_by_name[src_name]
                v = regions_by_name[dst_name]
                db.add(RegionEdge(source_id=u.id, target_id=v.id))
        db.flush()

        # 4. Seed Knowledge Articles
        print("Seeding knowledge articles...")
        articles = [
            KnowledgeArticle(
                title="Understanding Vaccine Hesitancy",
                content="Vaccine hesitancy refers to delay in acceptance or refusal of vaccines despite availability of vaccination services...",
                category="General",
                tags="basics, hesitancy",
                read_time_minutes=4
            ),
            KnowledgeArticle(
                title="Addressing Misinformation Campaigns",
                content="Misinformation is one of the key drivers of routine immunization failure. This guide details techniques...",
                category="Outreach",
                tags="misinformation, myths",
                read_time_minutes=7
            )
        ]
        for a in articles:
            db.add(a)
        db.flush()

        # 5. Seed Rumor Reports
        print("Seeding rumor reports...")
        rumors = [
            RumorReport(
                title="Infertility Myth in Uttar Pradesh",
                description="Rumors circulating on WhatsApp claiming vaccines cause fertility issues in rural villages.",
                source="WhatsApp Forward",
                region_id=regions_by_name["Uttar Pradesh"].id,
                reported_at=datetime.utcnow() - timedelta(days=2),
                status="verified",
                veracity_rating="debunked",
                veracity_explanation="WHO clinical trials have confirmed no link between immunization and reproductive health."
            )
        ]
        for r in rumors:
            db.add(r)
        db.flush()

        # 6. Seed Reminders
        print("Seeding reminders...")
        reminders = [
            Reminder(
                beneficiary_name="Aarav Sharma",
                phone_number="+919876543210",
                vaccine_type="MR-1",
                due_date=datetime.utcnow().date() + timedelta(days=3),
                status="pending",
                region_id=regions_by_name["Delhi"].id
            ),
            Reminder(
                beneficiary_name="Priya Patel",
                phone_number="+919876543211",
                vaccine_type="Pentavalent-3",
                due_date=datetime.utcnow().date() - timedelta(days=1),
                status="sent",
                region_id=regions_by_name["Maharashtra"].id
            )
        ]
        for rem in reminders:
            db.add(rem)
        db.flush()

        # 7. Seed Interventions
        print("Seeding interventions...")
        interventions = [
            InterventionPlan(
                title="Delhi Awareness Camp",
                description="Community awareness campaign focusing on debunking MMR rumors in local sectors.",
                region_id=regions_by_name["Delhi"].id,
                start_date=datetime.utcnow().date(),
                end_date=datetime.utcnow().date() + timedelta(days=10),
                budget=50000.0,
                status="planned",
                strategy="community_meeting"
            )
        ]
        for iv in interventions:
            db.add(iv)
        db.flush()

        # 8. Seed System Configuration
        db.add(SystemConfig(key="whatsapp_sandbox_mode", value="true"))
        db.add(SystemConfig(key="gemini_enabled", value="true"))
        db.flush()

        # 9. Seed Report Logs
        print("Seeding report logs...")
        reports = [
            ReportLog(
                title="Baseline Vulnerability Report",
                report_type="Vulnerability",
                generated_by=analyst_user.id,
                file_path="reports/baseline_vulnerability.pdf"
            )
        ]
        for rep in reports:
            db.add(rep)
        db.flush()

        # 10. Run initial machine learning forecast pipeline
        print("Running initial pipeline forecasts...")
        run_hybrid_prediction(db, "2026-06")

        db.commit()
        print("Database initialization and seeding completed successfully!")
finally:
    db.close()
