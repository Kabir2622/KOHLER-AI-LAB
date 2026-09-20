"""
Multi-Tier LLM & Deterministic Recommender Layer
Generates 3 distinct bundles (Essential, Curated, Luxury) with different valuations.
"""

import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

logger = logging.getLogger("kohler_backend")

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

SYSTEM_PROMPT = """You are a senior Kohler architectural design director.
Given candidate fixtures, room constraints, and target budget, you MUST generate THREE distinct design tiers with DIFFERENT products and valuations:

1. "essential": Economical, value-engineered products (~50-65% of budget). Pick the most cost-effective fixtures.
2. "curated": Balanced mid-range fixtures (~85-100% of budget) matching the customer's exact budget target.
3. "signature": Top-tier luxury or smart fixtures (~125-150% of budget) with smart bidet toilets, thermostatic showers, or large quartz vanities.

MANDATORY RULES:
- The three tiers MUST contain DIFFERENT products where possible.
- essential total_price < curated total_price < signature total_price. They MUST NEVER be equal.

Output strictly valid JSON matching this schema:
{
  "tiers": {
    "essential": {
      "title": "Essential Architectural Tier",
      "bundle": {"faucet": "<id>", "toilet": "<id>", "shower": "<id>", "vanity": "<id>"},
      "total_price": <number>,
      "explanation": "<rationale>"
    },
    "curated": {
      "title": "Curated Designer Tier",
      "bundle": {"faucet": "<id>", "toilet": "<id>", "shower": "<id>", "vanity": "<id>"},
      "total_price": <number>,
      "explanation": "<rationale>"
    },
    "signature": {
      "title": "Signature Luxury Tier",
      "bundle": {"faucet": "<id>", "toilet": "<id>", "shower": "<id>", "vanity": "<id>"},
      "total_price": <number>,
      "explanation": "<rationale>"
    }
  }
}
"""

def get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY missing in .env")
    return genai.Client(api_key=api_key)


def build_single_bundle(candidates: dict, style: str, target_budget: float, tier_label: str) -> dict:
    """Deterministic selection that forces different price percentiles per tier."""
    singular_map = {"faucets": "faucet", "toilets": "toilet", "showers": "shower", "vanities": "vanity"}
    bundle = {}
    total = 0

    allocations = {
        "vanities": target_budget * 0.45,
        "showers": target_budget * 0.25,
        "toilets": target_budget * 0.20,
        "faucets": target_budget * 0.10
    }

    for cat_key, cat_target in allocations.items():
        items = candidates.get(cat_key, [])
        if not items:
            continue

        # Sort all candidates by price ascending
        sorted_by_price = sorted(items, key=lambda x: x.get("price", 0))

        # Check for style preference
        style_matches = [i for i in sorted_by_price if i.get("style", "").lower() == style.lower()]
        pool = style_matches if len(style_matches) >= 3 else sorted_by_price

        if tier_label == "essential":
            # Select from the lower 25% price bracket
            chosen = pool[0]
        elif tier_label == "signature":
            # Select from the top tier of the catalog
            chosen = pool[-1]
        else:
            # Curated tier: Select closest to the allocated category target
            chosen = min(pool, key=lambda x: abs(x.get("price", 0) - cat_target))

        bundle[singular_map[cat_key]] = chosen["id"]
        total += chosen.get("price", 0)

    return {
        "bundle": bundle,
        "total_price": total,
        "explanation": f"{tier_label.title()} collection harmonized in {style} aesthetic."
    }


def get_fallback_recommendation(candidates: dict, style: str, budget: float = 3000) -> dict:
    logger.warning(f"Using deterministic 3-tier fallback engine for budget=${budget}, style='{style}'")
    return {
        "tiers": {
            "essential": {
                "title": "Essential Architectural Tier",
                **build_single_bundle(candidates, style, budget * 0.60, "essential")
            },
            "curated": {
                "title": "Curated Designer Tier",
                **build_single_bundle(candidates, style, budget * 1.00, "curated")
            },
            "signature": {
                "title": "Signature Luxury Tier",
                **build_single_bundle(candidates, style, budget * 1.50, "signature")
            }
        }
    }


def get_llm_recommendation(filtered_candidates: dict, style: str, budget: float = 3000) -> dict:
    empty = [c for c, items in filtered_candidates.items() if not items]
    if empty:
        return {"error": f"No products fit dimensions/budget in: {', '.join(empty)}"}

    try:
        client = get_client()
        msg = f"Aesthetic: {style}\nTarget Budget: ${budget}\nCandidates:\n{json.dumps(filtered_candidates, indent=2)}"
        res = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=msg,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json"
            )
        )
        data = json.loads(res.text.strip())
        
        # Verify valid tier output with non-equal totals
        tiers = data.get("tiers", {})
        if (
            "essential" in tiers and "curated" in tiers and "signature" in tiers
            and tiers["essential"]["total_price"] != tiers["signature"]["total_price"]
        ):
            return data

        logger.warning("Gemini produced equal tier prices. Falling back to deterministic ladder.")
        return get_fallback_recommendation(filtered_candidates, style, budget)

    except Exception as e:
        logger.error(f"Gemini API error ({e}). Using deterministic 3-tier fallback.")
        return get_fallback_recommendation(filtered_candidates, style, budget)