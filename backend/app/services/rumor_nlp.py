import re

# Lexicon configurations
CONSPIRACY_KEYWORDS = ["chip", "5g", "magnetic", "sterilize", "depopulation", "gates", "tracking", "control", "fake", "microchip", "dna", "modify", "bill gates"]
SAFETY_KEYWORDS = ["side effect", "kill", "death", "paralysis", "heart", "clot", "autism", "fever", "allergy", "poison", "toxic", "stroke", "cancer", "sick"]
RELIGIOUS_KEYWORDS = ["halal", "haram", "pork", "gelatin", "cow", "faith", "god", "forbidden", "sin", "religious"]
SKEPTICAL_KEYWORDS = ["how", "why", "effective", "testing", "quick", "trial", "clinical", "fast", "speed", "test"]


def analyze_rumor_content(content: str) -> dict:
    """Uses basic NLP keyword parsing and lexicon weighting to automatically
    evaluate rumor risk scores and assign classification categories.
    """
    text = content.lower()
    
    # Check keyword occurrences
    conspiracy_hits = [k for k in CONSPIRACY_KEYWORDS if k in text]
    safety_hits = [k for k in SAFETY_KEYWORDS if k in text]
    religious_hits = [k for k in RELIGIOUS_KEYWORDS if k in text]
    skeptical_hits = [k for k in SKEPTICAL_KEYWORDS if k in text]
    
    # Calculate score weights
    score = 0.15  # Baseline score
    
    # Scale based on keywords hit
    score += len(set(conspiracy_hits)) * 0.25
    score += len(set(safety_hits)) * 0.18
    score += len(set(religious_hits)) * 0.12
    score += len(set(skeptical_hits)) * 0.05
    
    # Cap score
    score = min(max(score, 0.05), 0.98)
    
    # Determine classification label
    if conspiracy_hits:
        classification = "Conspiracy Theories"
    elif safety_hits:
        classification = "Safety Concerns"
    elif religious_hits:
        classification = "Religious / Taboo"
    elif skeptical_hits:
        classification = "Skeptical Inquiry"
    else:
        classification = "General Misinformation"
        
    return {
        "risk_score": round(score, 2),
        "classification": classification,
        "sentiment": "negative" if score > 0.4 else "neutral"
    }
