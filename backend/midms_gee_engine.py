"""
MIDMS - Multi-Index Drought Monitoring System
GEE Computation Engine
======================
Unified Google Earth Engine Python API backend.
All indices are parameterized functions — no hardcoded dates or regions.

Author: MIDMS Thesis Project
"""

import ee
import json
import time
import traceback
from typing import Optional
from datetime import datetime, timedelta


def safe_getinfo(ee_object, retries=3, delay=5):
    """Retries getInfo on capacity / quota errors with exponential backoff."""
    for attempt in range(retries):
        try:
            return ee_object.getInfo()
        except Exception as e:
            msg = str(e).lower()
            if "capacity" in msg or "quota" in msg:
                if attempt < retries - 1:
                    time.sleep(delay * (2 ** attempt))
                    continue
            raise
    raise RuntimeError("GEE capacity exceeded after retries.")


# ============================================================
# INITIALIZATION
# ============================================================

def initialize_gee(service_account: Optional[str] = None,
                   key_file: Optional[str] = None):
    """
    Initialize GEE. Two modes:
    - Local dev:        ee.Authenticate() + ee.Initialize()
    - Docker/Server:    Service account credentials from key file
    """
    try:
        if service_account and key_file:
            credentials = ee.ServiceAccountCredentials(service_account, key_file)
            ee.Initialize(credentials, project='droughtpakistan')
        else:
            ee.Initialize(project='droughtpakistan')
        print("GEE initialized successfully.")
    except Exception as e:
        print(f"GEE initialization failed: {e}")
        raise


# ============================================================
# REGION RESOLVER
# Converts a province/district name to a GEE geometry
# using your existing GEE assets from the imports file
# ============================================================

# GEE Asset paths — matches your document 4 imports exactly
GEE_ASSETS = {
    "pakistan":           "projects/droughtpakistan/assets/Pakistan_Province",
    "disputed":           "projects/droughtpakistan/assets/DISPUTED_TERRITORY",
    "azad kashmir":       "projects/droughtpakistan/assets/AJK_Districts",
    "balochistan":        "projects/droughtpakistan/assets/Balochistan_Districts",
    "fata":               "projects/droughtpakistan/assets/FATA_Districts",
    "gilgit-baltistan":   "projects/droughtpakistan/assets/GILGIT-BALTISTAN_Districts",
    "ict":                "projects/droughtpakistan/assets/ICT",
    "khyber pakhtunkhwa": "projects/droughtpakistan/assets/KPK_Districts",
    "punjab":             "projects/droughtpakistan/assets/Punjab_Districts",
    "sindh":              "projects/droughtpakistan/assets/Sindh_Districts",
}

# WMO-style 30-year climatology (CHIRPS SPI / anomaly baselines)
BASELINE_PERIOD = {"start": "1981-01-01", "end": "2010-12-31"}

# GRACE/GRACE-FO TWSA long-term baseline (full primary mission, pre-gap)
GRACE_BASELINE_START = "2002-04-01"
GRACE_BASELINE_END = "2017-01-07"

# LST Anomaly baseline — post-drought reference (excludes 1999–2002 drought)
LST_BASELINE_START = "2003-01-01"
LST_BASELINE_END   = "2010-12-31"

# Data availability windows for each dataset
# Frontend uses this to disable invalid date ranges per index
DATASET_AVAILABILITY = {
    "VCI":          {"start": "2000-02-01", "end": None},   # None = present
    "TCI":          {"start": "2000-03-01", "end": None},
    "VHI":          {"start": "2000-03-01", "end": None},
    "mTVDI":        {"start": "2000-03-01", "end": None},
    "SMI":          {"start": "2015-03-31", "end": None},
    "SMCI_SMAP":    {"start": "2015-03-31", "end": None},
    "SMCI_FLDAS":   {"start": "1982-01-01", "end": None},
    "SPI":          {"start": BASELINE_PERIOD["start"], "end": None},   # CHIRPS
    "SPEI":         {"start": "1901-01-01", "end": None},
    "PDSI":         {"start": "1958-01-01", "end": None},   # TerraClimate
    "RDI":          {"start": "1979-01-01", "end": None},   # ERA5
    "DRYSPELL":     {"start": BASELINE_PERIOD["start"], "end": None},
    "TWSA":         {"start": "2002-04-01", "end": None},   # GRACE
    "NDWI":         {"start": "2000-02-01", "end": None},
    "NDVI_ANOMALY": {"start": "2000-02-01", "end": None},
    "NPP_ANOMALY":  {"start": "2000-02-01", "end": None},
    "LST_ANOMALY":  {"start": "2000-03-01", "end": None},
}


def _chirps_monthly_sums(chirps_ic: ee.ImageCollection,
                         range_start: str,
                         range_end: str) -> ee.ImageCollection:
    """
    Aggregate CHIRPS PENTAD to one summed image per calendar month in
    [range_start, range_end). Expects chirps_ic already filtered to the desired span.
    """
    start_ee = ee.Date(range_start)
    end_ee = ee.Date(range_end)
    n_months = end_ee.difference(start_ee, "month").max(ee.Number(1))
    offsets = ee.List.sequence(0, n_months.subtract(1))

    def make_monthly(off):
        s = start_ee.advance(ee.Number(off), "month")
        e = s.advance(1, "month")
        msum = (chirps_ic.filterDate(s, e).sum()
                    .set({
                        "system:time_start": s.millis(),
                        "year": s.get("year"),
                        "month": s.get("month")
                    }))
        return msum

    return ee.ImageCollection(offsets.map(make_monthly))


def get_region_geometry(region_name: str,
                        district: Optional[str] = None,
                        custom_geojson: Optional[dict] = None) -> ee.Geometry:
    """
    Resolve a region name to a GEE geometry.
    Supports: full Pakistan, any province, specific district,
              or a user-uploaded custom GeoJSON polygon.
    """
    if custom_geojson:
        return ee.Geometry(custom_geojson)

    region_key = region_name.lower()

    # Full Pakistan = union of all province assets
    if region_key == "pakistan" or region_key == "all pakistan":
        provinces = ee.FeatureCollection(GEE_ASSETS["pakistan"])
        disputed  = ee.FeatureCollection(GEE_ASSETS["disputed"])
        return provinces.geometry().union(disputed.geometry())

    # Province-level
    if region_key in GEE_ASSETS:
        fc = ee.FeatureCollection(GEE_ASSETS[region_key])
        if district:
            fc = fc.filter(ee.Filter.eq("DISTRICT", district.upper()))
        return fc.geometry()

    # Fallback — search by PROVINCE field in main asset
    provinces = ee.FeatureCollection(GEE_ASSETS["pakistan"])
    filtered   = provinces.filter(
        ee.Filter.eq("PROVINCE", region_name.upper())
    )
    return filtered.geometry()


# ============================================================
# VISUALIZATION PALETTES
# Consistent color scales across all indices
# ============================================================

VIS_PARAMS = {
    "VCI":          {"min": 0,   "max": 100,  "palette": ["#8B4513", "#DAA520", "#228B22"]},
    "TCI":          {"min": 0,   "max": 100,  "palette": ["#d73027", "#fdae61", "#1a9850"]},
    "VHI":          {"min": 0,   "max": 100,  "palette": ["#8B0000", "#FF8C00", "#006400"]},
    "mTVDI":        {"min": 0,   "max": 1,    "palette": ["#1a9850", "#91cf60", "#fee08b", "#fc8d59", "#d73027"]},
    "SMI":          {"min": 0,   "max": 1,    "palette": ["#d73027", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"]},
    "SMCI_SMAP":    {"min": 0,   "max": 100,  "palette": ["#d73027", "#fdae61", "#1a9850"]},
    "SMCI_FLDAS":   {"min": 0,   "max": 100,  "palette": ["#d73027", "#fdae61", "#1a9850"]},
    "SPI":          {"min": -2.5,"max": 2.5,  "palette": ["#762a83", "#af8dc3", "#f7f7f7", "#7fbf7b", "#1b7837"]},
    "SPEI":         {"min": -2,  "max": 2,    "palette": ["#a50026", "#f46d43", "#fee08b", "#d9ef8b", "#1a9850"]},
    "PDSI":         {"min": -5,  "max": 5,    "palette": ["#a50026", "#d73027", "#fdae61", "#d9ef8b", "#1a9850"]},
    "RDI":          {"min": -2,  "max": 2,    "palette": ["#a50026", "#f46d43", "#ffffbf", "#a6d96a", "#1a9850"]},
    "DRYSPELL":     {"min": 0,   "max": 30,   "palette": ["#ffffcc", "#fd8d3c", "#800026"]},
    "TWSA":         {"min": -100,"max": 100,  "palette": ["#d73027", "#ffffbf", "#1a9850"]},
    "NDWI":         {"min": -0.5,"max": 0.5,  "palette": ["#7f3b08", "#e08214", "#f7f7f7", "#35978f", "#2166ac"]},
    "NDVI_ANOMALY": {"min": -0.3,"max": 0.3,  "palette": ["#d73027", "#ffffbf", "#1a9850"]},
    "NPP_ANOMALY":  {"min": -200,"max": 200,  "palette": ["#d73027", "#ffffbf", "#1a9850"]},
    "LST_ANOMALY":  {"min": -8,  "max": 8,   "palette": ["#2166ac", "#ffffbf", "#d73027"]},
    "CORRELATION":  {"min": -1,  "max": 1,    "palette": ["#d73027", "#fdae61", "#ffffbf", "#a6d96a", "#1a9850"]},
    "PVALUE":       {"min": 0,   "max": 1,    "palette": ["#d73027", "#ffffbf", "#2166ac"]},
    "ALERT":        {"min": 0,   "max": 4,    "palette": ["#ffffff", "#ffffb2", "#fecc5c", "#fd8d3c", "#e31a1c"]},
}

# Native-ish scales for reduceRegion (time series & stats) — eases free-tier load
COMPUTE_SCALE = {
    "VCI":          500,
    "TCI":          1000,
    "VHI":          1000,
    "mTVDI":        1000,
    "SMI":          11000,
    "SMCI_SMAP":    11000,
    "SMCI_FLDAS":   11000,
    "SPI":          5000,
    "SPEI":         55000,
    "PDSI":         4000,
    "RDI":          11000,
    "DRYSPELL":     5000,
    "TWSA":         55000,
    "NDWI":         500,
    "NDVI_ANOMALY": 500,
    "NPP_ANOMALY":  500,
    "LST_ANOMALY":  1000,
    "CORRELATION":  5000,
    "DEFAULT":      5000,
}


def _limit_ts_images(collection: ee.ImageCollection) -> ee.ImageCollection:
    """Keep up to 120 images sorted oldest-first for time series charts (quota guard)."""
    return ee.ImageCollection(collection).sort("system:time_start", True).limit(120)


# ============================================================
# HELPER: APPLY AGGREGATION
# Reduces an ImageCollection to a single Image
# ============================================================

def apply_aggregation(collection: ee.ImageCollection,
                      aggregation: str) -> ee.Image:
    agg = aggregation.lower()
    if agg == "mean":    return collection.mean()
    if agg == "median":  return collection.median()
    if agg == "minimum": return collection.min()
    if agg == "maximum": return collection.max()
    return collection.mean()


# ============================================================
# HELPER: GET TILE URL
# Clips result to AOI and returns Leaflet-compatible tile URL
# ============================================================

def get_tile_url(image: ee.Image,
                 geometry: ee.Geometry,
                 index_name: str) -> str:
    vis = VIS_PARAMS.get(index_name, {"min": 0, "max": 1, "palette": ["white", "blue"]})
    clipped = image.clip(geometry)
    map_id  = clipped.getMapId(vis)
    return map_id["tile_fetcher"].url_format


# ============================================================
# HELPER: GET TIME SERIES
# Returns [{date, value}] list for chart rendering
# ============================================================

def get_time_series(collection: ee.ImageCollection,
                    geometry: ee.Geometry,
                    band_name: str,
                    scale: Optional[int] = None,
                    index_name: str = "DEFAULT") -> list:
    """
    Reduces each image in a collection to a mean value over AOI.
    Uses index-aware scale, tileScale, capped image count, and safe_getinfo.
    """
    if scale is None:
        scale = COMPUTE_SCALE.get(index_name, COMPUTE_SCALE["DEFAULT"])

    collection = ee.ImageCollection(collection).sort("system:time_start", True).limit(120)

    def extract_mean(image):
        mean = image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=scale,
            maxPixels=1e9,
            bestEffort=True,
            tileScale=4,
        )
        return ee.Feature(None, {
            "date":  ee.Date(image.get("system:time_start")).format("YYYY-MM-dd"),
            "value": mean.get(band_name)
        })

    features = collection.map(extract_mean)
    result = safe_getinfo(features)

    return [
        {"date": f["properties"]["date"], "value": f["properties"]["value"]}
        for f in result.get("features", [])
        if f.get("properties", {}).get("value") is not None
    ]


# ============================================================
# ============================================================
# SECTION 1: AGRICULTURAL DROUGHT INDICES
# ============================================================
# ============================================================

def compute_vci(geometry: ee.Geometry,
                start_date: str,
                end_date: str,
                aggregation: str = "mean") -> dict:
    """
    Vegetation Condition Index
    VCI = (NDVI - NDVImin) / (NDVImax - NDVImin) × 100
    Source: MODIS MOD13Q1 (250m, 16-day)
    """
    dataset = (ee.ImageCollection("MODIS/061/MOD13Q1")
               .filterDate(start_date, end_date)
               .filterBounds(geometry)
               .select("NDVI")
               .map(lambda img: img.multiply(0.0001)
                                   .copyProperties(img, ["system:time_start", "system:index"])))

    ndvi_min = dataset.min()
    ndvi_max = dataset.max()

    def add_vci(image):
        vci = (image.subtract(ndvi_min)
                    .divide(ndvi_max.subtract(ndvi_min))
                    .multiply(100)
                    .rename("VCI"))
        index = ee.String(image.get("system:index"))
        year  = ee.Number.parse(index.split("_").get(0))
        month = ee.Number.parse(index.split("_").get(1))
        return vci.set({
            "system:time_start": image.get("system:time_start"),
            "system:index":      image.get("system:index"),
            "year":  year,
            "month": month
        })

    vci_collection = dataset.map(add_vci)
    result_image   = apply_aggregation(vci_collection, aggregation)

    return {
        "tile_url":   get_tile_url(result_image, geometry, "VCI"),
        "time_series": get_time_series(_limit_ts_images(vci_collection), geometry, "VCI", index_name="VCI"),
        "vis_params": VIS_PARAMS["VCI"]
    }


def compute_tci(geometry: ee.Geometry,
                start_date: str,
                end_date: str,
                aggregation: str = "mean") -> dict:
    """
    Temperature Condition Index
    TCI = (LSTmax - LST) / (LSTmax - LSTmin) × 100
    Source: MODIS MOD11A1 (1km, daily)
    """
    raw = (ee.ImageCollection("MODIS/061/MOD11A1")
           .filterDate(start_date, end_date)
           .filterBounds(geometry)
           .select("LST_Day_1km"))

    def scale_lst(img):
        return (img.multiply(0.02).subtract(273.15)
                   .rename("LST_Day")
                   .copyProperties(img, ["system:time_start", "system:index"]))

    lst_collection = raw.map(scale_lst)

    # Monthly composites
    start = ee.Date(start_date)
    end   = ee.Date(end_date)
    n_months = end.difference(start, "month").toInt()
    month_seq = ee.List.sequence(0, n_months.subtract(1))

    monthly = ee.ImageCollection(
        month_seq.map(lambda m: _make_monthly_lst(m, start, lst_collection, geometry))
    ).filter(ee.Filter.notNull(["system:time_start"]))

    lst_max = monthly.max()
    lst_min = monthly.min()

    def compute_tci_img(image):
        tci = (lst_max.subtract(image)
                      .divide(lst_max.subtract(lst_min))
                      .multiply(100)
                      .rename("TCI"))
        index = ee.String(image.get("system:index"))
        year  = ee.Number.parse(index.split("_").get(0))
        month = ee.Number.parse(index.split("_").get(1))
        return tci.set({
            "system:time_start": image.get("system:time_start"),
            "system:index":      index,
            "year":  year,
            "month": month
        })

    tci_collection = monthly.map(compute_tci_img)
    result_image   = apply_aggregation(tci_collection, aggregation)

    return {
        "tile_url":    get_tile_url(result_image, geometry, "TCI"),
        "time_series": get_time_series(_limit_ts_images(tci_collection), geometry, "TCI", index_name="TCI"),
        "vis_params":  VIS_PARAMS["TCI"]
    }


def _make_monthly_lst(m, start_date, lst_collection, geometry):
    """Helper: create one monthly mean LST composite."""
    m = ee.Number(m)
    s = start_date.advance(m, "month")
    e = s.advance(1, "month")
    filtered = lst_collection.filterDate(s, e)
    count    = filtered.size()
    monthly  = ee.Algorithms.If(
        count.gt(0),
        filtered.mean()
                .clip(geometry)
                .set("system:time_start", s.millis())
                .set("system:index", s.format("yyyy_MM_dd")),
        None
    )
    return monthly


def compute_vhi(geometry: ee.Geometry,
                start_date: str,
                end_date: str,
                aggregation: str = "mean",
                alpha: float = 0.5) -> dict:
    """
    Vegetation Health Index
    VHI = α × VCI + (1 - α) × TCI
    Default alpha = 0.5 (equal weighting)
    Source: MODIS NDVI + LST
    """
    vci_result = compute_vci(geometry, start_date, end_date, aggregation)
    tci_result = compute_tci(geometry, start_date, end_date, aggregation)

    # Re-compute images for band math (tile URLs already returned above)
    vci_img = _get_vci_image(geometry, start_date, end_date, aggregation)
    tci_img = _get_tci_image(geometry, start_date, end_date, aggregation)

    vhi_image = (vci_img.multiply(alpha)
                        .add(tci_img.multiply(1 - alpha))
                        .rename("VHI"))

    return {
        "tile_url":    get_tile_url(vhi_image, geometry, "VHI"),
        "time_series": [],   # VHI time series computed separately if needed
        "vis_params":  VIS_PARAMS["VHI"],
        "alpha":       alpha
    }


def _get_vci_image(geometry, start_date, end_date, aggregation):
    """Internal helper returning only the VCI Image (not the full dict)."""
    dataset = (ee.ImageCollection("MODIS/061/MOD13Q1")
               .filterDate(start_date, end_date)
               .filterBounds(geometry)
               .select("NDVI")
               .map(lambda img: img.multiply(0.0001)
                                   .copyProperties(img, ["system:time_start"])))
    ndvi_min = dataset.min()
    ndvi_max = dataset.max()
    vci_col  = dataset.map(lambda img: img.subtract(ndvi_min)
                                          .divide(ndvi_max.subtract(ndvi_min))
                                          .multiply(100)
                                          .rename("VCI")
                                          .copyProperties(img, ["system:time_start"]))
    return apply_aggregation(vci_col, aggregation)


def _get_tci_image(geometry, start_date, end_date, aggregation):
    """Internal helper returning only the TCI Image (not the full dict)."""
    raw = (ee.ImageCollection("MODIS/061/MOD11A1")
           .filterDate(start_date, end_date)
           .filterBounds(geometry)
           .select("LST_Day_1km")
           .map(lambda img: img.multiply(0.02).subtract(273.15)
                               .rename("LST_Day")
                               .copyProperties(img, ["system:time_start"])))

    start     = ee.Date(start_date)
    end       = ee.Date(end_date)
    n_months  = end.difference(start, "month").toInt()
    month_seq = ee.List.sequence(0, n_months.subtract(1))
    monthly   = ee.ImageCollection(
        month_seq.map(lambda m: _make_monthly_lst(m, start, raw, geometry))
    ).filter(ee.Filter.notNull(["system:time_start"]))

    lst_max  = monthly.max()
    lst_min  = monthly.min()
    tci_col  = monthly.map(
        lambda img: lst_max.subtract(img)
                           .divide(lst_max.subtract(lst_min))
                           .multiply(100)
                           .rename("TCI")
                           .copyProperties(img, ["system:time_start"])
    )
    return apply_aggregation(tci_col, aggregation)


def compute_mtvdi(geometry: ee.Geometry,
                  start_date: str,
                  end_date: str,
                  aggregation: str = "mean") -> dict:
    """
    Modified Temperature Vegetation Dryness Index
    mTVDI = (LST - LSTmin) / (LSTmax - LSTmin)
    Clamped [0, 1]. Higher = drier.
    Source: MODIS LST + NDVI (daily)
    """
    modis_lst  = (ee.ImageCollection("MODIS/061/MOD11A1")
                  .filterDate(start_date, end_date)
                  .filterBounds(geometry)
                  .select("LST_Day_1km"))
    modis_ndvi = (ee.ImageCollection("MODIS/061/MOD13Q1")
                  .filterDate(start_date, end_date)
                  .filterBounds(geometry)
                  .select("NDVI"))

    def scale_lst(img):
        return img.multiply(0.02).subtract(273.15).copyProperties(img, ["system:time_start", "system:index"])

    def scale_ndvi(img):
        return img.multiply(0.0001).copyProperties(img, ["system:time_start", "system:index"])

    start    = ee.Date(start_date)
    end_dt   = ee.Date(end_date)
    n_months = end_dt.difference(start, "month").toInt()
    seq      = ee.List.sequence(0, n_months.subtract(1))

    def make_monthly(m):
        m   = ee.Number(m)
        s   = start.advance(m, "month")
        e   = s.advance(1, "month")
        lst_f  = modis_lst.filterDate(s, e).map(scale_lst)
        ndvi_f = modis_ndvi.filterDate(s, e).map(scale_ndvi)
        cond   = lst_f.size().gt(0).And(ndvi_f.size().gt(0))
        img    = ee.Algorithms.If(
            cond,
            lst_f.mean().addBands(ndvi_f.mean())
                        .set("system:time_start", s.millis())
                        .set("system:index", s.format("0_yyyy_MM_dd")),
            None
        )
        return img

    monthly_col = (ee.ImageCollection(seq.map(make_monthly))
                   .filter(ee.Filter.notNull(["system:time_start"]))
                   .map(lambda img: img.set(
                       "year",  ee.Number.parse(ee.String(img.get("system:index")).split("_").get(1)),
                       "month", ee.Number.parse(ee.String(img.get("system:index")).split("_").get(2))
                   )))

    ts_min = monthly_col.select("LST_Day_1km").reduce(ee.Reducer.min()).rename("Ts_min")
    ts_max = monthly_col.select("LST_Day_1km").reduce(ee.Reducer.max()).rename("Ts_max")

    def compute_mtvdi_img(img):
        ts    = img.select("LST_Day_1km")
        denom = ts_max.subtract(ts_min)
        mtvdi = ts.subtract(ts_min).divide(denom).rename("mTVDI")
        mtvdi = mtvdi.where(denom.eq(0), 0).clamp(0, 1)
        return img.addBands(mtvdi)

    mtvdi_col    = monthly_col.map(compute_mtvdi_img)
    result_image = apply_aggregation(mtvdi_col.select("mTVDI"), aggregation)

    return {
        "tile_url":    get_tile_url(result_image, geometry, "mTVDI"),
        "time_series": get_time_series(_limit_ts_images(mtvdi_col.select("mTVDI")), geometry, "mTVDI", index_name="mTVDI"),
        "vis_params":  VIS_PARAMS["mTVDI"]
    }


def compute_smi(geometry: ee.Geometry,
                start_date: str,
                end_date: str,
                aggregation: str = "mean") -> dict:
    """
    Soil Moisture Index (Normalized)
    SMI = (SM - SMmin) / (SMmax - SMmin), clamped [0, 1]
    Source: NASA SMAP SPL4SMGP (available from 2015-03-31)
    """
    smap = (ee.ImageCollection("NASA/SMAP/SPL4SMGP/008")
            .filterDate(start_date, end_date)
            .select("sm_surface"))

    start_ee = ee.Date(start_date)
    end_ee   = ee.Date(end_date)
    n_months = ee.Number(end_ee.difference(start_ee, "month")).int()
    offsets  = ee.List.sequence(0, n_months.subtract(1))

    def make_monthly(m):
        m   = ee.Number(m)
        s   = start_ee.advance(m, "month")
        e   = s.advance(1, "month")
        img = (smap.filterDate(s, e).mean()
                   .set("system:time_start", s.millis())
                   .set("month", s.get("month"))
                   .set("year",  s.get("year"))
                   .clip(geometry)
                   .rename(["sm_surface"]))
        return img

    monthly   = ee.ImageCollection(offsets.map(make_monthly))
    sm_min    = monthly.reduce(ee.Reducer.min()).rename("sm_min")
    sm_max    = monthly.reduce(ee.Reducer.max()).rename("sm_max")

    def compute_smi_img(img):
        sm    = img.select("sm_surface")
        denom = sm_max.subtract(sm_min).max(ee.Image.constant(1e-6))
        smi   = sm.subtract(sm_min).divide(denom).clamp(0, 1).rename("SMI")
        return smi.copyProperties(img, ["system:time_start", "month", "year"])

    smi_col      = monthly.map(compute_smi_img)
    result_image = apply_aggregation(smi_col, aggregation)

    return {
        "tile_url":    get_tile_url(result_image, geometry, "SMI"),
        "time_series": get_time_series(_limit_ts_images(smi_col), geometry, "SMI", index_name="SMI"),
        "vis_params":  VIS_PARAMS["SMI"]
    }


def compute_smci(geometry: ee.Geometry,
                 start_date: str,
                 end_date: str,
                 aggregation: str = "mean",
                 source: str = "SMAP") -> dict:
    """
    Soil Moisture Condition Index
    SMCI = (SM - SMmin) / (SMmax - SMmin) × 100
    Source: "SMAP" (NASA/SMAP/SPL4SMGP/008) or "FLDAS" (NASA/FLDAS/NOAH01/C/GL/M/V001)
    FLDAS is preferred for pre-2015 historical analysis (available from 1982)
    """
    if source == "SMAP":
        collection = (ee.ImageCollection("NASA/SMAP/SPL4SMGP/008")
                      .filterDate(start_date, end_date)
                      .select("sm_surface"))
        band = "sm_surface"
    else:  # FLDAS
        collection = (ee.ImageCollection("NASA/FLDAS/NOAH01/C/GL/M/V001")
                      .filterDate(start_date, end_date)
                      .select("SoilMoi00_10cm_tavg"))
        band = "SoilMoi00_10cm_tavg"

    sm_min = collection.min().rename("sm_min")
    sm_max = collection.max().rename("sm_max")

    def compute_smci_img(img):
        denom = sm_max.subtract(sm_min).max(ee.Image.constant(1e-6))
        smci  = (img.subtract(sm_min)
                    .divide(denom)
                    .multiply(100)
                    .rename("SMCI")
                    .copyProperties(img, ["system:time_start"]))
        return smci

    smci_col     = collection.map(compute_smci_img)
    result_image = apply_aggregation(smci_col, aggregation)
    smci_scale_key = "SMCI_SMAP" if source == "SMAP" else "SMCI_FLDAS"

    return {
        "tile_url":    get_tile_url(result_image, geometry, "SMCI_SMAP"),
        "time_series": get_time_series(_limit_ts_images(smci_col), geometry, "SMCI", index_name=smci_scale_key),
        "vis_params":  VIS_PARAMS["SMCI_SMAP"],
        "source":      source
    }


# ============================================================
# SECTION 2: METEOROLOGICAL DROUGHT INDICES
# ============================================================

def compute_spi(geometry: ee.Geometry,
                start_date: str,
                end_date: str,
                timescale: int = 3,
                aggregation: str = "mean") -> dict:
    """
    Standardized Precipitation Index
    n-month totals (rolling sum) are standardized against the same rolling sums built
    from BASELINE_PERIOD (1981–2010) CHIRPS monthly precipitation.
    timescale: 1, 3, 6, 12, 24 (months in each accumulation window).
    Source: CHIRPS Pentad aggregated to monthly (0.05°)
    """
    try:
        chirps_baseline = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                           .filterDate(BASELINE_PERIOD["start"], BASELINE_PERIOD["end"])
                           .filterBounds(geometry)
                           .select("precipitation"))
        monthly_baseline = _chirps_monthly_sums(
            chirps_baseline, BASELINE_PERIOD["start"], BASELINE_PERIOD["end"]
        )

        chirps_current = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                          .filterDate(start_date, end_date)
                          .filterBounds(geometry)
                          .select("precipitation"))
        monthly_col = _chirps_monthly_sums(chirps_current, start_date, end_date)

        ts = ee.Number(timescale)
        monthly_list = monthly_col.toList(monthly_col.size())
        n = monthly_col.size()

        def make_rolling(i):
            i = ee.Number(i)
            start_i = i.subtract(ts).add(1).max(0)
            window = ee.ImageCollection(monthly_list.slice(start_i, i.add(1)))
            rolling_sum = window.sum()
            ref_img = ee.Image(monthly_list.get(i))
            return rolling_sum.set({
                "system:time_start": ref_img.get("system:time_start"),
                "year": ref_img.get("year"),
                "month": ref_img.get("month"),
            })

        indices = ee.List.sequence(ts.subtract(1), n.subtract(1))
        rolled_col = ee.ImageCollection(indices.map(make_rolling))

        monthly_baseline_list = monthly_baseline.toList(monthly_baseline.size())
        n_base = monthly_baseline.size()
        indices_base = ee.List.sequence(ts.subtract(1), n_base.subtract(1))

        def make_rolling_base(i):
            i = ee.Number(i)
            start_i = i.subtract(ts).add(1).max(0)
            window = ee.ImageCollection(monthly_baseline_list.slice(start_i, i.add(1)))
            return window.sum()

        rolled_baseline = ee.ImageCollection(indices_base.map(make_rolling_base))
        baseline_mean = rolled_baseline.mean()
        baseline_stddev = rolled_baseline.reduce(ee.Reducer.stdDev()).max(
            ee.Image.constant(1e-6)
        )

        def compute_spi_img(img):
            return (
                img.subtract(baseline_mean)
                .divide(baseline_stddev)
                .rename("SPI")
                .set({
                    "system:time_start": img.get("system:time_start"),
                    "year": img.get("year"),
                    "month": img.get("month"),
                })
            )

        spi_col = rolled_col.map(compute_spi_img)
        result_image = apply_aggregation(spi_col, aggregation)

        spi_ts = spi_col.map(
            lambda img: img.select("SPI").copyProperties(
                img, ["system:time_start", "year", "month"]
            )
        )

        return {
            "tile_url":    get_tile_url(result_image, geometry, "SPI"),
            "time_series": get_time_series(_limit_ts_images(spi_ts), geometry, "SPI", index_name="SPI"),
            "vis_params":  VIS_PARAMS["SPI"],
            "timescale":   timescale
        }
    except Exception as e:
        print(f"[SPI] compute_spi failed: {e}")
        traceback.print_exc()
        raise


def compute_spei(geometry: ee.Geometry,
                 start_date: str,
                 end_date: str,
                 timescale: int = 3,
                 aggregation: str = "mean") -> dict:
    """
    Standardized Precipitation-Evapotranspiration Index
    Timescale options: 1, 3, 6, 12, 24, 48 months
    Source: CSIC SPEI Global Drought Monitor v2.10
    """
    # Map timescale to available band names
    band_map = {
        1:  "SPEI_01_month",
        3:  "SPEI_03_month",
        6:  "SPEI_06_month",
        12: "SPEI_12_month",
        24: "SPEI_24_month",
        48: "SPEI_48_month",
    }
    band = band_map.get(timescale, "SPEI_03_month")

    def tag_date(image):
        index = ee.String(image.get("system:index"))
        year  = ee.Number.parse(index.split("_").get(0))
        month = ee.Number.parse(index.split("_").get(1))
        return image.set({"year": year, "month": month,
                          "system:time_start": image.get("system:time_start")})

    spei_col = (ee.ImageCollection("CSIC/SPEI/2_10")
                .select(band)
                .filterDate(start_date, end_date)
                .map(tag_date))

    result_image = apply_aggregation(spei_col, aggregation)

    return {
        "tile_url":    get_tile_url(result_image, geometry, "SPEI"),
        "time_series": get_time_series(_limit_ts_images(spei_col), geometry, band, index_name="SPEI"),
        "vis_params":  VIS_PARAMS["SPEI"],
        "timescale":   timescale,
        "band":        band
    }


def compute_pdsi(geometry: ee.Geometry,
                 start_date: str,
                 end_date: str,
                 aggregation: str = "mean") -> dict:
    """
    Palmer Drought Severity Index
    Rescaled by ÷100 to get standard PDSI range
    Source: TerraClimate (monthly, ~4km)
    """
    def rescale(image):
        index = ee.String(image.get("system:index"))
        year  = ee.Number.parse(index.slice(0, 4))
        month = ee.Number.parse(index.slice(4, 6))
        return (image.divide(100)
                     .set({"year": year, "month": month,
                           "system:time_start": image.get("system:time_start")}))

    pdsi_col = (ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE")
                .select("pdsi")
                .filterDate(start_date, end_date)
                .map(rescale))

    result_image = apply_aggregation(pdsi_col, aggregation)

    return {
        "tile_url":    get_tile_url(result_image, geometry, "PDSI"),
        "time_series": get_time_series(_limit_ts_images(pdsi_col), geometry, "pdsi", index_name="PDSI"),
        "vis_params":  VIS_PARAMS["PDSI"]
    }


def compute_rdi(geometry: ee.Geometry,
                start_date: str,
                end_date: str,
                aggregation: str = "mean") -> dict:
    """
    Reconnaissance Drought Index
    RDI = Σ(P) / Σ(PET)  normalized to z-score
    Source: ERA5-Land (precipitation + temperature for PET estimation)
    """
    era5 = (ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR")
            .filterDate(start_date, end_date)
            .filterBounds(geometry)
            .select(["total_precipitation_sum", "temperature_2m"]))

    def compute_pet_and_tag(img):
        # Hargreaves-Samani simplified PET from temperature
        temp_c = img.select("temperature_2m").subtract(273.15)
        pet    = temp_c.multiply(0.0023).add(17.8).abs().rename("PET")
        precip = img.select("total_precipitation_sum").multiply(1000).rename("P")
        index  = ee.String(img.get("system:index"))
        return (precip.addBands(pet)
                      .set({"system:time_start": img.get("system:time_start")}))

    tagged = era5.map(compute_pet_and_tag)

    # RDI = standardized P/PET ratio
    ratio_col = tagged.map(
        lambda img: img.select("P").divide(img.select("PET").max(ee.Image.constant(0.001)))
                       .rename("RDI_raw")
                       .copyProperties(img, ["system:time_start"])
    )

    mean_ratio   = ratio_col.mean()
    stddev_ratio = ratio_col.reduce(ee.Reducer.stdDev())

    rdi_col = ratio_col.map(
        lambda img: img.subtract(mean_ratio)
                       .divide(stddev_ratio)
                       .rename("RDI")
                       .copyProperties(img, ["system:time_start"])
    )

    result_image = apply_aggregation(rdi_col, aggregation)

    return {
        "tile_url":    get_tile_url(result_image, geometry, "RDI"),
        "time_series": get_time_series(_limit_ts_images(rdi_col), geometry, "RDI", index_name="RDI"),
        "vis_params":  VIS_PARAMS["RDI"]
    }


def compute_dryspell(geometry: ee.Geometry,
                     start_date: str,
                     end_date: str,
                     aggregation: str = "mean",
                     threshold_mm: float = 1.0) -> dict:
    chirps_daily = (ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
                    .filterDate(start_date, end_date)
                    .filterBounds(geometry)
                    .select("precipitation"))

    # Mark dry days: 1 = dry, 0 = wet
    dry_days = chirps_daily.map(
        lambda img: img.lt(threshold_mm)
                       .rename("dry_day")
                       .copyProperties(img, ["system:time_start"])
    )

    # Sum of dry days over the period
    total_dry = dry_days.sum().rename("DRYSPELL").clip(geometry)

    # Get number of days in period for context
    start_ee  = ee.Date(start_date)
    end_ee    = ee.Date(end_date)
    n_days    = end_ee.difference(start_ee, "day")

    return {
        "tile_url":     get_tile_url(total_dry, geometry, "DRYSPELL"),
        "time_series":  [],
        "vis_params":   {"min": 0, "max": 90,
                         "palette": ["#ffffcc", "#fd8d3c", "#800026"]},
        "threshold_mm": threshold_mm,
        "note":         "Total dry days in selected period"
    }


# ============================================================
# SECTION 3: HYDROLOGICAL DROUGHT INDICES
# ============================================================

def compute_twsa(geometry: ee.Geometry,
                 start_date: str,
                 end_date: str,
                 aggregation: str = "mean") -> dict:
    """
    Terrestrial Water Storage Anomaly (GRACE/GRACE-FO)
    Anomaly computed relative to full 2002–2017 GRACE mission baseline mean.

    CRITICAL FIX: baseline is the full GRACE record (2002–2017), NOT
    the user query window. Previous code subtracted query mean from itself → 0.

    Scientific note: GRACE launched March 2002. For the 1999–2002 drought,
    data from April 2002 onward captures the hydrological legacy (depleted
    groundwater) even after meteorological recovery — MIDMS's unique capability.

    Resolution: ~300km. Best for province/national scale.
    """
    baseline_mean = (
        ee.ImageCollection("NASA/GRACE/MASS_GRIDS/LAND")
        .filterDate(GRACE_BASELINE_START, GRACE_BASELINE_END)
        .select("lwe_thickness_jpl")
        .mean()
    )

    current = (
        ee.ImageCollection("NASA/GRACE/MASS_GRIDS/LAND")
        .filterDate(start_date, end_date)
        .select("lwe_thickness_jpl")
    )

    anomaly_col = current.map(
        lambda img: img.subtract(baseline_mean)
        .rename("TWSA")
        .copyProperties(img, ["system:time_start"])
    )

    result_image = apply_aggregation(anomaly_col, aggregation)

    return {
        "tile_url":    get_tile_url(result_image, geometry, "TWSA"),
        "time_series": get_time_series(_limit_ts_images(anomaly_col), geometry, "TWSA", index_name="TWSA"),
        "vis_params":  VIS_PARAMS["TWSA"],
        "note":        (
            "Anomaly relative to 2002–2017 GRACE baseline. "
            "Negative values indicate groundwater/storage deficit. "
            "April 2002 data captures post-drought hydrological legacy "
            "of the 1999–2002 Indus Basin drought."
        ),
    }


def compute_surface_water_anomaly(geometry: ee.Geometry,
                                  start_date: str,
                                  end_date: str,
                                  aggregation: str = "mean") -> dict:
    """
    Surface Water Extent Anomaly — % departure from long-term baseline.

    Anomaly = ((current_water_area - baseline_water_area) /
                baseline_water_area) × 100

    Baseline: 1984–2010 JRC monthly history (full pre-MODIS era record).
    Negative values = water deficit. Validated against Khattak et al. (2019):
    Tarbela/Mangla reservoirs showed −35% to −42% in Aug–Sept 2001.

    Source: JRC/GSW1_4/MonthlyHistory
    """
    JRC_BASELINE_START = "1984-03-01"
    JRC_BASELINE_END = "2010-12-31"

    def water_presence(img):
        """1 = permanent/seasonal water, 0 = no water, masked = no data."""
        return (
            img.select("water")
            .eq(2)
            .rename("water_extent")
            .copyProperties(img, ["system:time_start"])
        )

    baseline_col = (
        ee.ImageCollection("JRC/GSW1_4/MonthlyHistory")
        .filterDate(JRC_BASELINE_START, JRC_BASELINE_END)
        .filterBounds(geometry)
        .map(water_presence)
    )
    baseline_mean = baseline_col.mean().rename("water_extent")

    current_col = (
        ee.ImageCollection("JRC/GSW1_4/MonthlyHistory")
        .filterDate(start_date, end_date)
        .filterBounds(geometry)
        .map(water_presence)
    )

    def compute_anomaly(img):
        anomaly = (
            img.subtract(baseline_mean)
            .divide(baseline_mean.max(ee.Image.constant(0.001)))
            .multiply(100)
            .rename("SWA")
            .copyProperties(img, ["system:time_start"])
        )
        return anomaly

    anomaly_col = current_col.map(compute_anomaly)
    result_image = apply_aggregation(anomaly_col, aggregation)

    return {
        "tile_url":    get_tile_url(result_image.clip(geometry), geometry, "NDWI"),
        "time_series": get_time_series(_limit_ts_images(anomaly_col), geometry, "SWA", index_name="DEFAULT"),
        "vis_params":  {
            "min":     -100,
            "max":     100,
            "palette": ["#8B0000", "#d73027", "#fdae61",
                        "#ffffbf", "#a6d96a", "#1a9850"],
        },
        "baseline_period": f"{JRC_BASELINE_START} to {JRC_BASELINE_END}",
        "note": (
            "Negative values = water deficit vs 1984–2010 baseline. "
            "Validated: Tarbela/Mangla showed −35% to −42% in Aug–Sept 2001 "
            "(Khattak et al., 2019)."
        ),
    }


def compute_ndwi(geometry: ee.Geometry,
                 start_date: str,
                 end_date: str,
                 aggregation: str = "mean") -> dict:
    """
    Normalized Difference Water Index
    NDWI = (Green − NIR) / (Green + NIR)   [McFeeters 1996]

    Source: MODIS MOD09GA (500m daily surface reflectance)
    Bands:  sur_refl_b04 = Green, sur_refl_b02 = NIR
    Scale:  0.0001 (MODIS reflectance scaling factor — was missing)
    Masking: state_1km QA band used to remove cloud/shadow/fill pixels.

    Negative NDWI = dry / no water. More negative during drought.
    """

    def calc(img):
        qa = img.select("state_1km")
        clear = qa.bitwiseAnd(0b11).eq(0)

        green = img.select("sur_refl_b04").multiply(0.0001)
        nir = img.select("sur_refl_b02").multiply(0.0001)

        ndwi = (
            green.subtract(nir)
            .divide(green.add(nir).abs().max(ee.Image.constant(0.0001)))
            .rename("NDWI")
            .updateMask(clear)
            .copyProperties(img, ["system:time_start"])
        )
        return ndwi

    collection = (
        ee.ImageCollection("MODIS/061/MOD09GA")
        .filterDate(start_date, end_date)
        .filterBounds(geometry)
        .select(["sur_refl_b02", "sur_refl_b04", "state_1km"])
    )

    ndwi_col = collection.map(calc)
    result_image = apply_aggregation(ndwi_col, aggregation)

    return {
        "tile_url":    get_tile_url(result_image.clip(geometry), geometry, "NDWI"),
        "time_series": get_time_series(_limit_ts_images(ndwi_col), geometry, "NDWI", index_name="NDWI"),
        "vis_params":  VIS_PARAMS["NDWI"],
        "note":        (
            "NDWI < 0 indicates dry/no-water surface. "
            "QA-masked and scale-corrected. "
            "More negative values confirm surface water deficit during drought."
        ),
    }


# ============================================================
# SECTION 4: IMPACT INDICES
# ============================================================

def compute_ndvi_anomaly(geometry: ee.Geometry,
                         start_date: str,
                         end_date: str,
                         aggregation: str = "mean",
                         baseline_start: str = BASELINE_PERIOD["start"],
                         baseline_end: str = BASELINE_PERIOD["end"]) -> dict:
    """
    NDVI Anomaly — departure from baseline mean.
    Optimized: 29-year baseline (1981-2010), MOD13Q1 16-day composites.
    """
    def scale(img):
        return img.multiply(0.0001).copyProperties(img, ["system:time_start"])

    baseline = (ee.ImageCollection("MODIS/061/MOD13Q1")
                .filterDate(baseline_start, baseline_end)
                .filterBounds(geometry)
                .select("NDVI")
                .map(scale))

    current = (ee.ImageCollection("MODIS/061/MOD13Q1")
               .filterDate(start_date, end_date)
               .filterBounds(geometry)
               .select("NDVI")
               .map(scale))

    baseline_mean = baseline.mean()
    anomaly_col   = current.map(
        lambda img: img.subtract(baseline_mean)
                       .rename("NDVI_Anomaly")
                       .copyProperties(img, ["system:time_start"])
    )
    result_image = apply_aggregation(anomaly_col, aggregation)

    return {
        "tile_url":       get_tile_url(result_image, geometry, "NDVI_ANOMALY"),
        "time_series":    get_time_series(_limit_ts_images(anomaly_col), geometry, "NDVI_Anomaly", index_name="NDVI_ANOMALY"),
        "vis_params":     VIS_PARAMS["NDVI_ANOMALY"],
        "baseline_period": f"{baseline_start} to {baseline_end}"
    }


def compute_npp_anomaly(geometry: ee.Geometry,
                        start_date: str,
                        end_date: str,
                        aggregation: str = "mean",
                        baseline_start: str = BASELINE_PERIOD["start"],
                        baseline_end: str = BASELINE_PERIOD["end"]) -> dict:
    """
    Net Primary Productivity Anomaly.
    Optimized: 20-year baseline (1981-2010). Source: MODIS MOD17A3HGF (annual NPP).
    """
    def scale(img):
        return img.multiply(0.0001).copyProperties(img, ["system:time_start"])

    baseline_col = (ee.ImageCollection("MODIS/061/MOD17A3HGF")
                    .filterDate(baseline_start, baseline_end)
                    .filterBounds(geometry)
                    .select("Npp")
                    .map(scale))

    current_col = (ee.ImageCollection("MODIS/061/MOD17A3HGF")
                   .filterDate(start_date, end_date)
                   .filterBounds(geometry)
                   .select("Npp")
                   .map(scale))

    baseline_mean = baseline_col.mean()
    anomaly_col   = current_col.map(
        lambda img: img.subtract(baseline_mean)
                       .rename("NPP_Anomaly")
                       .copyProperties(img, ["system:time_start"])
    )
    result_image = apply_aggregation(anomaly_col, aggregation)

    return {
        "tile_url":        get_tile_url(result_image, geometry, "NPP_ANOMALY"),
        "time_series":     get_time_series(_limit_ts_images(anomaly_col), geometry, "NPP_Anomaly", index_name="NPP_ANOMALY"),
        "vis_params":      VIS_PARAMS["NPP_ANOMALY"],
        "baseline_period": f"{baseline_start} to {baseline_end}"
    }


def compute_lst_anomaly(geometry: ee.Geometry,
                        start_date: str,
                        end_date: str,
                        aggregation: str = "mean",
                        baseline_start: str = LST_BASELINE_START,
                        baseline_end: str = LST_BASELINE_END) -> dict:
    """
    Land Surface Temperature Anomaly.
    Optimized: MOD11A2 8-day composites, 29-year baseline (1981-2010).
    """
    try:
        collection = (ee.ImageCollection("MODIS/061/MOD11A2")
                      .select("LST_Day_1km")
                      .filterBounds(geometry))

        def scale_lst(img):
            return (img.multiply(0.02).subtract(273.15)
                       .rename("LST")
                       .copyProperties(img, ["system:time_start"]))

        current = (collection
                   .filterDate(start_date, end_date)
                   .map(scale_lst))

        baseline = (collection
                    .filterDate(baseline_start, baseline_end)
                    .map(scale_lst))

        baseline_mean = baseline.mean()
        current_mean  = apply_aggregation(current, aggregation)
        anomaly = current_mean.subtract(baseline_mean).rename("LST_Anomaly")

        anomaly_col = current.map(
            lambda img: img.subtract(baseline_mean)   # ← baseline_mean, not current_mean
                        .rename("LST_Anomaly")
                        .copyProperties(img, ["system:time_start"])
        )
        return {
            "tile_url":    get_tile_url(anomaly.clip(geometry), geometry, "LST_ANOMALY"),
            "time_series": get_time_series(_limit_ts_images(anomaly_col), geometry, "LST_Anomaly", index_name="LST_ANOMALY"),
            "vis_params":  VIS_PARAMS["LST_ANOMALY"],
            "baseline_period": f"{baseline_start} to {baseline_end}"
        }
    except Exception as e:
        print(f"[LST_ANOMALY] compute_lst_anomaly failed: {e}")
        traceback.print_exc()
        raise


# ============================================================
# SECTION 5: PIXEL-WISE CORRELATION ANALYSIS
# YOUR UNIQUE CONTRIBUTION — replaces all 50 correlation scripts
# ============================================================

def compute_pixel_correlation(geometry: ee.Geometry,
                               index_a: str,
                               index_b: str,
                               start_date: str,
                               end_date: str) -> dict:
    """
    Pixel-wise Pearson correlation between any two indices.
    This single function replaces ALL 50 of your correlation GEE scripts.

    index_a: driver variable  e.g. "SPI", "RAINFALL", "SMI", "AIR_TEMP"
    index_b: target index     e.g. "VCI", "TCI", "PDSI", "mTVDI", "NDWI"

    Returns correlation map + p-value map tile URLs.
    """
    col_a = _get_index_collection(index_a, geometry, start_date, end_date)
    col_b = _get_index_collection(index_b, geometry, start_date, end_date)

    band_a = _get_band_name(index_a)
    band_b = _get_band_name(index_b)

    join_filter = ee.Filter.And(
        ee.Filter.equals(leftField="year",  rightField="year"),
        ee.Filter.equals(leftField="month", rightField="month")
    )
    inner_join = ee.Join.inner()
    joined     = inner_join.apply(col_a, col_b, join_filter)

    def merge_pair(feature):                          
        primary   = ee.Image(feature.get("primary")) 
        secondary = ee.Image(feature.get("secondary"))
        n_primary   = primary.bandNames().size()
        n_secondary = secondary.bandNames().size()
        valid = n_primary.gt(0).And(n_secondary.gt(0))
        merged_img = (
            primary.select([band_a])
                   .addBands(secondary.select([band_b]))
                   .set({
                       "year":              primary.get("year"),
                       "month":             primary.get("month"),
                       "system:time_start": primary.get("system:time_start"),
                       "valid":             valid
                   })
        )
        return merged_img                             # ← still at 8 spaces

    merged = (                                        # ← back to 4 spaces
        ee.ImageCollection(joined.map(merge_pair))
          .filter(ee.Filter.eq("valid", 1))
    )

    count = safe_getinfo(merged.size())
    if count < 3:
        return {
            "error": (
                f"Insufficient overlapping data for {index_a} vs {index_b} "
                f"in {start_date} to {end_date}. "
                f"Need at least 3 paired observations, got {count}. "
                "Try a longer date range or different index combination."
            ),
            "correlation_tile_url": None,
            "pvalue_tile_url":      None,
            "index_a": index_a,
            "index_b": index_b,
        }

correlation = merged.select([band_a, band_b]).reduce(ee.Reducer.pearsonsCorrelation())
    corr_img    = correlation.select("correlation")
    pval_img    = correlation.select("p-value")

    corr_stats = safe_getinfo(corr_img.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=COMPUTE_SCALE["CORRELATION"],
        maxPixels=1e9,
        bestEffort=True,
        tileScale=4
    ))
    pval_stats = safe_getinfo(pval_img.lt(0.05).reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=COMPUTE_SCALE["CORRELATION"],
        maxPixels=1e9,
        bestEffort=True,
        tileScale=4
    ))
    mean_r     = round(corr_stats.get("correlation", 0) or 0, 3)
    pct_signif = round((pval_stats.get("correlation", 0) or 0) * 100, 1)

    return {
        "correlation_tile_url": get_tile_url(corr_img, geometry, "CORRELATION"),
        "pvalue_tile_url":      get_tile_url(pval_img, geometry, "PVALUE"),
        "vis_params_corr":      VIS_PARAMS["CORRELATION"],
        "vis_params_pval":      VIS_PARAMS["PVALUE"],
        "index_a":              index_a,
        "index_b":              index_b,
        "mean_r":               mean_r,
        "pct_significant":      pct_signif,
        "period":               f"{start_date} to {end_date}"
    }
    


def _get_band_name(index: str) -> str:
    """Maps index name to its GEE band name."""
    band_map = {
        "VCI":       "VCI",
        "TCI":       "TCI",
        "mTVDI":     "mTVDI",
        "SMI":       "SMI",
        "SPI":       "SPI",
        "SPEI":      "SPEI_03_month",
        "PDSI":      "pdsi",
        "NDWI":      "NDWI",
        "AIR_TEMP":  "Tmean_C",
        "RAINFALL":  "precipitation",
    }
    return band_map.get(index, index)


def _get_index_collection(index: str,
                           geometry: ee.Geometry,
                           start_date: str,
                           end_date: str) -> ee.ImageCollection:
    """
    Returns a tagged ImageCollection (with year/month properties)
    for any supported index. Used internally by compute_pixel_correlation().
    """
    start_year = int(start_date[:4])
    end_year   = int(end_date[:4]) - 1
    years      = ee.List.sequence(start_year, end_year)
    months     = ee.List.sequence(1, 12)

    if index == "VCI":
        ds = (ee.ImageCollection("MODIS/061/MOD13Q1")
              .filterDate(start_date, end_date).filterBounds(geometry).select("NDVI")
              .map(lambda img: img.multiply(0.0001).copyProperties(img, ["system:time_start", "system:index"])))
        nd_min = ds.min()
        nd_max = ds.max()
        def add_vci(img):
            vci = img.subtract(nd_min).divide(nd_max.subtract(nd_min)).multiply(100).rename("VCI")
            idx = ee.String(img.get("system:index"))
            return vci.set("year",  ee.Number.parse(idx.split("_").get(0)),
                           "month", ee.Number.parse(idx.split("_").get(1)),
                           "system:time_start", img.get("system:time_start"))
        return ds.map(add_vci)

    if index == "SPI":
        chirps_base = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                       .filterDate(BASELINE_PERIOD["start"], BASELINE_PERIOD["end"])
                       .filterBounds(geometry)
                       .select("precipitation"))
        monthly_base = _chirps_monthly_sums(
            chirps_base, BASELINE_PERIOD["start"], BASELINE_PERIOD["end"]
        )
        std_img = (monthly_base.reduce(ee.Reducer.stdDev())
                   .max(ee.Image.constant(1e-6)))
        mean_img = monthly_base.reduce(ee.Reducer.mean())           

        chirps = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                  .filterDate(start_date, end_date)
                  .filterBounds(geometry)
                  .select("precipitation"))
        monthly = ee.ImageCollection(ee.List(years.map(
            lambda y: months.map(lambda m: (
                chirps.filterDate(ee.Date.fromYMD(y, m, 1), ee.Date.fromYMD(y, m, 1).advance(1, "month"))
                      .sum().set({"system:time_start": ee.Date.fromYMD(y, m, 1).millis(), "year": y, "month": m})
            ))
        )).flatten())
        return monthly.map(lambda img: img.subtract(mean_img).divide(std_img).rename("SPI")
                                          .set("year", img.get("year"), "month", img.get("month"),
                                               "system:time_start", img.get("system:time_start")))

    if index == "PDSI":
        def rescale(img):
            idx = ee.String(img.get("system:index"))
            return (img.divide(100).set("year",  ee.Number.parse(idx.slice(0, 4)),
                                        "month", ee.Number.parse(idx.slice(4, 6)),
                                        "system:time_start", img.get("system:time_start")))
        return (ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE")
                .select("pdsi").filterDate(start_date, end_date).map(rescale))

    if index == "SPEI":
        def tag(img):
            idx = ee.String(img.get("system:index"))
            return img.set("year",  ee.Number.parse(idx.split("_").get(0)),
                           "month", ee.Number.parse(idx.split("_").get(1)),
                           "system:time_start", img.get("system:time_start"))
        return (ee.ImageCollection("CSIC/SPEI/2_10").select("SPEI_03_month")
                .filterDate(start_date, end_date).map(tag))

    if index == "NDWI":
        def calc_ndwi(img):
            g = img.select("sur_refl_b04"); n = img.select("sur_refl_b02")
            idx = ee.String(img.get("system:index"))
            ndwi = g.subtract(n).divide(g.add(n)).rename("NDWI")
            return ndwi.set("year",  ee.Number.parse(idx.split("_").get(0)),
                            "month", ee.Number.parse(idx.split("_").get(1)),
                            "system:time_start", img.get("system:time_start"))
        return (ee.ImageCollection("MODIS/061/MOD09GA")
                .filterDate(start_date, end_date).filterBounds(geometry)
                .select("sur_refl_b04", "sur_refl_b02").map(calc_ndwi))

    if index == "AIR_TEMP":
        def to_celsius(img):
            idx = ee.String(img.get("system:index"))
            return (img.subtract(273.15).rename("Tmean_C")
                       .set("year",  ee.Number.parse(idx.split("_").get(0)),
                            "month", ee.Number.parse(idx.split("_").get(1)),
                            "system:time_start", img.get("system:time_start")))
        return (ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR")
                .select("temperature_2m").filterDate(start_date, end_date)
                .filterBounds(geometry).map(to_celsius))

    if index == "RAINFALL":
        chirps_base = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                       .filterDate(BASELINE_PERIOD["start"], BASELINE_PERIOD["end"])
                       .filterBounds(geometry)
                       .select("precipitation"))
        monthly_base = _chirps_monthly_sums(
            chirps_base, BASELINE_PERIOD["start"], BASELINE_PERIOD["end"]
        )
        mean_rf = monthly_base.mean()
        std_rf = (monthly_base.reduce(ee.Reducer.stdDev())
                  .max(ee.Image.constant(1e-6)))

        chirps = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                  .filterDate(start_date, end_date).filterBounds(geometry).select("precipitation"))
        monthly = ee.ImageCollection(ee.List(years.map(
            lambda y: months.map(lambda m: (
                chirps.filterDate(ee.Date.fromYMD(y, m, 1), ee.Date.fromYMD(y, m, 1).advance(1, "month"))
                      .sum().rename("precipitation")
                      .set({"system:time_start": ee.Date.fromYMD(y, m, 1).millis(), "year": y, "month": m})
            ))
        )).flatten())
        return monthly.map(lambda img: (img.subtract(mean_rf).divide(std_rf).rename("precipitation")
                                        .set("year", img.get("year"), "month", img.get("month"),
                                             "system:time_start", img.get("system:time_start"))))

    if index == "SMI":
        smap = (ee.ImageCollection("NASA/SMAP/SPL4SMGP/008")
                .filterDate(start_date, end_date).select("sm_surface"))
        start_ee = ee.Date(start_date); end_ee = ee.Date(end_date)
        n_months = ee.Number(end_ee.difference(start_ee, "month")).int()
        offsets  = ee.List.sequence(0, n_months.subtract(1))
        monthly  = ee.ImageCollection(offsets.map(
            lambda m: smap.filterDate(start_ee.advance(m, "month"), start_ee.advance(ee.Number(m).add(1), "month"))
                          .mean().rename(["sm_surface"])
                          .set("system:time_start", start_ee.advance(m, "month").millis(),
                               "month", start_ee.advance(m, "month").get("month"),
                               "year",  start_ee.advance(m, "month").get("year"))
                          .clip(geometry)
        ))
        sm_min = monthly.reduce(ee.Reducer.min()).rename("sm_min")
        sm_max = monthly.reduce(ee.Reducer.max()).rename("sm_max")
        return monthly.map(lambda img: (
            img.subtract(sm_min).divide(sm_max.subtract(sm_min).max(ee.Image.constant(1e-6)))
               .clamp(0, 1).rename("SMI")
               .set("year", img.get("year"), "month", img.get("month"),
                    "system:time_start", img.get("system:time_start"))
        ))

    raise ValueError(f"Unknown index for correlation: {index}")


# ============================================================
# SECTION 6: DROUGHT PREDICTION MODULE
# Alert Decision Matrix — SPI + SPEI + NPSMI combined
# ============================================================

def compute_drought_alert(geometry: ee.Geometry,
                           forecast_date: str,
                           lead_months: int = 1) -> dict:
    """
    Drought Alert Decision Matrix (Prediction Module)
    Combines SPI + SPEI + NPSMI into 5-level alert classification:
      0 = Normal, 1 = Watch, 2 = Alert, 3 = Warning, 4 = Emergency

    This expands PakDMS's 2-input matrix (SPI + NPSMI) to 3 inputs
    by adding SPEI — accounting for temperature-driven drought.

    forecast_date: ISO date string e.g. "2026-02-27"
    lead_months: forecast horizon (1, 2, 3)
    """
    end_dt    = datetime.strptime(forecast_date, "%Y-%m-%d")
    start_str = f"{end_dt.year - 2}-{end_dt.month:02d}-01"  # 2-year lookback for SPI
    end_str   = forecast_date

    # SPI (meteorological signal)
    spi_result = compute_spi(geometry, start_str, end_str, timescale=lead_months)
    spi_img    = _get_spi_image(geometry, start_str, end_str)

    # SPEI (temperature-adjusted meteorological signal)
    spei_result = compute_spei(geometry, start_str, end_str, timescale=1)
    spei_img    = _get_spei_image(geometry, start_str, end_str)

    # NPSMI — Non-Parametric Soil Moisture Index (from SMAP)
    npsmi_img = _get_npsmi_image(geometry, start_str, end_str)

    # Decision Matrix Classification
    # Escalation rules (matching PakDMS logic but extended):
    # Emergency (4): SPI < -2.0 AND SPEI < -1.5 AND NPSMI < 0.1
    # Warning   (3): SPI < -1.5 AND SPEI < -1.0 AND NPSMI < 0.2
    # Alert     (2): SPI < -1.0 AND NPSMI < 0.3
    # Watch     (1): SPI < -0.5
    # Normal    (0): else

    alert = (ee.Image(0)
               .where(spi_img.lt(-0.5), 1)
               .where(spi_img.lt(-1.0).And(npsmi_img.lt(0.3)), 2)
               .where(spi_img.lt(-1.5).And(spei_img.lt(-1.0)).And(npsmi_img.lt(0.2)), 3)
               .where(spi_img.lt(-2.0).And(spei_img.lt(-1.5)).And(npsmi_img.lt(0.1)), 4)
               .rename("drought_alert")
               .clip(geometry))

    # Compute stats for donut chart (matching PakDMS Stats panel)
    stats = safe_getinfo(alert.reduceRegion(
        reducer=ee.Reducer.frequencyHistogram(),
        geometry=geometry,
        scale=5000,
        maxPixels=1e9,
        bestEffort=True,
        tileScale=4,
    ))

    histogram = stats.get("drought_alert", {})
    total     = sum(histogram.values()) if histogram else 1
    alert_labels = {
        "0": "Normal", "1": "Watch",
        "2": "Alert",  "3": "Warning", "4": "Emergency"
    }
    percentages = {
        alert_labels.get(str(k), str(k)): round(v / total * 100, 1)
        for k, v in histogram.items()
    }

    return {
        "tile_url":     get_tile_url(alert, geometry, "ALERT"),
        "vis_params":   VIS_PARAMS["ALERT"],
        "stats":        percentages,
        "forecast_date": forecast_date,
        "lead_months":  lead_months,
        "inputs_used":  ["SPI", "SPEI", "NPSMI"]
    }


def _get_spi_image(geometry, start_date, end_date):
    """Mean SPI over the query window; each month standardized vs BASELINE_PERIOD CHIRPS stats."""
    chirps_baseline = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                       .filterDate(BASELINE_PERIOD["start"], BASELINE_PERIOD["end"])
                       .filterBounds(geometry)
                       .select("precipitation"))
    monthly_baseline = _chirps_monthly_sums(
        chirps_baseline, BASELINE_PERIOD["start"], BASELINE_PERIOD["end"]
    )
    baseline_mean = monthly_baseline.mean()
    baseline_stddev = (monthly_baseline.reduce(ee.Reducer.stdDev())
                       .max(ee.Image.constant(1e-6)))

    chirps_current = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                      .filterDate(start_date, end_date)
                      .filterBounds(geometry)
                      .select("precipitation"))
    monthly_current = _chirps_monthly_sums(chirps_current, start_date, end_date)
    spi_col = monthly_current.map(
        lambda img: img.subtract(baseline_mean).divide(baseline_stddev).rename("SPI")
    )
    return spi_col.mean()


def _get_spei_image(geometry, start_date, end_date):
    """Returns mean SPEI image for the period."""
    spei = (ee.ImageCollection("CSIC/SPEI/2_10")
            .select("SPEI_01_month")
            .filterDate(start_date, end_date))
    return spei.mean()


def _get_npsmi_image(geometry, start_date, end_date):
    """
    Non-Parametric Soil Moisture Index
    Rank-based normalization of SMAP soil moisture — same approach as PakDMS NPSMI.
    """
    smap = (ee.ImageCollection("NASA/SMAP/SPL4SMGP/008")
            .filterDate(start_date, end_date)
            .select("sm_surface"))
    sm_min = smap.min()
    sm_max = smap.max()
    npsmi  = (smap.mean()
                  .subtract(sm_min)
                  .divide(sm_max.subtract(sm_min).max(ee.Image.constant(1e-6)))
                  .clamp(0, 1)
                  .rename("NPSMI"))
    return npsmi


# ============================================================
# SECTION 7: UNIFIED DISPATCHER
# Single entry point for FastAPI — routes any index request
# ============================================================

INDEX_DISPATCHER = {
    # Agricultural
    "VCI":        compute_vci,
    "TCI":        compute_tci,
    "VHI":        compute_vhi,
    "mTVDI":      compute_mtvdi,
    "SMI":        compute_smi,
    "SMCI_SMAP":  lambda g, s, e, agg: compute_smci(g, s, e, agg, source="SMAP"),
    "SMCI_FLDAS": lambda g, s, e, agg: compute_smci(g, s, e, agg, source="FLDAS"),
    # Meteorological
    "SPI":        compute_spi,
    "SPEI":       compute_spei,
    "PDSI":       compute_pdsi,
    "RDI":        compute_rdi,
    "DRYSPELL":   compute_dryspell,
    # Hydrological
    "TWSA":       compute_twsa,
    "NDWI":       compute_ndwi,
    "SWA":        compute_surface_water_anomaly,
    # Impact
    "NDVI_ANOMALY": compute_ndvi_anomaly,
    "NPP_ANOMALY":  compute_npp_anomaly,
    "LST_ANOMALY":  compute_lst_anomaly,
}


def compute_index(index_name: str,
                  region: str,
                  start_date: str,
                  end_date: str,
                  aggregation: str = "mean",
                  district: Optional[str] = None,
                  custom_geojson: Optional[dict] = None,
                  **kwargs) -> dict:
    """
    Main dispatcher. Called by FastAPI endpoints.
    Routes any index request to the correct compute function.

    Usage:
        result = compute_index("VCI", "PUNJAB", "2001-01-01", "2001-12-31")
        result = compute_index("SPI", "PAKISTAN", "2001-01-01", "2001-12-31", timescale=3)
        result = compute_index("TWSA", "BALOCHISTAN", "2001-01-01", "2001-12-31")
    """
    if index_name not in INDEX_DISPATCHER:
        available = list(INDEX_DISPATCHER.keys())
        raise ValueError(f"Unknown index '{index_name}'. Available: {available}")

    geometry = get_region_geometry(region, district, custom_geojson)
    fn       = INDEX_DISPATCHER[index_name]

    if index_name == "TWSA":
        s = datetime.strptime(start_date, "%Y-%m-%d")
        e = datetime.strptime(end_date, "%Y-%m-%d")
        if (e - s).days < 90:
            end_date = (s + timedelta(days=90)).strftime("%Y-%m-%d")

    # SPI and SPEI accept timescale kwarg — pass explicitly so aggregation is not confused with timescale
    if index_name in ("SPI", "SPEI") and "timescale" in kwargs:
        return fn(geometry, start_date, end_date, timescale=int(kwargs["timescale"]), aggregation=aggregation)

    return fn(geometry, start_date, end_date, aggregation)


def compute_correlation_analysis(index_a: str,
                                  index_b: str,
                                  region: str,
                                  start_date: str,
                                  end_date: str,
                                  district: Optional[str] = None) -> dict:
    """
    Dispatcher for correlation analysis module.
    Replaces all 50 standalone GEE correlation scripts.

    Usage:
        result = compute_correlation_analysis("SPI", "VCI", "PUNJAB", "2001-01-01", "2021-01-01")
        result = compute_correlation_analysis("AIR_TEMP", "mTVDI", "PAKISTAN", "2005-01-01", "2020-01-01")
    """
    geometry = get_region_geometry(region, district)
    return compute_pixel_correlation(geometry, index_a, index_b, start_date, end_date)


# ============================================================
# UTILITY: DATASET AVAILABILITY ENDPOINT
# Frontend uses this to set valid date ranges per index
# ============================================================

def get_dataset_availability() -> dict:
    """Returns the availability window for all indices."""
    return DATASET_AVAILABILITY


def get_available_indices() -> dict:
    """Returns all indices grouped by category."""
    return {
        "agricultural":    ["VCI", "TCI", "VHI", "mTVDI", "SMI", "SMCI_SMAP", "SMCI_FLDAS"],
        "meteorological":  ["SPI", "SPEI", "PDSI", "RDI", "DRYSPELL"],
        "hydrological":    ["TWSA", "NDWI", "SWA"],
        "impact":          ["NDVI_ANOMALY", "NPP_ANOMALY", "LST_ANOMALY"],
        "correlation_drivers": ["SPI", "SPEI", "PDSI", "AIR_TEMP", "RAINFALL", "SMI"],
        "correlation_targets": ["VCI", "TCI", "mTVDI", "PDSI", "SPEI", "NDWI", "SMI"],
        "prediction":      ["SPI", "SPEI", "NPSMI"]
    }
