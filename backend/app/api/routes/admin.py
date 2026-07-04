from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.api.deps import require_admin
from app.models.user import User, UserRole
from app.models.region import Region, RegionEdge

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {"id": str(u.id), "full_name": u.full_name, "email": u.email, "role": u.role.value, "is_active": u.is_active}
        for u in users
    ]


@router.patch("/users/{user_id}/role")
def change_role(user_id: str, role: UserRole, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id:
        raise HTTPException(400, "You cannot modify your own administrative role.")
    user.role = role
    db.commit()
    return {"id": str(user.id), "role": user.role.value}


@router.patch("/users/{user_id}/status")
def toggle_active(user_id: str, is_active: bool, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id:
        raise HTTPException(400, "You cannot suspend your own administrative account.")
    user.is_active = is_active
    db.commit()
    return {"id": str(user.id), "is_active": user.is_active}


@router.post("/regions")
def create_region(payload: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    region = Region(
        name=payload["name"],
        state=payload.get("state", payload["name"]),
        latitude=payload.get("latitude", 0.0),
        longitude=payload.get("longitude", 0.0),
        population=payload.get("population", 0),
    )
    db.add(region)
    db.commit()
    db.refresh(region)
    return {"id": str(region.id)}


@router.post("/regions/edges")
def create_edge(payload: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    edge = RegionEdge(
        source_id=uuid.UUID(payload["source_id"]),
        target_id=uuid.UUID(payload["target_id"]),
        weight=payload.get("weight", 1.0),
    )
    db.add(edge)
    db.commit()
    return {"id": str(edge.id)}


@router.post("/config")
def update_config(payload: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    from app.models.config import SystemConfig
    key = payload.get("key")
    value = payload.get("value")
    if not key or value is None:
        raise HTTPException(400, "Key and value are required")

    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if not config:
        config = SystemConfig(key=key, value=value)
        db.add(config)
    else:
        config.value = value
    db.commit()
    return {"key": key, "status": "updated"}
