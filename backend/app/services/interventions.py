"""
Campaign simulation heuristics. Each strategy has an assumed effectiveness
band and a per-capita cost; the projected drop is scaled by the region's
current hesitancy score so recommendations are proportionate. This is a
transparent, explainable stand-in for a full causal-effect model and can be
replaced with a learned uplift model later without changing the API shape.
"""

STRATEGY_PROFILES = {
    "awareness_campaign": {"effectiveness": 0.15, "cost_per_capita": 0.8},
    "mobile_clinic": {"effectiveness": 0.25, "cost_per_capita": 2.5},
    "sms_outreach": {"effectiveness": 0.10, "cost_per_capita": 0.2},
    "community_leader_engagement": {"effectiveness": 0.20, "cost_per_capita": 1.2},
}


def simulate(strategy: str, current_hesitancy: float, population: int) -> tuple[float, float]:
    profile = STRATEGY_PROFILES.get(strategy, STRATEGY_PROFILES["awareness_campaign"])
    projected_drop = round(current_hesitancy * profile["effectiveness"], 4)
    budget_estimate = round(population * profile["cost_per_capita"], 2)
    return projected_drop, budget_estimate
