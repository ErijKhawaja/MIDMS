import useMapStore from '../../store/mapStore'
import TimeSeriesChart from '../charts/TimeSeriesChart'

const REGION_LABELS = {
  PAKISTAN: 'All Pakistan',
  PUNJAB: 'Punjab',
  SINDH: 'Sindh',
  BALOCHISTAN: 'Balochistan',
  KHYBER_PAKHTUNKHWA: 'Khyber Pakhtunkhwa',
  GILGIT_BALTISTAN: 'Gilgit-Baltistan',
  AZAD_KASHMIR: 'Azad Kashmir',
  ICT: 'ICT',
  FATA: 'FATA',
}

export default function BottomPanel() {
  const selectedIndex = useMapStore((state) => state.selectedIndex)
  const selectedRegion = useMapStore((state) => state.selectedRegion)
  const setChartOpen = useMapStore((state) => state.setChartOpen)

  const regionLabel = REGION_LABELS[selectedRegion] ?? selectedRegion

  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{
        height: 280,
        background: '#111827',
        borderTop: '1px solid #1e3a5f',
      }}
    >
      <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b" style={{ borderColor: '#1e3a5f' }}>
        <h2 className="text-sm font-medium tracking-wide" style={{ color: '#E8EDF5' }}>
          {selectedIndex} · {regionLabel}
        </h2>
        <button
          type="button"
          onClick={() => setChartOpen(false)}
          className="inline-flex items-center justify-center w-7 h-7 rounded transition-colors"
          style={{
            border: '1px solid #1e3a5f',
            color: '#6B7FA3',
            background: 'transparent',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#1e3a5f'
            e.currentTarget.style.color = '#E8EDF5'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#6B7FA3'
          }}
          aria-label="Close chart panel"
        >
          ×
        </button>
      </div>
      <div className="flex-1 min-h-0 px-4 py-3">
        <TimeSeriesChart />
      </div>
    </div>
  )
}
