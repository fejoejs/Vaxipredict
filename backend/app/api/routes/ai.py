from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any

from app.db.session import get_db
from app.api.deps import get_current_user
from app.services.ai_chat import get_ai_response

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatMessage(BaseModel):
    sender: str  # "user" or "ai"
    text: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    history: list[ChatMessage]


@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    reply = get_ai_response(payload.message, db)

    # Append the new user message and the reply to the history
    new_history = list(payload.history)
    new_history.append(ChatMessage(sender="user", text=payload.message))
    new_history.append(ChatMessage(sender="ai", text=reply))

    return ChatResponse(reply=reply, history=new_history)
