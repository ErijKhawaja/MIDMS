import AlertMap from '../components/map/AlertMap'
import MapControls from '../components/map/MapControls'
import AlertDonut from '../components/prediction/AlertDonut'
import AlertMatrix from '../components/prediction/AlertMatrix'

export default function PredictionPage() {
  return (
    <div className="relative flex flex-col h-full">
      <div className="relative flex-1 min-h-0">
        <AlertMap />
        <MapControls />
        <AlertDonut />
        <AlertMatrix />
      </div>
    </div>
  )
}
