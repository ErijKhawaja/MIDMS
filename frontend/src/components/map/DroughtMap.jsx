import { useEffect } from 'react'
import { MapContainer, TileLayer, ScaleControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import useMapStore from '../../store/mapStore'

function LeafletMapRefBinder() {
  const map = useMap()
  const setLeafletMap = useMapStore((s) => s.setLeafletMap)
  useEffect(() => {
    setLeafletMap(map)
    return () => setLeafletMap(null)
  }, [map, setLeafletMap])
  return null
}

const BASEMAPS = {
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain:   'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  light:     'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
}

const PAKISTAN_CENTER = [30.3753, 69.3451]
const PAKISTAN_ZOOM   = 6

const PROGRESS_STATUS_LABELS = {
  request_received: 'Connecting to Google Earth Engine...',
  geometry:         'Resolving region geometry...',
  computing:        'Computing drought index...',
  tiles:            'Generating map tiles...',
  complete:         'Finalizing...',
  error:            'Something went wrong.',
  '':               'Connecting to Google Earth Engine...',
}

export default function DroughtMap() {
  const tileUrl         = useMapStore((state) => state.tileUrl)
  const opacity         = useMapStore((state) => state.opacity)
  const activeBasemap   = useMapStore((state) => state.activeBasemap)
  const isLoading       = useMapStore((state) => state.isLoading)
  const progressPercent = useMapStore((state) => state.progressPercent)
  const progressStatus  = useMapStore((state) => state.progressStatus)

  const statusLabel = PROGRESS_STATUS_LABELS[progressStatus] ?? (progressStatus || PROGRESS_STATUS_LABELS[''])
  const ringRadius = 36
  const ringStroke = 4
  const circumference = 2 * Math.PI * ringRadius
  const offset = circumference - (progressPercent / 100) * circumference

  return (
    <div id="midms-leaflet-root" className="relative w-full h-full">
      <MapContainer
        center={PAKISTAN_CENTER}
        zoom={PAKISTAN_ZOOM}
        zoomControl={false}
        maxBounds={[[15, 50], [45, 90]]}
        maxBoundsViscosity={0.8}
        style={{ height: '100%', width: '100%' }}
      >
        <LeafletMapRefBinder />
        <TileLayer
          url={BASEMAPS[activeBasemap] || BASEMAPS.dark}
          attribution="© CartoDB"
          maxZoom={18}
        />
        {tileUrl && (
          <TileLayer
            key={tileUrl}
            url={tileUrl}
            opacity={opacity}
            attribution="Google Earth Engine"
            maxZoom={18}
            tileSize={256}
          />
        )}
        <ScaleControl position="bottomleft" imperial={false} />
      </MapContainer>

      {/* Progress overlay */}
      {isLoading && (
        <div
          className="loading-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(11,18,32,0.85)',
            fontFamily: '"IBM Plex Sans", sans-serif',
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative" style={{ width: 88, height: 88 }}>
              <svg width={88} height={88} viewBox="0 0 88 88" className="transform -rotate-90">
                <circle
                  cx="44"
                  cy="44"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={ringStroke}
                />
                <circle
                  cx="44"
                  cy="44"
                  r={ringRadius}
                  fill="none"
                  stroke="#C8963E"
                  strokeWidth={ringStroke}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.35s ease-out' }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-white font-semibold"
                style={{ fontSize: 14 }}
              >
                {Math.round(progressPercent)}%
              </span>
            </div>
            <span className="text-white text-center" style={{ fontSize: 13, maxWidth: 260 }}>
              {statusLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
