MY LIVE DEMO LINK
https://drive.google.com/drive/folders/1pq6k7VXzan4n5HdzqanOrzKdS3LXD2Q1?usp=sharing


# AI Bathroom Designer & Planner

Individual case study for the AI Lab program (Track 1).

An interactive AI design assistant that takes a customer's bathroom
dimensions, budget, and aesthetic style, and recommends an optimized
product bundle (faucets, toilets, showers, vanities) with a 2D layout.

## Project structure
```
backend/    Flask API - constraint filtering + LLM recommendation logic
frontend/   UI - input form, results, 2D floorplan
data/       products.json - product catalog (price, footprint, style, efficiency)
docs/       prompts-log.md - AI prompts used throughout the build
```

## Setup (backend)
```
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python app.py
```
Then visit http://127.0.0.1:5000/health to confirm it's running.

## Status
Skeleton stage - constraint filter and LLM reasoning layer in progress.
