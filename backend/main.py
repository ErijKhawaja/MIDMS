"""
MIDMS - Multi-Index Drought Monitoring System
FastAPI Backend
===============
Exposes the GEE computation engine as a REST API.
All endpoints are consumed by the React frontend.

Run locally:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import threading
from functools import lru_cache
import hashlib
import json

from midms_gee_engine import (
    initialize_gee,
    compute_index,
    get_region_geometry,
    compute_correlation_analysis,
    compute_drought_alert,
    get_dataset_availability,
    get_available_indices,
)

_cache = {}
progress_store = {}

# ── Init ────────────────────────────────────────────────────
app = FastAPI(
    title="MIDMS API",
    description="Multi-Index Drought Monitoring System — GEE Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # React dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

# GEE auth: service account in Docker, interactive locally
@app.on_event("startup")
def startup():
    sa  = os.getenv("GEE_SERVICE_ACCOUNT")
    key = os.getenv("GEE_KEY_FILE")
    initialize_gee(service_account=sa, key_file=key)


# ── Request models ───────────────────────────────────────────

class IndexRequest(BaseModel):
    index_name:     str
    region:         str
    start_date:     str                    # "YYYY-MM-DD"
    end_date:       str
    aggregation:    str = "mean"
    district:       Optional[str] = None
    custom_geojson: Optional[dict] = None
    timescale:      Optional[int] = None   # SPI / SPEI only

class CorrelationRequest(BaseModel):
    index_a:    str
    index_b:    str
    region:     str
    start_date: str
    end_date:   str
    district:   Optional[str] = None

class AlertRequest(BaseModel):
    region:        str
    forecast_date: str
    lead_months:   int = 1
    district:      Optional[str] = None


def make_cache_key(data: dict) -> str:
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.md5(serialized.encode()).hexdigest()


# ── Routes ───────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "MIDMS API running"}


@app.get("/api/meta/indices")
def list_indices():
    """All available indices grouped by category."""
    return get_available_indices()


@app.get("/api/meta/availability")
def dataset_availability():
    """Valid date ranges per index — used by frontend date pickers."""
    return get_dataset_availability()


def _run_index_job(job_id: str, req: IndexRequest, cache_key: str):
    try:
        progress_store[job_id]["status"] = "geometry"
        progress_store[job_id]["progress"] = 30

        kwargs = {}
        if req.timescale:
            kwargs["timescale"] = int(req.timescale)
        geometry = get_region_geometry(
            req.region, req.district, req.custom_geojson
        )

        progress_store[job_id]["status"] = "computing"
        progress_store[job_id]["progress"] = 60

        result = compute_index(
            index_name=req.index_name,
            region=req.region,
            start_date=req.start_date,
            end_date=req.end_date,
            aggregation=req.aggregation,
            district=req.district,
            custom_geojson=req.custom_geojson,
            **kwargs,
        )

        progress_store[job_id]["status"] = "tiles"
        progress_store[job_id]["progress"] = 90

        response = {"success": True, "data": result}
        _cache[cache_key] = response
        progress_store[job_id]["status"] = "complete"
        progress_store[job_id]["progress"] = 100
        progress_store[job_id]["result"] = response
    except Exception as e:
        progress_store[job_id]["status"] = "error"
        progress_store[job_id]["progress"] = 100
        progress_store[job_id]["error"] = str(e)


@app.get("/api/progress/{job_id}")
def get_progress(job_id: str):
    """Return current progress for a job. When complete, includes result."""
    return progress_store.get(
        job_id, {"status": "unknown", "progress": 0}
    )


@app.post("/api/index")
def get_index(req: IndexRequest):
    """
    Main monitoring endpoint.
    Cache hit: returns result immediately.
    Cache miss: returns job_id (202); client polls GET /api/progress/{job_id} for progress and result.
    """
    try:
        cache_payload = {"endpoint": "index", **req.dict()}
        cache_key = make_cache_key(cache_payload)
        if cache_key in _cache:
            return _cache[cache_key]

        job_id = str(uuid.uuid4())
        progress_store[job_id] = {
            "status": "request_received",
            "progress": 10,
            "result": None,
            "error": None,
        }

        thread = threading.Thread(
            target=_run_index_job,
            args=(job_id, req, cache_key),
        )
        thread.start()

        return JSONResponse(
            status_code=202,
            content={"job_id": job_id},
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GEE computation failed: {e}")


@app.post("/api/correlation")
def get_correlation(req: CorrelationRequest):
    """
    Pixel-wise correlation analysis.
    Returns correlation map + p-value map tile URLs.
    Replaces all 50 standalone GEE correlation scripts.
    """
    try:
        cache_payload = {"endpoint": "correlation", **req.dict()}
        cache_key = make_cache_key(cache_payload)
        if cache_key in _cache:
            return _cache[cache_key]

        result = compute_correlation_analysis(
            index_a=req.index_a,
            index_b=req.index_b,
            region=req.region,
            start_date=req.start_date,
            end_date=req.end_date,
            district=req.district,
        )
        response = {"success": True, "data": result}
        _cache[cache_key] = response
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/prediction/alert")
def get_drought_alert(req: AlertRequest):
    """
    Drought Alert Decision Matrix (Prediction Module).
    Returns choropleth tile URL + percentage breakdown for donut chart.
    """
    try:
        cache_payload = {"endpoint": "drought_alert", **req.dict()}
        cache_key = make_cache_key(cache_payload)
        if cache_key in _cache:
            return _cache[cache_key]

        from midms_gee_engine import get_region_geometry
        geometry = get_region_geometry(req.region, req.district)
        result   = compute_drought_alert(geometry, req.forecast_date, req.lead_months)
        response = {"success": True, "data": result}
        _cache[cache_key] = response
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/cache")
def clear_cache():
    _cache.clear()
    return {"message": "Cache cleared", "entries_removed": len(_cache)}


@app.get("/api/cache/info")
def cache_info():
    return {
        "cached_entries": len(_cache),
        "keys": list(_cache.keys()),
    }
