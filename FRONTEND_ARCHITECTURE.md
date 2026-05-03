# MIDMS Frontend Architecture
## React + Leaflet + Tailwind CSS

---

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── main.jsx                    # React entry point
│   ├── App.jsx                     # Router + layout shell
│   │
│   ├── api/
│   │   └── midms.js                # All fetch calls to FastAPI — one file
│   │
│   ├── hooks/
│   │   ├── useIndex.js             # Fetches index tile + time series
│   │   ├── useCorrelation.js       # Fetches correlation maps
│   │   ├── useAlert.js             # Fetches prediction alert data
│   │   └── useRegion.js            # Manages region selection state
│   │
│   ├── store/
│   │   └── mapStore.js             # Zustand global state
│   │
│   ├── components/
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx         # Left panel — index + region controls
│   │   │   ├── Topbar.jsx          # Module switcher + branding
│   │   │   └── BottomPanel.jsx     # Collapsible time series chart panel
│   │   │
│   │   ├── map/
│   │   │   ├── DroughtMap.jsx      # Core Leaflet map component
│   │   │   ├── TileLayer.jsx       # GEE tile layer manager
│   │   │   ├── RegionOverlay.jsx   # Province/district boundary highlight
│   │   │   ├── LegendControl.jsx   # Dynamic colorbar legend
│   │   │   └── MapControls.jsx     # Zoom, basemap, opacity slider
│   │   │
│   │   ├── controls/
│   │   │   ├── RegionSelector.jsx  # Province → District → Tehsil drill-down
│   │   │   ├── IndexSelector.jsx   # Category tabs + index picker
│   │   │   ├── DateRangePicker.jsx # Start/end dates (respects availability)
│   │   │   ├── AggregationToggle.jsx # Mean/Median/Min/Max
│   │   │   ├── TimescaleSlider.jsx # SPI/SPEI timescale (1,3,6,12)
│   │   │   └── OpacitySlider.jsx   # Layer transparency
│   │   │
│   │   ├── charts/
│   │   │   ├── TimeSeriesChart.jsx # Recharts line chart
│   │   │   └── AlertDonut.jsx      # Prediction module donut chart
│   │   │
│   │   ├── correlation/
│   │   │   ├── DriverSelector.jsx  # Driver index picker (SPI, Rainfall...)
│   │   │   ├── TargetSelector.jsx  # Target index picker (VCI, PDSI...)
│   │   │   └── CorrelationLegend.jsx # -1 to +1 color legend
│   │   │
│   │   └── prediction/
│   │       ├── AlertMatrix.jsx     # 5-level alert decision display
│   │       └── AlertStats.jsx      # Donut chart % breakdown
│   │
│   ├── pages/
│   │   ├── MonitoringPage.jsx      # Module 1
│   │   ├── PredictionPage.jsx      # Module 2
│   │   ├── CorrelationPage.jsx     # Module 3 (unique contribution)
│   │   └── ComparativePage.jsx     # Module 4 (multi-index side-by-side)
│   │
│   ├── utils/
│   │   ├── dateUtils.js            # Date formatting, availability checks
│   │   ├── colorUtils.js           # Palette → Leaflet gradient helpers
│   │   └── regionUtils.js          # Region name normalization
│   │
│   └── styles/
│       ├── globals.css             # CSS variables, font imports, base
│       └── map.css                 # Leaflet overrides
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── Dockerfile                      # For docker compose
```

---

## Design System

### Color Palette (CSS Variables)
```css
:root {
  /* Base */
  --color-bg:        #0B1220;   /* Deep navy — map canvas */
  --color-surface:   #111827;   /* Sidebar/panel background */
  --color-surface-2: #1a2535;   /* Elevated cards */
  --color-border:    #1e3a5f;   /* Subtle borders */

  /* Brand */
  --color-accent:    #C8963E;   /* Ochre — primary actions, active states */
  --color-accent-2:  #3B82F6;   /* Sky blue — secondary accent */

  /* Text */
  --color-text:      #E8EDF5;   /* Primary text */
  --color-muted:     #6B7FA3;   /* Labels, secondary info */

  /* Status (Alert levels) */
  --alert-normal:    #22c55e;
  --alert-watch:     #eab308;
  --alert-alert:     #f97316;
  --alert-warning:   #ef4444;
  --alert-emergency: #7f1d1d;
}
```

### Typography
```css
/* Headings — DM Serif Display (Google Fonts) */
/* Body — IBM Plex Sans (technical, readable) */
/* Mono (coordinates, values) — JetBrains Mono */
```

### Layout
- Fixed left sidebar: **320px wide**
- Fixed topbar: **56px tall**
- Collapsible bottom panel: **280px** (chart) — hidden by default
- Map fills remaining space: **100% of right/center**

---

## Core Components — Detailed Spec

---

### `App.jsx` — Router Shell

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Topbar from './components/layout/Topbar'
import Sidebar from './components/layout/Sidebar'
import MonitoringPage  from './pages/MonitoringPage'
import PredictionPage  from './pages/PredictionPage'
import CorrelationPage from './pages/CorrelationPage'
import ComparativePage from './pages/ComparativePage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-[#0B1220]">
        <Topbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 relative">
            <Routes>
              <Route path="/"            element={<MonitoringPage />} />
              <Route path="/prediction"  element={<PredictionPage />} />
              <Route path="/correlation" element={<CorrelationPage />} />
              <Route path="/comparative" element={<ComparativePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
```

---

### `store/mapStore.js` — Zustand Global State

```js
import { create } from 'zustand'

const useMapStore = create((set) => ({
  // Region
  selectedRegion:   'PAKISTAN',
  selectedDistrict: null,
  customGeojson:    null,

  // Index
  activeModule:   'monitoring',  // monitoring | prediction | correlation | comparative
  selectedIndex:  'VCI',
  selectedCategory: 'agricultural',
  aggregation:    'mean',
  timescale:      3,             // for SPI/SPEI

  // Date
  startDate: '2020-01-01',
  endDate:   '2023-12-31',

  // Map state
  tileUrl:      null,
  isLoading:    false,
  opacity:      0.85,
  activeBasemap: 'dark',

  // Chart
  timeSeries:       [],
  isChartOpen:      false,

  // Correlation
  driverIndex:  'SPI',
  targetIndex:  'VCI',
  corrTileUrl:  null,
  pvalTileUrl:  null,

  // Actions
  setRegion:    (r)   => set({ selectedRegion: r }),
  setIndex:     (idx) => set({ selectedIndex: idx }),
  setDateRange: (s,e) => set({ startDate: s, endDate: e }),
  setTileUrl:   (url) => set({ tileUrl: url }),
  setLoading:   (v)   => set({ isLoading: v }),
  setTimeSeries:(ts)  => set({ timeSeries: ts, isChartOpen: ts.length > 0 }),
  setOpacity:   (v)   => set({ opacity: v }),
}))

export default useMapStore
```

---

### `api/midms.js` — API Layer

```js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function fetchIndex({ indexName, region, startDate, endDate,
                                    aggregation='mean', district=null,
                                    timescale=null }) {
  const body = {
    index_name:  indexName,
    region,
    start_date:  startDate,
    end_date:    endDate,
    aggregation,
    ...(district  && { district }),
    ...(timescale && { timescale }),
  }
  const res = await fetch(`${BASE}/api/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchCorrelation({ indexA, indexB, region, startDate, endDate }) {
  const res = await fetch(`${BASE}/api/correlation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index_a: indexA, index_b: indexB,
                           region, start_date: startDate, end_date: endDate })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchAlert({ region, forecastDate, leadMonths=1 }) {
  const res = await fetch(`${BASE}/api/prediction/alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ region, forecast_date: forecastDate, lead_months: leadMonths })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchIndices() {
  const res = await fetch(`${BASE}/api/meta/indices`)
  return res.json()
}

export async function fetchAvailability() {
  const res = await fetch(`${BASE}/api/meta/availability`)
  return res.json()
}
```

---

### `components/map/DroughtMap.jsx` — Core Map

```jsx
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useMapStore from '../../store/mapStore'

const BASEMAPS = {
  dark:     'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain:  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  osm:      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
}

// Pakistan bounding box
const PAKISTAN_BOUNDS = [[23.5, 60.5], [37.5, 77.8]]
const PAKISTAN_CENTER = [30.3753, 69.3451]

export default function DroughtMap() {
  const mapRef      = useRef(null)
  const leafletRef  = useRef(null)
  const geeLayerRef = useRef(null)

  const { tileUrl, opacity, activeBasemap } = useMapStore()

  // Initialize map once
  useEffect(() => {
    if (leafletRef.current) return

    leafletRef.current = L.map(mapRef.current, {
      center: PAKISTAN_CENTER,
      zoom:   6,
      zoomControl: false,
      maxBounds: [[15, 50], [45, 90]],
    })

    L.tileLayer(BASEMAPS.dark, { attribution: '© CartoDB' })
     .addTo(leafletRef.current)

    // Custom zoom control — bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(leafletRef.current)

    return () => {
      leafletRef.current?.remove()
      leafletRef.current = null
    }
  }, [])

  // Update GEE tile layer when tileUrl changes
  useEffect(() => {
    if (!leafletRef.current || !tileUrl) return
    if (geeLayerRef.current) {
      leafletRef.current.removeLayer(geeLayerRef.current)
    }
    geeLayerRef.current = L.tileLayer(tileUrl, {
      opacity,
      attribution: 'Google Earth Engine'
    }).addTo(leafletRef.current)
  }, [tileUrl])

  // Update opacity without re-fetching
  useEffect(() => {
    geeLayerRef.current?.setOpacity(opacity)
  }, [opacity])

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ background: '#0B1220' }}
    />
  )
}
```

---

### `components/controls/IndexSelector.jsx`

```jsx
import useMapStore from '../../store/mapStore'

const CATEGORIES = {
  agricultural:  { label: 'Agricultural', color: '#22c55e',
    indices: ['VCI','TCI','VHI','mTVDI','SMI','SMCI_SMAP','SMCI_FLDAS'] },
  meteorological:{ label: 'Meteorological', color: '#3B82F6',
    indices: ['SPI','SPEI','PDSI','RDI','DRYSPELL'] },
  hydrological:  { label: 'Hydrological', color: '#06b6d4',
    indices: ['TWSA','NDWI','SWA'] },
  impact:        { label: 'Impact', color: '#f97316',
    indices: ['NDVI_ANOMALY','NPP_ANOMALY','LST_ANOMALY'] },
}

export default function IndexSelector() {
  const { selectedCategory, selectedIndex, setIndex } = useMapStore()
  // Renders category tab bar + index buttons for active category
  // Each index button shows name, clicking sets selectedIndex in store
}
```

---

### `components/layout/BottomPanel.jsx` — Chart Panel

```jsx
// Slides up from bottom when time series data is available
// Contains TimeSeriesChart + stats (min/max/mean/trend)
// Close button collapses it back
// Animated with CSS transition: transform translateY
```

---

## Page Layouts

### `MonitoringPage.jsx`
```
┌─ Topbar (module tabs) ──────────────────────────────────────┐
│  [Monitoring] [Prediction] [Correlation] [Comparative]       │
├─ Sidebar ──────────┬─ Map (flex-1) ───────────────────────┤
│                    │                                        │
│  Region Selector   │   DroughtMap                          │
│  ─────────────     │      + GEE tile layer                 │
│  Index Selector    │      + Pakistan boundary overlay      │
│  (category tabs)   │      + LegendControl (bottom-left)    │
│  ─────────────     │      + OpacitySlider (top-right)      │
│  Date Range        │      + Basemap switcher               │
│  Aggregation       │                                        │
│  ─────────────     │                                        │
│  [Apply] [Graph]   │                                        │
│  [Print]           │                                        │
│                    │                                        │
├────────────────────┴────────────────────────────────────────┤
│  BottomPanel (time series chart — slides up on Graph click) │
└─────────────────────────────────────────────────────────────┘
```

### `CorrelationPage.jsx` (Unique Module)
```
┌─ Topbar ────────────────────────────────────────────────────┐
├─ Sidebar ──────────┬─ Split Map ─────────────────────────┤
│                    │                                        │
│  Region Selector   │  [Correlation Map] │ [P-Value Map]    │
│  ─────────────     │   (r = -1 to +1)  │  (sig. areas)    │
│  Driver Index      │                    │                   │
│   ↓ (dropdown)     │                                        │
│  Target Index      │                                        │
│   ↓ (dropdown)     │                                        │
│  ─────────────     │                                        │
│  Date Range        │                                        │
│  ─────────────     │                                        │
│  [Compute]         │                                        │
│                    │                                        │
│  Stats:            │                                        │
│  • Mean r = 0.72   │                                        │
│  • Sig. pixels: 84%│                                        │
└────────────────────┴────────────────────────────────────────┘
```

### `ComparativePage.jsx` (Multi-Index)
```
┌─ Topbar ────────────────────────────────────────────────────┐
├─ Sidebar ──────────┬─ 2×2 Map Grid ──────────────────────┤
│                    │                                        │
│  Region Selector   │  [Meteo index]    │  [Agri index]    │
│  Date Range        │                   │                   │
│  ─────────────     │──────────────────-│──────────────────│
│  Slot 1: SPI  ↓    │  [Hydro index]    │  [Impact index]  │
│  Slot 2: VCI  ↓    │                   │                   │
│  Slot 3: TWSA ↓    │                                        │
│  Slot 4: NDVI ↓    │                                        │
│  ─────────────     │                                        │
│  [Apply All]       │                                        │
└────────────────────┴────────────────────────────────────────┘
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "recharts": "^2.12.0",
    "zustand": "^4.5.2",
    "@tanstack/react-query": "^5.40.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.395.0"
  },
  "devDependencies": {
    "vite": "^5.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38"
  }
}
```

---

## Vite Config

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000'  // Dev proxy — no CORS issues
    }
  }
})
```

---

## Cursor Prompt to Generate This

Use this in Cursor Agent mode to scaffold the full project:

```
Create a React + Vite + Tailwind frontend for a drought monitoring system called MIDMS.

File structure:
- src/App.jsx — React Router with 4 routes: /, /prediction, /correlation, /comparative
- src/store/mapStore.js — Zustand store (see schema above)
- src/api/midms.js — fetch wrappers for FastAPI backend at localhost:8000
- src/components/layout/Topbar.jsx — module switcher with 4 tabs
- src/components/layout/Sidebar.jsx — 320px fixed left panel
- src/components/map/DroughtMap.jsx — Leaflet map, Pakistan center, dark basemap
- src/pages/MonitoringPage.jsx — main layout with sidebar + map

Design system:
- Background: #0B1220 (deep navy)
- Surface: #111827
- Accent: #C8963E (ochre)
- Secondary: #3B82F6
- Text: #E8EDF5
- Fonts: DM Serif Display (headings), IBM Plex Sans (body)
- Dark, data-dense, cartographic aesthetic — NOT a copy of PakDMS

The map should:
- Center on Pakistan [30.3753, 69.3451] at zoom 6
- Use CartoDB dark basemap
- Accept a tileUrl prop and render it as a Leaflet TileLayer
- Show Pakistan boundary overlay

Do not use any purple gradients. Do not use Inter font. The sidebar controls should feel like a precision scientific instrument panel, not a generic web form.
```
