import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useMapStore from '../store/mapStore'
import CorrelationLegend from '../components/correlation/CorrelationLegend'

const PAKISTAN_CENTER = [30.3753, 69.3451]
const PAKISTAN_ZOOM   = 6

function CorrelationMapPane({ tileUrl, placeholder, badge, legendType }) {
  const mapRef       = useRef(null)
  const leafletRef   = useRef(null)
  const baseLayerRef = useRef(null)
  const dataLayerRef = useRef(null)

  const { opacity, activeBasemap, isLoading } = useMapStore()

  const BASEMAPS = {
    dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    terrain:   'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    light:     'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  }

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

    if (dataLayerRef.current) {
      leafletRef.current.removeLayer(dataLayerRef.current)
      dataLayerRef.current = null
    }

    if (!tileUrl) return

    dataLayerRef.current = L.tileLayer(tileUrl, {
      opacity,
      attribution: 'Google Earth Engine',
      maxZoom: 18,
    }).addTo(leafletRef.current)
  }, [tileUrl])

  useEffect(() => {
    dataLayerRef.current?.setOpacity(opacity)
  }, [opacity])

  return (
    <div className="relative w-full h-full border-r" style={{ borderColor: '#1e3a5f' }}>
      <div ref={mapRef} className="w-full h-full" />

      <div
        className="absolute top-3 left-3 px-3 py-1.5 rounded text-xs font-medium"
        style={{
          background: 'rgba(17, 24, 39, 0.9)',
          border: '1px solid #1e3a5f',
          color: '#E8EDF5',
        }}
      >
        {badge}
      </div>

      <div className="absolute bottom-3 left-3">
        <CorrelationLegend type={legendType} />
      </div>

      {!tileUrl && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span style={{ fontSize: 12, color: '#6B7FA3', textAlign: 'center', maxWidth: 220 }}>
            {placeholder}
          </span>
        </div>
      )}
    </div>
  )
}

export default function CorrelationPage() {
  const { corrTileUrl, pvalTileUrl, corrMean, corrSigFrac } = useMapStore()
  const hasResults = !!(corrTileUrl || pvalTileUrl)

  const meanText =
    typeof corrMean === 'number' ? corrMean.toFixed(2) : 'N/A'
  const sigPctText =
    typeof corrSigFrac === 'number'
      ? `${(corrSigFrac * 100).toFixed(1)}%`
      : 'N/A'

  return (
    <div className="relative flex flex-col h-full">
      <div className="flex flex-1 min-h-0">
        <CorrelationMapPane
          tileUrl={corrTileUrl}
          badge="Correlation Coefficient (r)"
          legendType="correlation"
          placeholder="Select driver and target indices then click Apply"
        />
        <CorrelationMapPane
          tileUrl={pvalTileUrl}
          badge="Statistical Significance (p-value)"
          legendType="pvalue"
          placeholder="Select driver and target indices then click Apply"
        />
      </div>

      {hasResults && (
        <div
          className="px-5 py-3 border-t flex gap-3 items-center justify-end"
          style={{ borderColor: '#1e3a5f', background: '#0b1220' }}
        >
          <div className="flex items-center gap-2">
            <span className="label" style={{ marginRight: 4 }}>
              Mean r
            </span>
            <span className="value-badge">{meanText}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="label" style={{ marginRight: 4 }}>
              p &lt; 0.05
            </span>
            <span className="value-badge">{sigPctText}</span>
          </div>
        </div>
      )}
    </div>
  )
}


