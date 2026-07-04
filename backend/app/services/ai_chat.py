import urllib.request
import json
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings


def get_gemini_chatbot_response(prompt: str, context: dict, api_key: str | None = None) -> str | None:
    key = api_key or settings.GEMINI_API_KEY
    if not key:
        return None

    # Construct system instructions containing current database status
    system_instruction = (
        "You are VaxInsight, the official intelligent AI assistant for the VaxiPredict public health platform. "
        "Your mission is to help health officials, data analysts, and field workers monitor routine immunization "
        "coverage, analyze vaccine hesitancy risk factors, counter community rumors, and navigate the platform.\n\n"
        "Here is the LIVE statistics context from the platform's PostgreSQL database:\n"
        f"- Total Regions Tracked: {context['total_regions']}\n"
        f"- Average Hesitancy Rate: {context['avg_hesitancy']:.2%}\n"
        f"- Active Flagged Misinformation Rumors: {context['active_rumors']}\n"
        f"- Pending Patient Outreach Reminders: {context['pending_reminders']}\n"
        f"- Total Campaigns Simulated: {context['total_interventions']}\n"
        f"- Top 5 High-Risk regions: {', '.join(context['top_regions'])}\n\n"
        "Guidelines:\n"
        "1. Answer the user's question politely, truthfully, and scientifically based on WHO guidelines.\n"
        "2. format your responses using Markdown headers, lists, and bold text to look premium and readable.\n"
        "3. If they ask about platform navigation or how to do something, guide them to appropriate pages like Dashboard (/dashboard), Predictions (/predictions), Interventions (/interventions), Rumors (/rumors), etc."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{system_instruction}\n\nUser Question: {prompt}"}
                ]
            }
        ]
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            candidates = res_json.get("candidates", [])
            if not candidates:
                return None
            return candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    except Exception as e:
        print(f"Gemini Chatbot execution failed: {e}")
        return None


def get_ai_response(prompt: str, db: Session) -> str:
    prompt_lower = prompt.lower()

    # Avoid circular imports
    from app.models.region import Region
    from app.models.prediction import PredictionResult
    from app.models.rumor import RumorReport
    from app.models.reminder import Reminder
    from app.models.intervention import InterventionPlan

    # Query statistics for context
    total_regions = db.query(func.count(Region.id)).scalar() or 0
    avg_hesitancy = db.query(func.avg(PredictionResult.hesitancy_score)).scalar() or 0.0
    active_rumors = db.query(func.count(RumorReport.id)).filter(RumorReport.status == "flagged").scalar() or 0
    pending_reminders = db.query(func.count(Reminder.id)).filter(Reminder.status == "pending").scalar() or 0
    total_interventions = db.query(func.count(InterventionPlan.id)).scalar() or 0

    # Get top high-risk regions names for context
    top_regions_records = (
        db.query(Region.name, PredictionResult.hesitancy_score)
        .join(PredictionResult, PredictionResult.region_id == Region.id)
        .order_by(PredictionResult.hesitancy_score.desc())
        .limit(5)
        .all()
    )
    top_regions_str = [f"{name} ({score:.1%})" for name, score in top_regions_records]

    # Try calling Google Gemini chatbot API first
    from app.models.config import SystemConfig
    config = db.query(SystemConfig).filter(SystemConfig.key == "gemini_api_key").first()
    api_key = config.value if config else settings.GEMINI_API_KEY

    if api_key:
        context = {
            "total_regions": total_regions,
            "avg_hesitancy": avg_hesitancy,
            "active_rumors": active_rumors,
            "pending_reminders": pending_reminders,
            "total_interventions": total_interventions,
            "top_regions": top_regions_str,
        }
        gemini_response = get_gemini_chatbot_response(prompt, context, api_key=api_key)
        if gemini_response:
            return gemini_response.strip()

    # 1. HESITANCY & RISK LEVEL (Fallback rule-based)
    if any(k in prompt_lower for k in ["hesitancy", "risk", "high", "critical", "score", "rate"]):
        top_regions = (
            db.query(Region.name, PredictionResult.hesitancy_score, PredictionResult.risk_level)
            .join(PredictionResult, PredictionResult.region_id == Region.id)
            .order_by(PredictionResult.hesitancy_score.desc())
            .limit(5)
            .all()
        )

        response = (
            f"### 📊 Vaccine Hesitancy Insights\n\n"
            f"VaxiPredict is currently tracking **{total_regions} regions**.\n"
            f"- **Average Hesitancy Score:** `{avg_hesitancy:.2%}`\n"
            f"- **Active Rumors Flagged:** `{active_rumors}`\n\n"
            f"Here are the **top 5 highest-risk regions** based on our trained GNN+LSTM model:\n\n"
        )
        if top_regions:
            for name, score, risk in top_regions:
                badge = "🔴" if risk == "critical" or risk == "high" else "🟡"
                response += f"1. {badge} **{name}**: `{score:.2%}` hesitancy ({risk.capitalize()} Risk)\n"
            response += (
                f"\n*Recommendation:* I suggest planning a targeted **Awareness Campaign** or sending a **Mobile Clinic** "
                f"to the highest risk regions on the [Interventions Page](/interventions)."
            )
        else:
            response += "*No prediction records found in the database. Please run the prediction pipeline first.*"
        return response

    # 2. RUMORS & MISINFORMATION (Fallback rule-based)
    if any(k in prompt_lower for k in ["rumor", "misinfo", "fake", "social", "flag", "post"]):
        rumors = db.query(RumorReport).order_by(RumorReport.created_at.desc()).limit(3).all()

        response = (
            f"### 🔍 Rumor & Misinformation Status\n\n"
            f"We have identified **{active_rumors} active flagged rumor reports** across the platform.\n\n"
            f"Here are the most recently flagged rumor alerts:\n\n"
        )
        if rumors:
            for r in rumors:
                status_emoji = "⚠️" if r.status == "flagged" else "✅"
                response += f"- {status_emoji} **{r.source.replace('_', ' ').title()}** (Risk Score: `{r.risk_score:.2f}`): *\"{r.content}\"* -> Status: **{r.status.capitalize()}**\n"
            response += (
                f"\n*Action Item:* Analysts can review, dismiss, or confirm rumor reports on the [Rumor Detection Page](/rumors). "
                f"Responding to high-risk social media rumors early prevents spikes in hesitancy."
            )
        else:
            response += "*No rumors have been submitted yet. Health workers can submit rumors on the Rumors page.*"
        return response

    # 3. INTERVENTIONS & OUTREACH (Fallback rule-based)
    if any(k in prompt_lower for k in ["intervention", "strategy", "campaign", "outreach", "budget"]):
        plans = db.query(InterventionPlan).order_by(InterventionPlan.created_at.desc()).limit(3).all()

        response = (
            f"### 🛠️ Intervention & Outreach Planning\n\n"
            f"You have simulated **{total_interventions} intervention campaigns** so far.\n\n"
        )
        if plans:
            response += "Here are the latest simulated campaigns:\n\n"
            for p in plans:
                response += f"- **{p.strategy.replace('_', ' ').title()}**: Target Group: *{p.target_group}*, Projected Drop: `-{p.projected_hesitancy_drop:.1%}`, Budget: `₹{p.budget_estimate:,.2f}`\n"
            response += (
                f"\n*Action Item:* You can run new simulations with custom budgets and check efficiency "
                f"on the [Intervention Planning Page](/interventions)."
            )
        else:
            response += (
                f"You haven't planned any interventions yet. You can simulate a campaign (like SMS Outreach or Mobile Clinics) "
                f"and view their cost-benefit estimates on the [Interventions Page](/interventions)."
            )
        return response

    # 4. REMINDERS & FOLLOW-UPs (Fallback rule-based)
    if any(k in prompt_lower for k in ["reminder", "contact", "due", "beneficiary", "follow"]):
        reminders = db.query(Reminder).order_by(Reminder.due_date.asc()).limit(3).all()

        response = (
            f"### 📅 Vaccination Reminders\n\n"
            f"There are **{pending_reminders} pending follow-up reminders** scheduled for beneficiaries.\n\n"
        )
        if reminders:
            response += "Here are the next upcoming reminders:\n\n"
            for r in reminders:
                response += f"- 👤 **{r.beneficiary_name}** | Vaccine: *{r.vaccine_name}* | Due: `{r.due_date}` | Contact: `{r.contact}`\n"
            response += f"\n*Action Item:* Health workers can view and schedule more reminders on the [Reminders Page](/reminders)."
        else:
            response += "*No reminders scheduled. Set up new reminders on the Reminders page to keep immunization schedules on track.*"
        return response

    # 5. NAVIGATION & HELP (Fallback rule-based)
    if any(k in prompt_lower for k in ["help", "navigate", "page", "where", "how do i", "menu"]):
        return (
            "### 🗺️ Platform Navigation Guide\n\n"
            "Here is a map of the VaxiPredict intelligence modules:\n\n"
            "- 📊 **[Dashboard](/dashboard):** Live statistics, risk levels, and overview of all tracked regions.\n"
            "- 📥 **[Upload](/upload):** Ingest new vaccination records (CSV, Excel, or JSON).\n"
            "- 🤖 **[AI Prediction](/predictions):** Run the trained GNN+LSTM model to evaluate hesitancy risk.\n"
            "- 🗺️ **[Heatmap](/heatmap):** Spatial view of hesitancy across all regions.\n"
            "- 📈 **[Forecasting](/forecasting):** Extrapolations of hesitancy trends 6 months ahead.\n"
            "- 🛠️ **[Interventions](/interventions):** Simulate campaign drops and budgets.\n"
            "- 📅 **[Reminders](/reminders):** Add and track follow-ups for patients.\n"
            "- 🔍 **[Rumor Detection](/rumors):** Misinformation analyzer and scoring dashboard.\n"
            "- 📚 **[Knowledge Library](/knowledge):** Fact-checking center for vaccine schedules and common myths.\n"
            "- 🔬 **[Analytics](/analytics):** High-resolution coverage and hesitancy trend charts.\n"
            "- 📄 **[Reports](/reports):** Export prediction and rumor audits to PDF, Excel, and CSV.\n"
            "- ⚙️ **[Settings](/settings):** Manage privacy, security, and theme preferences."
        )

    # 6. GENERAL GREETING (Fallback rule-based)
    return (
        f"### 👋 Hello! I'm VaxInsight, your vaccine intelligence assistant.\n\n"
        f"I can help you monitor vaccination hesitancy, analyze data, and navigate the platform.\n\n"
        f"**Live Platform Stats:**\n"
        f"- 🌍 Regions Tracked: **{total_regions}**\n"
        f"- 📉 Avg. Hesitancy: **{avg_hesitancy:.2%}**\n"
        f"- ⚠️ Active Rumors: **{active_rumors}**\n"
        f"- 📅 Pending Reminders: **{pending_reminders}**\n\n"
        f"**Try asking me:**\n"
        f"- *\"Which regions have the highest hesitancy?\"*\n"
        f"- *\"What active rumors do we have?\"*\n"
        f"- *\"Show me upcoming reminders.\"*\n"
        f"- *\"How do I navigate to the reports page?\"*"
    )
