from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="EO Services API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

ST_LOGIN = os.getenv("SPACETRACK_USER", "")
ST_PASS = os.getenv("SPACETRACK_PASS", "")
ST_BASE = "https://www.space-track.org"

# Reusable client with cookie persistence
_client = None

async def get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30, follow_redirects=True)
    return _client

async def st_login(client: httpx.AsyncClient):
    """Login to Space-Track, cookies stored in client."""
    resp = await client.post(
        f"{ST_BASE}/ajaxauth/login",
        data={"identity": ST_LOGIN, "password": ST_PASS},
    )
    if resp.status_code != 200 or "Failed" in resp.text:
        raise HTTPException(502, "Space-Track login failed")

@app.get("/api/spacetrack/tle/{norad_id}")
async def get_tle_history(
    norad_id: int,
    limit: int = Query(default=999, ge=1, le=9999),
):
    """Get TLE history for a satellite from Space-Track."""
    if not ST_LOGIN or not ST_PASS:
        raise HTTPException(500, "Space-Track credentials not configured")

    client = await get_client()

    # Login (cookies persist in client)
    await st_login(client)

    # Fetch TLE history
    url = (
        f"{ST_BASE}/basicspacedata/query/class/tle/NORAD_CAT_ID/{norad_id}"
        f"/orderby/EPOCH%20asc/limit/{limit}/format/tle"
    )
    resp = await client.get(url)
    if resp.status_code != 200:
        raise HTTPException(502, f"Space-Track returned {resp.status_code}")

    return {"tle": resp.text, "norad_id": norad_id, "count": resp.text.count("\n") // 2}

@app.get("/api/health")
async def health():
    return {"status": "ok"}
