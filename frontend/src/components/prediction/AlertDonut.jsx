import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import useMapStore from '../../store/mapStore'

const LEVELS = [
  { key: 'normal',    label: 'Normal',    color: '#22c55e' },
  { key: 'watch',     label: 'Watch',     color: '#eab308' },
  { key: 'alert',     label: 'Alert',     color: '#f97316' },
  { key: 'warning',   label: 'Warning',   color: '#ef4444' },
  { key: 'emergency', label: 'Emergency', color: '#7f1d1d' },
]

function normalizeStats(stats) {
  if (!stats || typeof stats !== 'object') return []
  const keys = ['normal', 'watch', 'alert', 'warning', 'emergency']
  const fallback = ['0', '1', '2', '3', '4']
  return LEVELS.map((lev, i) => {
    const val = stats[lev.key] ?? stats[fallback[i]] ?? 0
    const num = typeof val === 'number' ? val : parseFloat(val) || 0
    return { ...lev, value: Math.max(0, num) }
  })
}

export default function AlertDonut() {
  const alertStats = useMapStore((state) => state.alertStats)
  if (!alertStats) return null

  const data = normalizeStats(alertStats)
  const total = data.reduce((s, d) => s + d.value, 0)

  const withPct = data.map((d) => ({
    ...d,
    pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
  }))

  return (
    <div
      className="absolute rounded p-3 z-[1000]"
      style={{
        bottom: 48,
        right: 16,
        background: 'rgba(17, 24, 39, 0.95)',
        border: '1px solid #1e3a5f',
      }}
    >
      <div className="flex flex-col items-center">
        <div style={{ width: 180, height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={withPct}
                dataKey="value"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={1}
                stroke="none"
              >
                {withPct.map((entry, i) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2" style={{ fontSize: 10 }}>
          {withPct.map((d) => (
            <div key={d.key} className="flex items-center gap-1.5">
              <span
                className="rounded-full shrink-0"
                style={{ width: 8, height: 8, background: d.color }}
              />
              <span style={{ color: '#6B7FA3' }}>{d.label}</span>
              <span style={{ color: '#E8EDF5', fontWeight: 500 }}>{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
