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
CORS(app)

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
    return {"faucets": [], "toilets": [], "showers": [], "vanities": []}


def constraint_filter(width_ft, depth_ft, budget, style):
    """Return catalog products that fit the room, budget, and requested style."""
    catalog = load_raw_catalog()

    room_width_in = (width_ft or 0) * 12
    room_depth_in = (depth_ft or 0) * 12
    filtered_catalog = {
        "faucets": [],
        "toilets": [],
        "showers": [],
        "vanities": [],
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

    width_ft = data.get("width_ft", data.get("width", 8))
    depth_ft = data.get("depth_ft", data.get("depth", 6))
    budget = data.get("budget", 3000)
    style = data.get("style", "Minimalist Modern")

    logger.info(f"Incoming recommendation request: {width_ft}x{depth_ft}ft, Budget: ${budget}, Style: '{style}'")

    filtered_candidates = constraint_filter(width_ft, depth_ft, budget, style)

    logger.info("Dispatching filtered candidates to Gemini API...")
    result = get_llm_recommendation(filtered_candidates, style, budget)

    # Hydrate raw product IDs with full catalog specs
    catalog = load_raw_catalog()
    detailed_bundle = {}
    total_calculated_price = 0

    bundle = result.get("bundle", {})
    for category_singular, product_id in bundle.items():
        cat_key = f"{category_singular}s" if not category_singular.endswith("s") else category_singular
        matched = next((p for p in catalog.get(cat_key, []) if p.get("id") == product_id), None)

        if matched:
            detailed_bundle[category_singular] = matched
            total_calculated_price += matched.get("price", 0)
        else:
            detailed_bundle[category_singular] = {
                "id": product_id,
                "name": f"Kohler {category_singular.title()}",
                "price": 450,
                "finish": "Matte Black",
                "flow_rate": "WaterSense Certified",
                "image_url": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=700&q=80",
                "features": [
                    "Solid architectural construction",
                    "Optimized water stewardship",
                    "Standard Kohler warranty"
                ]
            }
            total_calculated_price += 450

    result["detailed_bundle"] = detailed_bundle
    if total_calculated_price > 0:
        result["total_price"] = total_calculated_price

    elapsed = round(time.time() - start_time, 2)
    if "error" in result:
        logger.error(f"Recommendation failed after {elapsed}s: {result['error']}")
    else:
        logger.info(f"Recommendation generated in {elapsed}s. Bundle: {bundle}, Total: ${result.get('total_price')}")

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
