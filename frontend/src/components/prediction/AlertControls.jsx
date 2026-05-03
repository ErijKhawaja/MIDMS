import useMapStore from '../../store/mapStore'

const LEAD_OPTIONS = [
  { months: 1, label: '1 Month' },
  { months: 2, label: '2 Months' },
  { months: 3, label: '3 Months' },
]

export default function AlertControls() {
  const { forecastDate, setForecastDate, leadMonths, setLeadMonths } = useMapStore()
  const today = new Date().toISOString().split('T')[0]
  const value = forecastDate || today

  return (
    <div>
      <p className="label mb-3">Forecast Date</p>
      <div className="mb-4">
        <input
          type="date"
          value={value}
          onChange={(e) => setForecastDate(e.target.value || today)}
          className="w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#C8963E]"
          style={{
            background: '#1a2535',
            border: '1px solid #1e3a5f',
            color: '#E8EDF5',
          }}
        />
      </div>

      <p className="label mb-3">Lead Time</p>
      <div className="flex gap-2 mb-4">
        {LEAD_OPTIONS.map((opt) => {
          const isActive = leadMonths === opt.months
          return (
            <button
              key={opt.months}
              onClick={() => setLeadMonths(opt.months)}
              className="flex-1 py-2 rounded text-xs transition-all"
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

      <div
        className="rounded p-2.5"
        style={{
          background: 'rgba(30, 58, 95, 0.2)',
          border: '1px solid #1e3a5f',
          fontSize: 11,
          color: '#6B7FA3',
          lineHeight: 1.4,
        }}
      >
        Alert levels combine SPI + SPEI + NPSMI into 5 drought severity classes
      </div>
    </div>
  )
}
