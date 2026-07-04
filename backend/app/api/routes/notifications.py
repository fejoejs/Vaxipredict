from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.notification import Notification
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all notifications for the authenticated user."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.put("/read-all")
def read_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all unread notifications of the user as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"status": "success"}


@router.put("/{notification_id}/read")
def read_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a specific notification as read."""
    try:
        notif_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(400, "Invalid notification ID format")

    notification = (
        db.query(Notification)
        .filter(Notification.id == notif_uuid, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(404, "Notification not found")

    notification.is_read = True
    db.commit()
    return {"status": "success"}


@router.post("/issue")
def report_issue(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    description = payload.get("description")
    if not description:
        raise HTTPException(400, "Description is required")

    # Find all admin users
    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    for admin in admins:
        db.add(
            Notification(
                user_id=admin.id,
                title=f"New Issue Report from {current_user.full_name}",
                message=description,
            )
        )
    db.commit()
    return {"status": "success"}
