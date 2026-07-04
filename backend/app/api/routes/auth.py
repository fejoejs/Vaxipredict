from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserOut
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.HEALTH_WORKER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    token = create_access_token(subject=str(user.id), role=user.role.value)
    
    # Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=60 * 24 * 60,  # 24h
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
        path="/"
    )
    
    return TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"status": "success"}


@router.put("/profile")
def update_profile(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    full_name = payload.get("full_name")
    password = payload.get("password")
    if full_name:
        current_user.full_name = full_name
    if password:
        current_user.hashed_password = hash_password(password)
    db.commit()
    db.refresh(current_user)
    return {"id": str(current_user.id), "full_name": current_user.full_name, "email": current_user.email}


import urllib.request
import json
import uuid
from pydantic import BaseModel


class GoogleLoginRequest(BaseModel):
    credential: str


@router.get("/google/client-id")
def get_google_client_id(db: Session = Depends(get_db)):
    from app.models.config import SystemConfig
    config = db.query(SystemConfig).filter(SystemConfig.key == "google_client_id").first()
    client_id = config.value if config else settings.GOOGLE_CLIENT_ID
    return {"client_id": client_id}


@router.post("/google", response_model=TokenResponse)
def google_login(
    payload: GoogleLoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    token = payload.credential

    # 1. Query Google tokeninfo endpoint to verify token
    tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
    try:
        req = urllib.request.Request(tokeninfo_url, method="GET")
        with urllib.request.urlopen(req, timeout=10) as res:
            res_body = res.read().decode("utf-8")
            token_info = json.loads(res_body)
    except Exception as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Google token verification failed: {str(e)}")

    # 2. Check audience (client ID validation)
    aud = token_info.get("aud")
    from app.models.config import SystemConfig
    config = db.query(SystemConfig).filter(SystemConfig.key == "google_client_id").first()
    client_id = config.value if config else settings.GOOGLE_CLIENT_ID
    if client_id and aud != client_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid token audience")

    email = token_info.get("email")
    full_name = token_info.get("name", email.split("@")[0])

    if not email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Google token missing email address")

    # 3. Find or provision user in DB
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            full_name=full_name,
            email=email,
            hashed_password=hash_password(str(uuid.uuid4())),  # SSO users don't use passwords
            role=UserRole.VIEWER,  # Default public read-only role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create a welcome notification
        from app.models.notification import Notification
        db.add(
            Notification(
                user_id=user.id,
                title="Welcome to VaxiPredict via Google SSO",
                message=f"Hello {user.full_name}, your account was automatically provisioned with the public Viewer role.",
            )
        )
        db.commit()

    elif not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User account is suspended")

    # 4. Generate access token
    session_token = create_access_token(subject=str(user.id), role=user.role.value)

    # Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=session_token,
        httponly=True,
        max_age=60 * 24 * 60,  # 24h
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
        path="/"
    )

    return TokenResponse(access_token=session_token, role=user.role, full_name=user.full_name)
