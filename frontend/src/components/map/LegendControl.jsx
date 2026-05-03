import useMapStore from '../../store/mapStore'
import { INDEX_LABELS, LEGEND_CONFIG, DEFAULT_LEGEND } from '../../constants/indicesAndLegends'

export default function LegendControl() {
  const { tileUrl, selectedIndex } = useMapStore()

  if (!tileUrl) return null

  const config = LEGEND_CONFIG[selectedIndex] ?? DEFAULT_LEGEND
  const label = INDEX_LABELS[selectedIndex] ?? selectedIndex

  return (
    <div
      className="absolute rounded p-3 z-[1000]"
      style={{
        bottom: 48,
        left: 16,
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid #1e3a5f',
      }}
    >
      <p
        className="mb-1.5 font-medium"
        style={{ fontSize: 12, color: '#E8EDF5' }}
      >
        {label}
      </p>
      <div
        className="rounded overflow-hidden"
        style={{
          width: 200,
          height: 12,
          background: config.gradient,
        }}
      />
      <div className="flex justify-between mt-1" style={{ fontSize: 10, color: '#6B7FA3' }}>
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
    </div>
  )
}
