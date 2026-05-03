import useMapStore from '../../store/mapStore'

const AVAILABILITY = {
  VCI:          { start: '2000-02-01', end: null },
  TCI:          { start: '2000-03-01', end: null },
  VHI:          { start: '2000-03-01', end: null },
  mTVDI:        { start: '2000-03-01', end: null },
  SMI:          { start: '2015-03-31', end: null },
  SMCI_SMAP:    { start: '2015-03-31', end: null },
  SMCI_FLDAS:   { start: '1982-01-01', end: null },
  SPI:          { start: '1981-01-01', end: null },
  SPEI:         { start: '1901-01-01', end: null },
  PDSI:         { start: '1958-01-01', end: null },
  RDI:          { start: '1979-01-01', end: null },
  DRYSPELL:     { start: '1981-01-01', end: null },
  TWSA:         { start: '2002-04-01', end: null },
  NDWI:         { start: '2000-02-01', end: null },
  SWA:          { start: '1984-03-01', end: null },
  NDVI_ANOMALY: { start: '2000-02-01', end: null },
  NPP_ANOMALY:  { start: '2000-02-01', end: null },
  LST_ANOMALY:  { start: '2000-03-01', end: null },
}

function formatAvailabilityStart(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function DateRangePicker() {
  const { startDate, endDate, setDateRange, selectedIndex } = useMapStore()

  const today = new Date().toISOString().split('T')[0]
  const avail = AVAILABILITY[selectedIndex] ?? { start: '1980-01-01', end: null }
  const minDate = avail.start ?? '1980-01-01'
  const maxDate = avail.end ?? today

  const effectiveStart = startDate || '2020-01-01'
  const effectiveEnd = endDate || '2022-12-31'

  const handleStartChange = (event) => {
    const value = event.target.value || minDate
    setDateRange(value, effectiveEnd)
  }

  const handleEndChange = (event) => {
    const value = event.target.value || today
    setDateRange(effectiveStart, value)
  }

  const indexLabel = selectedIndex || 'Index'
  const availabilityNote = `${indexLabel} available from ${formatAvailabilityStart(minDate)}`

  return (
    <div>
      <p className="label mb-3">Date Range</p>

      <div className="flex flex-col gap-3">
        <div>
          <span
            className="block mb-1"
            style={{ fontSize: 11, color: '#6B7FA3' }}
          >
            Start Date
          </span>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={effectiveStart}
            onChange={handleStartChange}
            className="w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#C8963E]"
            style={{
              background: '#1a2535',
              border: '1px solid #1e3a5f',
              color: '#E8EDF5',
            }}
          />
        </div>

        <div>
          <span
            className="block mb-1"
            style={{ fontSize: 11, color: '#6B7FA3' }}
          >
            End Date
          </span>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={effectiveEnd}
            onChange={handleEndChange}
            className="w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#C8963E]"
            style={{
              background: '#1a2535',
              border: '1px solid #1e3a5f',
              color: '#E8EDF5',
            }}
          />
        </div>
      </div>

      <p className="mt-2 text-xs" style={{ color: '#6B7FA3' }}>
        {availabilityNote}
      </p>
    </div>
  )
}
