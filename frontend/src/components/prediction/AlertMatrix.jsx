const LEVELS = [
  { color: '#22c55e', name: 'Normal',    desc: 'No drought conditions' },
  { color: '#eab308', name: 'Watch',     desc: 'Drought possible, monitor closely' },
  { color: '#f97316', name: 'Alert',     desc: 'Drought developing' },
  { color: '#ef4444', name: 'Warning',   desc: 'Severe drought' },
  { color: '#7f1d1d', name: 'Emergency', desc: 'Extreme drought' },
]

export default function AlertMatrix() {
  return (
    <div
      className="absolute rounded p-3 z-[1000]"
      style={{
        top: 16,
        left: 16,
        background: 'rgba(17, 24, 39, 0.95)',
        border: '1px solid #1e3a5f',
      }}
    >
      <p className="label mb-2">Alert Levels</p>
      <div className="flex flex-col gap-1.5">
        {LEVELS.map((lev) => (
          <div
            key={lev.name}
            className="flex items-center gap-2"
            style={{ fontSize: 11 }}
          >
            <span
              className="rounded shrink-0"
              style={{
                width: 12,
                height: 10,
                background: lev.color,
              }}
            />
            <span style={{ color: '#E8EDF5', fontWeight: 500, minWidth: 72 }}>
              {lev.name}
            </span>
            <span style={{ color: '#6B7FA3' }}>{lev.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
