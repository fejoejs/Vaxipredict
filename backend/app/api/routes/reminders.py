from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user, require_worker_up
from app.models.user import User
from app.models.reminder import Reminder
from app.models.region import Region
from app.schemas.common import ReminderIn
from app.services.whatsapp import send_whatsapp_message

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.post("")
def create_reminder(payload: ReminderIn, db: Session = Depends(get_db), user: User = Depends(require_worker_up)):
    reminder = Reminder(
        region_id=uuid.UUID(payload.region_id),
        created_by=user.id,
        beneficiary_name=payload.beneficiary_name,
        contact=payload.contact,
        vaccine_name=payload.vaccine_name,
        due_date=payload.due_date,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return {"id": str(reminder.id), "status": reminder.status}


@router.get("")
def list_reminders(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (
        db.query(Reminder, Region.name)
        .join(Region, Region.id == Reminder.region_id)
        .order_by(Reminder.due_date.asc())
        .all()
    )
    return [
        {
            "id": str(r.id),
            "region_id": str(r.region_id),
            "region_name": region_name,
            "beneficiary_name": r.beneficiary_name,
            "contact": r.contact,
            "vaccine_name": r.vaccine_name,
            "due_date": r.due_date,
            "status": r.status,
        }
        for r, region_name in rows
    ]


@router.patch("/{reminder_id}/status")
def update_status(reminder_id: str, status: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    reminder = db.query(Reminder).filter(Reminder.id == uuid.UUID(reminder_id)).first()
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    if status not in {"pending", "sent", "completed", "missed"}:
        raise HTTPException(400, "Invalid status")
    reminder.status = status
    db.commit()
    return {"id": str(reminder.id), "status": reminder.status}


@router.post("/{reminder_id}/outreach")
def trigger_outreach(reminder_id: str, channel: str, db: Session = Depends(get_db), _=Depends(require_worker_up)):
    reminder = db.query(Reminder).filter(Reminder.id == uuid.UUID(reminder_id)).first()
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    if channel not in {"sms", "whatsapp"}:
        raise HTTPException(400, "Invalid channel")

    # Mock/Live dispatch message construction
    message = (
        f"Hello {reminder.beneficiary_name}, your immunization schedule for "
        f"{reminder.vaccine_name} is due on {reminder.due_date}. "
        f"Please visit your nearest outreach center. - VaxiPredict Support"
    )

    dispatch_msg = "Successfully dispatched via SMS simulation gateway."
    
    if channel == "whatsapp":
        res = send_whatsapp_message(reminder.contact, message)
        if res.get("status") == "failed":
            raise HTTPException(400, f"WhatsApp gateway dispatch failed: {res.get('error')}")
        elif res.get("status") == "success":
            dispatch_msg = f"Successfully dispatched via WhatsApp Business API (ID: {res.get('message_id')})."
        else:
            dispatch_msg = "Successfully dispatched via WhatsApp simulation gateway."

    # Automatically set state to sent
    reminder.status = "sent"
    db.commit()

    return {
        "status": "success",
        "channel": channel,
        "recipient": reminder.contact,
        "message": dispatch_msg,
        "template": message
    }
