const CORR_CONFIG = {
  gradient: 'linear-gradient(to right, #ef4444, #ffffff, #22c55e)',
  min: -1,
  max: 1,
  label: 'Correlation (r)',
}

const PVAL_CONFIG = {
  gradient: 'linear-gradient(to right, #22c55e, #ffffff, #ef4444)',
  min: 0,
  max: 1,
  label: 'p-value',
}

export default function CorrelationLegend({ type }) {
  const config = type === 'pvalue' ? PVAL_CONFIG : CORR_CONFIG

  return (
    <div
      className="rounded px-3 py-2"
      style={{
        background: 'rgba(17, 24, 39, 0.92)',
        border: '1px solid #1e3a5f',
      }}
    >
      <p
        className="mb-1"
        style={{ fontSize: 11, color: '#E8EDF5', fontWeight: 500 }}
      >
        {config.label}
      </p>
      <div
        className="rounded overflow-hidden"
        style={{
          width: 180,
          height: 10,
          background: config.gradient,
        }}
      />
      <div
        className="flex justify-between mt-1"
        style={{ fontSize: 10, color: '#6B7FA3' }}
      >
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
    </div>
  )
}

