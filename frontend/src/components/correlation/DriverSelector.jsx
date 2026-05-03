import useMapStore from '../../store/mapStore'

const DRIVER_OPTIONS = [
  { value: 'SPI',          label: 'SPI' },
  { value: 'SPEI',         label: 'SPEI' },
  { value: 'RAINFALL',     label: 'Rainfall' },
  { value: 'TEMPERATURE',  label: 'Air Temperature' },
  { value: 'SMI',          label: 'SMI' },
]

const TARGET_OPTIONS = [
  { value: 'VCI',      label: 'VCI' },
  { value: 'TCI',      label: 'TCI' },
  { value: 'mTVDI',    label: 'mTVDI' },
  { value: 'PDSI',     label: 'PDSI' },
  { value: 'SPEI',     label: 'SPEI' },
  { value: 'NDWI',     label: 'NDWI' },
  { value: 'SMI',      label: 'SMI' },
]

export default function DriverSelector() {
  const { driverIndex, targetIndex, setIndex } = useMapStore()

  const handleDriverChange = (event) => {
    const value = event.target.value
    // Use category/index fields to store driver/target indices in API call
    useMapStore.setState({ driverIndex: value })
  }

  const handleTargetChange = (event) => {
    const value = event.target.value
    useMapStore.setState({ targetIndex: value })
  }

  return (
    <div>
      <p className="label mb-3">Driver Variable (X)</p>
      <div className="mb-4">
        <select
          value={driverIndex}
          onChange={handleDriverChange}
          className="w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#C8963E]"
          style={{
            background: '#1a2535',
            border: '1px solid #1e3a5f',
            color: '#E8EDF5',
          }}
        >
          {DRIVER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <p className="label mb-3">Target Index (Y)</p>
      <div className="mb-3">
        <select
          value={targetIndex}
          onChange={handleTargetChange}
          className="w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#C8963E]"
          style={{
            background: '#1a2535',
            border: '1px solid #1e3a5f',
            color: '#E8EDF5',
          }}
        >
          {TARGET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="rounded p-2.5 mb-1"
        style={{
          background: 'rgba(30, 58, 95, 0.2)',
          border: '1px solid #1e3a5f',
          fontSize: 11,
          color: '#6B7FA3',
          lineHeight: 1.4,
        }}
      >
        Computes pixel-wise Pearson correlation coefficient (r) and p-value for each pixel across the selected time period
      </div>

      <p className="mt-1" style={{ fontSize: 10, color: '#6B7FA3' }}>
        Tip: longer time periods give more statistically robust results
      </p>
    </div>
  )
}
