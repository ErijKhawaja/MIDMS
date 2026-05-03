import DroughtMap from '../components/map/DroughtMap'
import MapControls from '../components/map/MapControls'
import LegendControl from '../components/map/LegendControl'

export default function MonitoringPage() {
  return (
    <div className="relative flex flex-col h-full">
      <div className="relative flex-1 min-h-0">
        <DroughtMap />
        <MapControls />
        <LegendControl />
      </div>
    </div>
  )
}

