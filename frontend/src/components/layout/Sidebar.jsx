import { useLocation } from 'react-router-dom'
import RegionSelector           from '../controls/RegionSelector'
import IndexSelector            from '../controls/IndexSelector'
import DateRangePicker          from '../controls/DateRangePicker'
import AggregationToggle        from '../controls/AggregationToggle'
import SidebarActions           from '../controls/SidebarActions'
import DriverSelector           from '../correlation/DriverSelector'
import AlertControls            from '../prediction/AlertControls'
import ComparativeSlotSelector  from '../comparative/ComparativeSlotSelector'
import useMapStore              from '../../store/mapStore'

export default function Sidebar() {
  const { pathname } = useLocation()
  const isMonitoring  = pathname === '/'
  const isPrediction  = pathname === '/prediction'
  const isCorrelation = pathname === '/correlation'
  const isComparative = pathname === '/comparative'

  return (
    <aside
      className="flex flex-col shrink-0 overflow-y-auto border-r"
      style={{
        width:       '320px',
        background:  '#0d1929',
        borderColor: '#1e3a5f',
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: '#1e3a5f' }}>
        <span className="label">
          {isMonitoring  && 'Drought Monitoring'}
          {isPrediction  && 'Drought Prediction'}
          {isCorrelation && 'Correlation Analysis'}
          {isComparative && 'Comparative View'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-5 px-5 py-5 flex-1">
        <RegionSelector />

        {isMonitoring && (
          <>
            <div className="panel-divider" />
            <IndexSelector />
            <div className="panel-divider" />
            <DateRangePicker />
            <AggregationToggle />
          </>
        )}

        {isComparative && (
          <>
            <div className="panel-divider" />
            <ComparativeSlotSelector />
            <div className="panel-divider" />
            <DateRangePicker />
            <AggregationToggle />
          </>
        )}

        {isCorrelation && (
          <>
            <div className="panel-divider" />
            <DriverSelector />
            <div className="panel-divider" />
            <DateRangePicker />
          </>
        )}

        {isPrediction && (
          <>
            <div className="panel-divider" />
            <AlertControls />
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 py-4 border-t" style={{ borderColor: '#1e3a5f' }}>
        <SidebarActions />
      </div>
    </aside>
  )
}
