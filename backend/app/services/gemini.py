import json
import urllib.request
import urllib.error
from app.core.config import settings

def gemini_factcheck_claim(rumor: str, api_key: str | None = None) -> dict | None:
    key = api_key or settings.GEMINI_API_KEY
    if not key:
        return None

    # Construct the instruction prompt
    prompt = (
        "You are an expert Public Health Fact-Checking AI for VaxiPredict. "
        "Analyze the following community rumor/claim and evaluate its veracity truthfully and scientifically based on WHO guidance:\n\n"
        f"Claim: \"{rumor}\"\n\n"
        "Return a JSON object with exactly the following fields:\n"
        "1. \"veracity\": A short audit rating (e.g. \"DEBUNKED / HIGH MISINFORMATION\" or \"EXAGGERATED / MISLEADING\" or \"RESOLVED / VALID INQUIRY\").\n"
        "2. \"risk_score\": A float between 0.0 and 1.0 indicating misinformation severity/harm.\n"
        "3. \"category\": The category of the claim (e.g. \"Conspiracy Theories\", \"Safety Concerns\", \"Religious / Taboo\", \"Skeptical Inquiry\").\n"
        "4. \"counter_argument\": A detailed, scientifically verified, polite counter-argument explaining the truth clearly.\n\n"
        "Return ONLY the raw JSON object. Do not include markdown code block syntax (like ```json)."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
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
            
            # Extract generated content text from Gemini response structure
            candidates = res_json.get("candidates", [])
            if not candidates:
                return None
            
            content_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return json.loads(content_text.strip())
            
    except urllib.error.HTTPError as e:
        print(f"Gemini API HTTPError {e.code}: {e.reason}")
        try:
            error_body = e.read().decode("utf-8")
            print(f"Error Response Body: {error_body}")
        except Exception:
            pass
        return None
    except Exception as e:
        print(f"Gemini API execution failed: {e}")
        return None
