import useMapStore from '../../store/mapStore'

const BASEMAP_OPTIONS = [
  { id: 'dark',      label: 'Dark' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain',   label: 'Terrain' },
  { id: 'light',     label: 'Light' },
]

export default function MapControls() {
  const { opacity, setOpacity, activeBasemap, setBasemap } = useMapStore()
  const percent = Math.round((opacity ?? 0.85) * 100)

  return (
    <div
      className="absolute flex flex-col gap-4 p-3 rounded z-[1000]"
      style={{
        top: 16,
        right: 16,
        background: '#111827',
        border: '1px solid #1e3a5f',
      }}
    >
      {/* Section 1 — Opacity */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="label">Layer Opacity</span>
          <span style={{ fontSize: 11, color: '#6B7FA3' }}>{percent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={opacity ?? 0.85}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded cursor-pointer"
          style={{ accentColor: '#C8963E' }}
        />
      </div>

      {/* Section 2 — Basemap */}
      <div>
        <p className="label mb-2">Basemap</p>
        <div className="flex flex-wrap gap-1">
          {BASEMAP_OPTIONS.map((opt) => {
            const isActive = activeBasemap === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setBasemap(opt.id)}
                className="py-1.5 px-2 rounded text-xs transition-all"
                style={{
                  background: isActive ? '#C8963E' : 'transparent',
                  border: `1px solid ${isActive ? '#C8963E' : '#1e3a5f'}`,
                  color: isActive ? '#0B1220' : '#6B7FA3',
                  fontWeight: 500,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
