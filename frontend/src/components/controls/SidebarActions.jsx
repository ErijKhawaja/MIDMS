import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Play, BarChart2, FileDown, Printer, Loader } from 'lucide-react'
import useMapStore from '../../store/mapStore'
import { fetchIndex, fetchCorrelation, fetchAlert } from '../../api/midms'
import { exportMonitoringReportPdf } from '../../utils/monitoringPdfExport'

export function SidebarActions() {
  const { pathname } = useLocation()
  const store = useMapStore()
  const [pdfExporting, setPdfExporting] = useState(false)
  const isMonitoring = pathname === '/' || pathname.includes('monitoring')

  async function handleApply() {
    if (pathname === '/comparative') {
      const { compSlots, setCompSlot, setError } = store
      for (let i = 0; i < 4; i++) {
        setCompSlot(i, { isLoading: true })
      }
      setError(null)

      const timescale = store.timescale
      const common = {
        region:      store.selectedRegion,
        startDate:   store.startDate,
        endDate:     store.endDate,
        aggregation: store.aggregation,
        district:    store.selectedDistrict,
        tehsil:      store.selectedTehsil,
      }

      const promises = compSlots.map((slot, i) =>
        fetchIndex({
          ...common,
          indexName: slot.index,
          timescale: (slot.index === 'SPI' || slot.index === 'SPEI') ? timescale : null,
        })
          .then((res) => {
            console.log('Index response (comparative slot', i, '):', res)
            store.setCompSlot(i, { tileUrl: res.data.tile_url, isLoading: false })
          })
          .catch((err) => {
            store.setCompSlot(i, { isLoading: false })
            store.setError(err.message)
          })
      )

      await Promise.all(promises)
      return
    }

    store.setLoading(true)
    store.setProgress(0, '')
    try {
      const isMonitoring = pathname === '/' || pathname.includes('monitoring')
      console.log('pathname:', pathname, 'running monitoring branch:', isMonitoring)
      if (isMonitoring) {
        const res = await fetchIndex(
          {
            indexName:   store.selectedIndex,
            region:      store.selectedRegion,
            startDate:   store.startDate,
            endDate:     store.endDate,
            aggregation: store.aggregation,
            district:    store.selectedDistrict,
            tehsil:      store.selectedTehsil,
            timescale:   store.timescale,
          },
          {
            onProgress: (percent, status) => store.setProgress(percent, status),
          }
        )
        console.log('Index response:', res)
        store.setResult({
          tileUrl:    res.data.tile_url,
          timeSeries: res.data.time_series || [],
        })
      }

      if (pathname === '/correlation') {
        const res = await fetchCorrelation({
          indexA:    store.driverIndex,
          indexB:    store.targetIndex,
          region:    store.selectedRegion,
          startDate: store.startDate,
          endDate:   store.endDate,
        })
        console.log('Correlation response:', res)
        store.setCorrelationResult({
          corrTileUrl:         res.data.correlation_tile_url,
          pvalTileUrl:         res.data.pvalue_tile_url,
          meanCorrelation:     res.data.mean_r,                // ← fixed
          significantFraction: res.data.pct_significant / 100, 
        })
      }

      if (pathname === '/prediction') {
        const res = await fetchAlert({
          region:       store.selectedRegion,
          forecastDate: store.forecastDate,
          leadMonths:   store.leadMonths,
          district:     store.selectedDistrict,
          tehsil:       store.selectedTehsil,
        })
        console.log('Alert response:', res)
        store.setAlertResult({
          alertTileUrl: res.data.tile_url,
          alertStats:   res.data.stats,
        })
      }
    } catch (err) {
      store.setError(err.message)
      console.error('API error:', err)
    }
  }

  function handleGraph() {
    store.setChartOpen(!store.isChartOpen)
  }

  async function handleExportPdf() {
    setPdfExporting(true)
    try {
      await exportMonitoringReportPdf(useMapStore.getState)
    } catch (e) {
      console.error('PDF export failed:', e)
      store.setError(e?.message ?? 'PDF export failed')
    } finally {
      setPdfExporting(false)
    }
  }

  function handlePrintOrReport() {
    if (isMonitoring) {
      handleExportPdf()
    } else {
      window.print()
    }
  }

  const isComparative = pathname === '/comparative'
  const anyCompLoading = isComparative && store.compSlots?.some((s) => s.isLoading)
  const primaryLoading = store.isLoading || anyCompLoading
  const primaryLabel = isComparative ? 'Apply All' : 'Apply'

  return (
    <div className="flex flex-col gap-2">
      {/* Primary: Apply / Apply All */}
      <button
        onClick={handleApply}
        disabled={primaryLoading}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded transition-all"
        style={{
          background:  primaryLoading ? 'rgba(200,150,62,0.2)' : '#C8963E',
          color:       primaryLoading ? '#C8963E' : '#0B1220',
          fontWeight:  600,
          fontSize:    13,
          letterSpacing: '0.04em',
          cursor:      primaryLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {primaryLoading
          ? <><Loader size={14} className="animate-spin" /> Computing...</>
          : <><Play size={14} /> {primaryLabel}</>
        }
      </button>

      {/* Secondary row: Graph + PDF report (Monitoring) */}
      <div className="flex gap-2">
        <button
          onClick={handleGraph}
          className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded transition-all"
          style={{
            background:  'transparent',
            border:      '1px solid #1e3a5f',
            color:       store.isChartOpen ? '#C8963E' : '#6B7FA3',
            fontSize:    12,
            cursor:      'pointer',
          }}
        >
          <BarChart2 size={13} /> Graph
        </button>

        <button
          type="button"
          onClick={handlePrintOrReport}
          disabled={isMonitoring && pdfExporting}
          className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded transition-all"
          style={{
            background: 'transparent',
            border:     '1px solid #1e3a5f',
            color:      isMonitoring && pdfExporting ? '#C8963E' : '#6B7FA3',
            fontSize:   12,
            cursor:     isMonitoring && pdfExporting ? 'wait' : 'pointer',
          }}
          title={isMonitoring ? 'Download multi-page scientific PDF report' : 'Print this view'}
        >
          {isMonitoring ? (
            pdfExporting ? <Loader size={13} className="animate-spin" /> : <FileDown size={13} />
          ) : (
            <Printer size={13} />
          )}
          {isMonitoring ? ' Report' : ' Print'}
        </button>
      </div>

      {/* Error message */}
      {store.error && (
        <div className="text-red-400 text-xs mt-1 p-2 rounded"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {store.error}
        </div>
      )}
    </div>
  )
}

export default SidebarActions
