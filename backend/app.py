import json
import logging
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("kohler_backend")

env_path = Path(__file__).resolve().parent / ".env"
logger.info(f"Loading environment from {env_path} (exists: {env_path.exists()})")
load_dotenv(dotenv_path=env_path, override=True)

from recommender import get_llm_recommendation

app = Flask(__name__)
# Enable CORS across all routes
CORS(app, resources={r"/*": {"origins": "*"}})

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "products.json"


def load_raw_catalog():
    """Search for products.json across common project paths safely."""
    possible_paths = [
        Path(__file__).resolve().parent.parent / "data" / "products.json",
        Path(__file__).resolve().parent / "data" / "products.json",
        Path(__file__).resolve().parent / "products.json",
        Path.cwd() / "data" / "products.json",
        Path.cwd() / "products.json",
    ]
    for p in possible_paths:
        if p.exists():
            try:
                with p.open(encoding="utf-8") as f:
                    data = json.load(f)
                    logger.info(f"Loaded catalog from: {p}")
                    return data
            except Exception as e:
                logger.error(f"Found catalog at {p} but failed to read: {e}")
                
    logger.error(f"products.json not found in any expected location: {[str(p) for p in possible_paths]}")
    return {"faucets": [], "toilets": [], "showers": [], "vanities": [], "bathtubs": []}


def constraint_filter(width_ft, depth_ft, budget, style):
    """Return catalog products that fit the room dimensions and budget threshold."""
    catalog = load_raw_catalog()

    room_width_in = (width_ft or 0) * 12
    room_depth_in = (depth_ft or 0) * 12
    filtered_catalog = {
        "faucets": [],
        "toilets": [],
        "showers": [],
        "vanities": [],
        "bathtubs": []
    }

    for category in filtered_catalog:
        for product in catalog.get(category, []):
            fp = product.get("footprint_in", {"width": 0, "depth": 0})
            if (
                product.get("price", 0) <= budget
                and fp.get("width", 0) <= room_width_in
                and fp.get("depth", 0) <= room_depth_in
            ):
                filtered_catalog[category].append(product)

    counts = {k: len(v) for k, v in filtered_catalog.items()}
    logger.info(f"Constraint filtering results: {counts}")
    return filtered_catalog


def hydrate_bundle_items(bundle_dict, catalog):
    """Map product IDs to full catalog objects, ensuring local catalog image_url mapping."""
    detailed = {}
    total = 0

    fallback_metadata = {
        "faucet": {
            "price": 380,
            "image": "/images/faucet1.png",
            "flow_rate": "1.2 GPM",
            "finish": "Brushed Moderne Brass"
        },
        "toilet": {
            "price": 550,
            "image": "/images/toilet1.png",
            "flow_rate": "1.28 GPF",
            "finish": "White Porcelain"
        },
        "shower": {
            "price": 620,
            "image": "/images/shower1.png",
            "flow_rate": "1.75 GPM",
            "finish": "Matte Black"
        },
        "vanity": {
            "price": 850,
            "image": "/images/vanity1.png",
            "flow_rate": "Cabinetry Spec",
            "finish": "Flannel Grey"
        },
        "bathtub": {
            "price": 1200,
            "image": "/images/tub1.png",
            "flow_rate": "65 Gal Capacity",
            "finish": "White Acrylic"
        }
    }

    for category_singular, product_id in (bundle_dict or {}).items():
        cat_key = f"{category_singular}s" if not category_singular.endswith("s") else category_singular
        matched = next((p for p in catalog.get(cat_key, []) if p.get("id") == product_id), None)

        if matched:
            # Ensure a copy is used so we don't mutate global cache, and enforce local image_url lookup
            item_copy = dict(matched)
            if not item_copy.get("image_url"):
                item_copy["image_url"] = f"/images/{category_singular}1.png"
            detailed[category_singular] = item_copy
            total += item_copy.get("price", 0)
        else:
            meta = fallback_metadata.get(category_singular, {
                "price": 450,
                "image": f"/images/{category_singular}1.png",
                "flow_rate": "WaterSense Certified",
                "finish": "Matte Black"
            })
            detailed[category_singular] = {
                "id": product_id,
                "name": f"Kohler {category_singular.title()}",
                "price": meta["price"],
                "finish": meta["finish"],
                "flow_rate": meta["flow_rate"],
                "image_url": meta["image"],
                "features": [
                    "Solid architectural construction",
                    "Optimized water stewardship",
                    "Standard Kohler warranty"
                ]
            }
            total += meta["price"]

    return detailed, total


@app.route("/health", methods=["GET"])
def health():
    logger.info("Health check ping received.")
    return jsonify({"status": "ok"})


@app.route("/api/catalog", methods=["GET"])
def get_full_catalog():
    """Returns the full catalog separated by categories for the archive explorer."""
    catalog = load_raw_catalog()
    return jsonify(catalog)


@app.route("/recommend", methods=["POST"])
@app.route("/api/recommend", methods=["POST"])
def recommend():
    start_time = time.time()
    data = request.get_json() or {}

    width_ft = float(data.get("width_ft", data.get("width", 8)))
    depth_ft = float(data.get("depth_ft", data.get("depth", 6)))
    budget = float(data.get("budget", 3000))
    style = data.get("style", "Minimalist Modern")

    logger.info(f"Incoming baseline recommendation request: {width_ft}x{depth_ft}ft, Budget: ${budget}, Style: '{style}'")

    # Allow headroom up to 1.5x target budget so luxury bathtubs & smart suites have candidates
    candidate_budget_ceiling = budget * 1.5
    filtered_candidates = constraint_filter(width_ft, depth_ft, candidate_budget_ceiling, style)

    logger.info("Dispatching filtered candidates to recommendation engine...")
    result = get_llm_recommendation(filtered_candidates, style, budget)

    if "error" in result:
        elapsed = round(time.time() - start_time, 2)
        logger.error(f"Recommendation failed after {elapsed}s: {result['error']}")
        return jsonify(result), 400

    catalog = load_raw_catalog()

    # Hydrate Multi-Tier Structure
    if "tiers" in result:
        for tier_key, tier_data in result["tiers"].items():
            detailed, total_calc = hydrate_bundle_items(tier_data.get("bundle", {}), catalog)
            tier_data["detailed_bundle"] = detailed
            if total_calc > 0:
                tier_data["total_price"] = total_calc

        # Expose active/curated tier at root level for backwards compatibility
        default_tier = result["tiers"].get("curated") or result["tiers"].get("essential") or next(iter(result["tiers"].values()))
        result["bundle"] = default_tier.get("bundle", {})
        result["detailed_bundle"] = default_tier.get("detailed_bundle", {})
        result["total_price"] = default_tier.get("total_price", 0)
        result["explanation"] = default_tier.get("explanation", "")
    else:
        # Single bundle fallback hydration
        detailed, total_calc = hydrate_bundle_items(result.get("bundle", {}), catalog)
        result["detailed_bundle"] = detailed
        if total_calc > 0:
            result["total_price"] = total_calc

    elapsed = round(time.time() - start_time, 2)
    logger.info(f"Recommendation finished in {elapsed}s. Primary valuation: ${result.get('total_price')}")

    return jsonify(result)


# --- IN-STUDIO CONVERSATIONAL COPILOT REVISION ENDPOINT ---
@app.route("/refine", methods=["POST", "OPTIONS"])
@app.route("/api/refine", methods=["POST", "OPTIONS"])
def refine_design():
    """Takes the current active bundle + user's architectural revision directive and generates an adapted custom tier."""
    if request.method == "OPTIONS":
        return jsonify({"status": "preflight ok"}), 200

    start_time = time.time()
    data = request.get_json() or {}

    current_bundle = data.get("current_bundle", {})
    directive = data.get("directive", "").strip()
    style = data.get("style", "Minimalist Modern")
    budget = float(data.get("budget", 12000))
    width_ft = float(data.get("width", 16))
    depth_ft = float(data.get("depth", 14))

    if not directive:
        return jsonify({"error": "No architectural revision directive provided."}), 400

    logger.info(f"Copilot refinement directive received: '{directive}'")

    raw_catalog = load_raw_catalog()
    directive_lower = directive.lower()

    # Detect price extremes in directive
    is_lowest = any(k in directive_lower for k in ["lowest", "cheapest", "minimum", "budget", "economy", "affordable"])
    is_highest = any(k in directive_lower for k in ["highest", "maximum", "luxury", "expensive", "premium", "most expensive"])

    # Expand budget boundary if asking for highest luxury tier
    effective_budget = budget * 3.5 if is_highest else budget
    filtered_candidates = constraint_filter(width_ft, depth_ft, effective_budget, style)

    # Sort each category candidate pool by price to steer Gemini and algorithmic fallbacks
    for cat in filtered_candidates:
        if is_lowest:
            filtered_candidates[cat].sort(key=lambda x: x.get("price", 0))
        elif is_highest:
            filtered_candidates[cat].sort(key=lambda x: x.get("price", 0), reverse=True)

    # Build structured catalog choices with prices visible
    catalog_summary = {}
    for cat, items in filtered_candidates.items():
        catalog_summary[cat] = [
            {
                "id": p.get("id"),
                "name": p.get("name"),
                "price": p.get("price"),
                "finish": p.get("finish"),
                "flow_rate": p.get("flow_rate")
            }
            for p in items
        ]

    refinement_prompt = f"""
You are the Kohler Principal Spatial Architect executing an iterative design revision.
Room Dimensions: {width_ft}ft x {depth_ft}ft | Base Style: {style}

PREVIOUS BUNDLE:
{json.dumps(current_bundle)}

USER REVISION DIRECTIVE (MANDATORY PRIORITY):
"{directive}"

CRITICAL INSTRUCTIONS:
1. You MUST directly satisfy the user's directive over any previous style defaults.
   - If the user asks for "highest value", "maximum", or "luxury": Select the most premium, highest-priced fixtures in each category.
   - If the user asks for "lowest value", "cheapest", or "budget": Select the lowest-priced, high-durability fixtures in each category.
   - If the user asks for finishes (e.g., Brass, Matte Black), accessibility (ADA/zero-threshold), or eco-efficiency (WaterSense/low flow), prioritize products matching those exact specifications.
2. Select strictly ONE valid 'id' per category from the available catalog:
{json.dumps(catalog_summary)}
3. The explanation MUST explicitly state:
   - What changes were made from the previous bundle.
   - How the new fixtures fulfill the exact directive "{directive}".

Return ONLY valid JSON:
{{
  "title": "Copilot Custom Suite",
  "bundle": {{
    "faucet": "<valid_id>",
    "toilet": "<valid_id>",
    "shower": "<valid_id>",
    "vanity": "<valid_id>",
    "bathtub": "<valid_id>"
  }},
  "explanation": "<detailed architectural reasoning for the change>"
}}
"""

    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured.")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        response = model.generate_content(
            refinement_prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        custom_tier = json.loads(response.text)

        # Hydrate bundle
        detailed, total_calc = hydrate_bundle_items(custom_tier.get("bundle", {}), raw_catalog)
        custom_tier["detailed_bundle"] = detailed
        custom_tier["total_price"] = total_calc

        elapsed = round(time.time() - start_time, 2)
        logger.info(f"Copilot refinement completed via Gemini in {elapsed}s: ${custom_tier['total_price']}")
        return jsonify(custom_tier)

    except Exception as e:
        logger.error(f"Gemini refinement failed or threw exception: {e}. Executing algorithmic directive fallback.")

        # Algorithmic fallback: directly select lowest or highest candidate per category
        fallback_bundle = {}
        for cat in ["faucet", "toilet", "shower", "vanity", "bathtub"]:
            cat_key = f"{cat}s"
            candidates = filtered_candidates.get(cat_key, [])
            if candidates:
                fallback_bundle[cat] = candidates[0].get("id")
            else:
                fallback_bundle[cat] = current_bundle.get(cat, "")

        detailed, total_calc = hydrate_bundle_items(fallback_bundle, raw_catalog)
        fallback_tier = {
            "title": f"Copilot Custom Suite",
            "bundle": fallback_bundle,
            "detailed_bundle": detailed,
            "total_price": total_calc,
            "explanation": f"Adaptive specification synthesized for directive: \"{directive}\". Fixtures re-selected based on valuation parameters and spatial clearance."
        }
        return jsonify(fallback_tier)


if __name__ == "__main__":
    app.run(debug=True, port=5000)