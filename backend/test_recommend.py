"""
Quick test script for the /recommend endpoint.
Run with: python test_recommend.py
(Make sure app.py is running in another terminal first.)
"""

import requests
import json

url = "http://127.0.0.1:5000/recommend"
payload = {
    "width_ft": 8,
    "depth_ft": 6,
    "budget": 3000,
    "style": "Minimalist Modern"
}

response = requests.post(url, json=payload)

print("Status code:", response.status_code)
print(json.dumps(response.json(), indent=2))
