import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import useMapStore from '../../store/mapStore'

export default function TimeSeriesChart() {
  const timeSeries = useMapStore((state) => state.timeSeries) ?? []

  const data = timeSeries.map((d) => ({
    date: d.date ?? d.time ?? d.timestamp,
    value: d.value ?? d.mean ?? d.aggregate,
  })).filter((d) => d.date != null && d.value != null)

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center w-full rounded"
        style={{ height: 200, background: 'transparent' }}
      >
        <span style={{ fontSize: 12, color: '#6B7FA3' }}>
          No data — click Apply to load time series
        </span>
      </div>
    )
  }

  return (
    <div id="midms-timeseries-chart" className="w-full" style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e3a5f"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#6B7FA3' }}
            tickLine={{ stroke: '#1e3a5f' }}
            axisLine={{ stroke: '#1e3a5f' }}
            angle={-45}
            textAnchor="end"
            height={40}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6B7FA3' }}
            tickLine={{ stroke: '#1e3a5f' }}
            axisLine={{ stroke: '#1e3a5f' }}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: '#1a2535',
              border: '1px solid #C8963E',
              borderRadius: 6,
              fontSize: 11,
              color: '#E8EDF5',
            }}
            labelStyle={{ color: '#6B7FA3' }}
            formatter={(value) => [value, 'Value']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#C8963E"
            strokeWidth={2}
            dot={{ fill: '#1a2535', stroke: '#C8963E', r: 3 }}
            activeDot={{ r: 4, fill: '#C8963E', stroke: '#E8EDF5' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
