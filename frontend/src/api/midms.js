const BASE = import.meta.env.VITE_API_URL || ''  // empty = use Vite proxy

async function post(endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

async function get(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Monitoring Module ────────────────────────────────────────

const POLL_INTERVAL_MS = 2000

export async function fetchIndex(
  { indexName, region, startDate, endDate, aggregation = 'mean', district = null, tehsil = null, timescale = null, customGeojson = null },
  { onProgress } = {}
) {
  const body = {
    index_name: indexName,
    region,
    start_date: startDate,
    end_date: endDate,
    aggregation,
    ...(district && { district }),
    ...(tehsil && { tehsil }),
    ...(timescale && { timescale }),
    ...(customGeojson && { custom_geojson: customGeojson }),
  }
  const res = await post('/api/index', body)

  if (res.job_id) {
    while (true) {
      const prog = await get(`/api/progress/${res.job_id}`)
      onProgress?.(prog.progress ?? 0, prog.status ?? '')
      if (prog.progress >= 100) {
        if (prog.error) throw new Error(prog.error)
        if (prog.result) return prog.result
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    }
  }

  return res
}

// ── Correlation Module ────────────────────────────────────────

export function fetchCorrelation({ indexA, indexB, region, startDate, endDate, district = null, tehsil = null }) {
  return post('/api/correlation', {
    index_a:    indexA,
    index_b:    indexB,
    region,
    start_date: startDate,
    end_date:   endDate,
    ...(district && { district }),
    ...(tehsil   && { tehsil }),
  })
}

// ── Prediction Module ────────────────────────────────────────

export function fetchAlert({ region, forecastDate, leadMonths = 1, district = null, tehsil = null }) {
  return post('/api/prediction/alert', {
    region,
    forecast_date: forecastDate,
    lead_months:   leadMonths,
    ...(district && { district }),
    ...(tehsil   && { tehsil }),
  })
}

// ── Metadata ─────────────────────────────────────────────────

export const fetchIndices      = () => get('/api/meta/indices')
export const fetchAvailability = () => get('/api/meta/availability')
