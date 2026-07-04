import urllib.request
import urllib.error
import json
import re
from app.core.config import settings

def send_whatsapp_message(to_number: str, text_message: str) -> dict:
    """Dispatches a text message using Meta's official WhatsApp Business API.
    If credentials are empty, operates in simulation mode.
    """
    if not settings.WHATSAPP_PHONE_NUMBER_ID or not settings.WHATSAPP_BEARER_TOKEN:
        return {
            "status": "simulated",
            "message": "WhatsApp API credentials not configured. Running in simulation mode."
        }
        
    # Clean phone number: Meta expects digits only, including country code (e.g. 919072849672)
    cleaned_phone = re.sub(r"\D", "", to_number)
    
    # If it is a 10-digit number, default to India's prefix (91)
    if len(cleaned_phone) == 10:
        cleaned_phone = "91" + cleaned_phone
        
    url = f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_BEARER_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": cleaned_phone,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": text_message
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return {
                "status": "success",
                "message_id": res_data.get("messages", [{}])[0].get("id"),
                "status_code": response.status,
                "message": "WhatsApp message successfully sent via Meta API."
            }
    except urllib.error.HTTPError as e:
        try:
            error_body = json.loads(e.read().decode("utf-8"))
            error_msg = error_body.get("error", {}).get("message", e.reason)
        except Exception:
            error_msg = e.reason
        return {
            "status": "failed",
            "error": f"WhatsApp API HTTP {e.code}: {error_msg}"
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }
