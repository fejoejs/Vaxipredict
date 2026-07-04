from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user, require_admin
from app.models.knowledge import KnowledgeArticle

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("")
def list_articles(category: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    query = db.query(KnowledgeArticle)
    if category:
        query = query.filter(KnowledgeArticle.category == category)
    articles = query.order_by(KnowledgeArticle.vaccine_name.asc()).all()
    return [
        {
            "id": str(a.id),
            "vaccine_name": a.vaccine_name,
            "category": a.category,
            "summary": a.summary,
            "recommended_schedule": a.recommended_schedule,
            "common_myths": a.common_myths,
        }
        for a in articles
    ]


@router.post("")
def create_article(payload: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    article = KnowledgeArticle(
        vaccine_name=payload["vaccine_name"],
        category=payload.get("category", "general"),
        summary=payload.get("summary", ""),
        recommended_schedule=payload.get("recommended_schedule", ""),
        common_myths=payload.get("common_myths", ""),
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return {"id": str(article.id)}


@router.delete("/{article_id}")
def delete_article(article_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    try:
        art_uuid = uuid.UUID(article_id)
    except ValueError:
        raise HTTPException(400, "Invalid article ID format")

    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == art_uuid).first()
    if not article:
        raise HTTPException(404, "Article not found")
    db.delete(article)
    db.commit()
    return {"deleted": True}


@router.post("/factcheck")
def factcheck_rumor(payload: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rumor = payload.get("rumor", "")
    if not rumor.strip():
        raise HTTPException(400, "Rumor text cannot be empty")

    # Try calling Google Gemini API first
    from app.models.config import SystemConfig
    config = db.query(SystemConfig).filter(SystemConfig.key == "gemini_api_key").first()
    api_key = config.value if config else None

    from app.services.gemini import gemini_factcheck_claim
    gemini_result = gemini_factcheck_claim(rumor, api_key=api_key)
    if gemini_result is not None:
        return gemini_result

    # Fallback to local VaxInsight NLP lexicon if Gemini fails or is unconfigured
    from app.services.rumor_nlp import analyze_rumor_content
    analysis = analyze_rumor_content(rumor)

    score = analysis["risk_score"]
    category = analysis["classification"]

    # Select response template
    if category == "Conspiracy Theories":
        veracity = "DEBUNKED / HIGH MISINFORMATION"
        counter = (
            "This claim has no scientific basis. Extensive laboratory and clinical documentation confirms "
            "that routine vaccines contain absolutely no microchips, tracking devices, or heavy metals. "
            "Such myths are part of coordinated social media campaigns intended to degrade public trust."
        )
    elif category == "Safety Concerns":
        veracity = "EXAGGERATED / MISLEADING"
        counter = (
            "Vaccines go through exhaustive multi-phase clinical safety trials. While mild temporary side effects "
            "like local soreness or minor fever are normal indicators of the immune system registering the antigen, "
            "serious adverse effects are extremely rare (less than 1 in a million doses)."
        )
    elif category == "Religious / Taboo":
        veracity = "DEBUNKED / CULTURALLY VERIFIED"
        counter = (
            "Leading global Islamic and cultural councils have evaluated the ingredients of routine vaccines. "
            "They confirm that any gelatin or stabilizing elements undergo absolute chemical purification, rendering "
            "them permissible (Halal) and highly recommended to protect child life."
        )
    elif category == "Skeptical Inquiry":
        veracity = "RESOLVED / VALID INQUIRY"
        counter = (
            "It is natural to query development timelines. Modern vaccine speed is driven by global resource pooling "
            "and pre-existing mRNA/viral-vector research platforms, without compromising rigorous safety standards "
            "and public health oversight protocols."
        )
    else:
        veracity = "UNVERIFIED CLAIM"
        counter = (
            "Always source vaccine schedule details from verified medical practitioners or official WHO health bulletins. "
            "Avoid sharing or forwarding unsourced alerts on messaging groups."
        )

    return {
        "veracity": veracity,
        "risk_score": score,
        "category": category,
        "counter_argument": counter,
    }
