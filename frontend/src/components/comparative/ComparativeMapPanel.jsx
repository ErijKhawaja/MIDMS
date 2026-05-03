import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useMapStore from '../../store/mapStore'
import { ALL_INDICES, INDEX_LABELS, LEGEND_CONFIG, DEFAULT_LEGEND } from '../../constants/indicesAndLegends'

const BASEMAPS = {
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain:   'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  light:     'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
}

const PAKISTAN_CENTER = [30.3753, 69.3451]
const PAKISTAN_ZOOM = 6

export default function ComparativeMapPanel({
  slotIndex,
  mapRefOut,
  otherMapRefs,
  isSyncingRef,
}) {
  const containerRef = useRef(null)
  const layerRef = useRef(null)
  const baseLayerRef = useRef(null)

  const compSlots = useMapStore((s) => s.compSlots)
  const setCompSlot = useMapStore((s) => s.setCompSlot)
  const opacity = useMapStore((s) => s.opacity)
  const activeBasemap = useMapStore((s) => s.activeBasemap)

  const slot = compSlots[slotIndex] ?? {}
  const { index, tileUrl, isLoading } = slot

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRefOut.current) return

    const map = L.map(containerRef.current, {
      center:    PAKISTAN_CENTER,
      zoom:      PAKISTAN_ZOOM,
      zoomControl: false,
      maxBounds: [[15, 50], [45, 90]],
      maxBoundsViscosity: 0.8,
    })

    baseLayerRef.current = L.tileLayer(BASEMAPS.dark, {
      attribution: '© CartoDB',
      maxZoom: 18,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapRefOut.current = map

    const syncOthers = () => {
      if (isSyncingRef?.current) return
      const center = map.getCenter()
      const zoom = map.getZoom()
      const refs = otherMapRefs?.current ?? []
      refs.forEach((ref, i) => {
        if (i !== slotIndex && ref?.current && ref.current !== map) {
          isSyncingRef.current = true
          ref.current.setView(center, zoom, { animate: false })
          setTimeout(() => { isSyncingRef.current = false }, 50)
        }
      })
    }

    map.on('moveend', syncOthers)
    map.on('zoomend', syncOthers)

    return () => {
      map.off('moveend', syncOthers)
      map.off('zoomend', syncOthers)
      map.remove()
      mapRefOut.current = null
    }
  }, [slotIndex])

  // Basemap
  useEffect(() => {
    if (!baseLayerRef.current) return
    baseLayerRef.current.setUrl(BASEMAPS[activeBasemap] || BASEMAPS.dark)
  }, [activeBasemap])

  // Tile layer
  useEffect(() => {
    const map = mapRefOut?.current
    if (!map) return

    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    if (!tileUrl) return

    layerRef.current = L.tileLayer(tileUrl, {
      opacity,
      attribution: 'Google Earth Engine',
      maxZoom: 18,
    }).addTo(map)
  }, [tileUrl])

  useEffect(() => {
    layerRef.current?.setOpacity(opacity)
  }, [opacity])

  const legendConfig = LEGEND_CONFIG[index] ?? DEFAULT_LEGEND
  const label = INDEX_LABELS[index] ?? index

  return (
    <div className="relative w-full h-full flex flex-col border border-slate-700/80 rounded overflow-hidden" style={{ background: '#0B1220' }}>
      {/* Top: dropdown + label */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 shrink-0 border-b" style={{ borderColor: '#1e3a5f', background: '#111827' }}>
        <span style={{ fontSize: 11, color: '#E8EDF5', fontWeight: 500 }}>
          {label}
        </span>
        <select
          value={index}
          onChange={(e) => setCompSlot(slotIndex, { index: e.target.value })}
          className="rounded text-xs focus:outline-none focus:border-[#C8963E] flex-1 max-w-[140px]"
          style={{
            background: '#1a2535',
            border: '1px solid #1e3a5f',
            color: '#E8EDF5',
            padding: '4px 8px',
          }}
        >
          {ALL_INDICES.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="w-full h-full" />

        {isLoading && (
          <div className="loading-overlay">
            <div className="w-6 h-6 rounded-full border-2 border-[#C8963E] border-t-transparent animate-spin" />
          </div>
        )}

        {/* Legend at bottom */}
        <div
          className="absolute bottom-2 left-2 right-2 rounded px-2 py-1.5 flex items-center gap-2"
          style={{
            background: 'rgba(0, 0, 0, 0.75)',
            border: '1px solid #1e3a5f',
          }}
        >
          <div
            className="rounded overflow-hidden shrink-0"
            style={{
              width: 120,
              height: 8,
              background: legendConfig.gradient,
            }}
          />
          <span style={{ fontSize: 9, color: '#6B7FA3' }}>
            {legendConfig.min} – {legendConfig.max}
          </span>
        </div>
      </div>
    </div>
  )
}
