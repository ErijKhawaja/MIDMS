import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useMapStore from '../../store/mapStore'

const BASEMAPS = {
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain:   'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  light:     'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
}

const PAKISTAN_CENTER = [30.3753, 69.3451]
const PAKISTAN_ZOOM   = 6

export default function AlertMap() {
  const mapRef        = useRef(null)
  const leafletRef    = useRef(null)
  const alertLayerRef = useRef(null)
  const baseLayerRef  = useRef(null)

  const { alertTileUrl, opacity, activeBasemap, isLoading } = useMapStore()

  useEffect(() => {
    if (leafletRef.current) return

    leafletRef.current = L.map(mapRef.current, {
      center:    PAKISTAN_CENTER,
      zoom:      PAKISTAN_ZOOM,
      zoomControl: false,
      maxBounds: [[15, 50], [45, 90]],
      maxBoundsViscosity: 0.8,
    })

    baseLayerRef.current = L.tileLayer(BASEMAPS.dark, {
      attribution: '© CartoDB',
      maxZoom: 18,
    }).addTo(leafletRef.current)

    L.control.zoom({ position: 'bottomright' }).addTo(leafletRef.current)
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(leafletRef.current)

    return () => {
      leafletRef.current?.remove()
      leafletRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!leafletRef.current || !baseLayerRef.current) return
    baseLayerRef.current.setUrl(BASEMAPS[activeBasemap] || BASEMAPS.dark)
  }, [activeBasemap])

  useEffect(() => {
    if (!leafletRef.current) return

    if (alertLayerRef.current) {
      leafletRef.current.removeLayer(alertLayerRef.current)
      alertLayerRef.current = null
    }

    if (!alertTileUrl) return

    alertLayerRef.current = L.tileLayer(alertTileUrl, {
      opacity,
      attribution: 'Google Earth Engine',
      maxZoom: 18,
    }).addTo(leafletRef.current)
  }, [alertTileUrl])

  useEffect(() => {
    alertLayerRef.current?.setOpacity(opacity)
  }, [opacity])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {isLoading && (
        <div className="loading-overlay">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-muted" style={{ fontSize: 12 }}>
              Computing alert forecast...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
