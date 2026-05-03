import useMapStore from '../../store/mapStore'

const OPTIONS = [
  { id: 'mean',   label: 'Mean' },
  { id: 'median', label: 'Median' },
  { id: 'min',    label: 'Min' },
  { id: 'max',    label: 'Max' },
]

export default function AggregationToggle() {
  const { aggregation, setAggregation } = useMapStore()

  return (
    <div>
      <p className="label mb-3">Aggregation</p>

      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => {
          const isActive = aggregation === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setAggregation(opt.id)}
              className="py-2 rounded text-xs transition-all"
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
  )
}
