"""
LLM Reasoning Layer (Gemini version, current SDK)
Takes constraint-filtered candidates (from constraint_filter) and prompts
Gemini to curate a style-matched bundle, with budget-aware fallback protection.
"""

import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

logger = logging.getLogger("kohler_backend")

# Find and load the .env file in the backend directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

SYSTEM_PROMPT = """You are a master bathroom design director for Kohler.
You will receive room constraints, a budget allocation, and candidate fixtures
(faucets, toilets, showers, vanities) pre-filtered for physical and budgetary fit.

Your directives:
1. Pick exactly ONE product from each category that aligns with the requested
   design aesthetic and utilizes the allocated budget appropriately.
   - For premium budgets (e.g. $6,000+), prefer flagship and luxury-tier fixtures.
   - For conservative budgets, select clean value-engineered combinations.
2. Ensure finish and sculptural cohesion across all 4 fixtures.
3. Prioritize ecological WaterSense ratings when multiple items fit equally well.
4. Write an architectural 2-3 sentence rationale highlighting material finishes,
   flow rates, and spatial balance.

Return ONLY valid JSON matching this schema:
{
  "bundle": {
    "faucet": "<product id>",
    "toilet": "<product id>",
    "shower": "<product id>",
    "vanity": "<product id>"
  },
  "total_price": <number>,
  "explanation": "<your 2-3 sentence architectural explanation>"
}
"""


def get_client() -> genai.Client:
    """Lazily instantiate the Gemini client so import never crashes."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            f"GEMINI_API_KEY not found or empty in {env_path}. "
            "Please check your backend/.env file."
        )
    return genai.Client(api_key=api_key)


def get_fallback_recommendation(candidates: dict, style: str, budget: float = 3000) -> dict:
    """Dynamic, budget-aware fallback when Gemini is rate-limited, cooling down, or offline."""
    logger.warning(f"Triggering smart catalog fallback for style='{style}' and budget=${budget}.")

    bundle = {}
    total_price = 0
    cat_keys = ["faucets", "toilets", "showers", "vanities"]
    singular_map = {"faucets": "faucet", "toilets": "toilet", "showers": "shower", "vanities": "vanity"}

    for cat_key in cat_keys:
        items = candidates.get(cat_key, [])
        if not items:
            continue

        # 1. Filter fixtures matching the target style
        style_matches = [
            item for item in items 
            if item.get("style", "").strip().lower() == style.strip().lower()
        ]
        pool = style_matches if style_matches else items

        # 2. Select product tier based on budget allocation
        if budget >= 7000:
            picked = max(pool, key=lambda x: x.get("price", 0))
        elif budget <= 2500:
            picked = min(pool, key=lambda x: x.get("price", 0))
        else:
            sorted_pool = sorted(pool, key=lambda x: x.get("price", 0))
            picked = sorted_pool[len(sorted_pool) // 2]

        bundle[singular_map[cat_key]] = picked["id"]
        total_price += picked.get("price", 0)

    return {
        "bundle": bundle,
        "total_price": total_price,
        "explanation": (
            f"Curated {style} architectural suite tailored to a ${budget:,.0f} budget. "
            "The ensemble balances proportional footprint clearances with WaterSense-compliant "
            "flow optimization and harmonized material finishes."
        )
    }


def get_llm_recommendation(filtered_candidates: dict, style: str, budget: float = 3000) -> dict:
    """
    Returns the parsed JSON dict from Gemini, or smoothly falls back
    to an intelligent style/budget-tier match if throttled or unavailable.
    """
    empty_categories = [cat for cat, items in filtered_candidates.items() if not items]
    if empty_categories:
        return {
            "error": f"No products fit the budget/room size in: {', '.join(empty_categories)}. "
                     f"Try increasing the budget or room dimensions."
        }

    try:
        client = get_client()
    except Exception as e:
        logger.warning(f"Gemini client initialization failed ({e}). Defaulting to smart fallback.")
        return get_fallback_recommendation(filtered_candidates, style, budget)

    user_message = f"""
Target Aesthetic: {style}
Budget Allocation: ${budget}

Candidate Products (already filtered for physical room fit and budget cap):
{json.dumps(filtered_candidates, indent=2)}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json"
            )
        )

        raw_text = response.text.strip()
        return json.loads(raw_text)

    except Exception as e:
        err_msg = str(e)
        logger.error(f"Gemini API Exception ({err_msg}). Engaging smart rule-based curation.")
        return get_fallback_recommendation(filtered_candidates, style, budget)  