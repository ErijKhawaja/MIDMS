import { format, isValid, parseISO } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import html2canvas from 'html2canvas'
import { MonitoringReportPdfDocument } from '../pdf/MonitoringReportPdf'
import { getPdfLegendStops } from '../pdf/legendStops'
import { INDEX_LABELS } from '../constants/indicesAndLegends'
import { classifyDroughtIndex } from './droughtClassification'
import { computeScaleBar } from './mapScaleBar'

const REGION_LABELS = {
  PAKISTAN: 'All Pakistan',
  PUNJAB: 'Punjab',
  SINDH: 'Sindh',
  BALOCHISTAN: 'Balochistan',
  KHYBER_PAKHTUNKHWA: 'Khyber Pakhtunkhwa',
  GILGIT_BALTISTAN: 'Gilgit-Baltistan',
  AZAD_KASHMIR: 'Azad Kashmir',
  ICT: 'ICT',
  FATA: 'FATA',
}

function formatObsDate(raw) {
  if (raw == null) return '—'
  if (typeof raw === 'string') {
    try {
      const p = parseISO(raw.length === 7 ? `${raw}-01` : raw)
      if (isValid(p)) return format(p, raw.length === 7 ? 'yyyy-MM' : 'yyyy-MM-dd')
    } catch {
      /* ignore */
    }
  }
  return String(raw)
}

function formatValue(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: 4, minimumFractionDigits: 0 })
}

async function captureElement(el, scale = 2) {
  if (!el) return null
  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#1a1a1b',
  })
  return canvas.toDataURL('image/png')
}

const PAK_CENTER = [30.3753, 69.3451]
const PAK_ZOOM = 6

/** @param {() => object} getState zustand store getState */
export async function exportMonitoringReportPdf(getState) {
  const state = getState()
  const {
    leafletMap,
    selectedIndex,
    selectedRegion,
    startDate,
    endDate,
    timeSeries,
    setChartOpen,
  } = state

  if (leafletMap) {
    leafletMap.setView(PAK_CENTER, PAK_ZOOM, { animate: false })
  }

  if (Array.isArray(timeSeries) && timeSeries.length > 0) {
    setChartOpen(true)
  }

  await new Promise((r) => setTimeout(r, 750))

  const mapEl = document.getElementById('midms-leaflet-root')
  const chartEl = document.getElementById('midms-timeseries-chart')

  const [mapImageDataUrl, chartImageDataUrl] = await Promise.all([
    captureElement(mapEl, 2),
    captureElement(chartEl, 2),
  ])

  const scale = computeScaleBar(leafletMap ?? null, 160)
  const legend = getPdfLegendStops(selectedIndex)
  const indexLabel = INDEX_LABELS[selectedIndex] ?? selectedIndex
  const regionLabel = REGION_LABELS[selectedRegion] ?? selectedRegion

  const normalizedSeries = (timeSeries ?? []).map((d) => ({
    date: d.date ?? d.time ?? d.timestamp,
    value: d.value ?? d.mean ?? d.aggregate,
  }))

  const tableRows = normalizedSeries
    .filter((d) => d.date != null && d.value != null)
    .map((d) => ({
      date: formatObsDate(d.date),
      value: formatValue(d.value),
      klass: classifyDroughtIndex(selectedIndex, d.value),
    }))

  const doc = (
    <MonitoringReportPdfDocument
      mapImageDataUrl={mapImageDataUrl}
      chartImageDataUrl={chartImageDataUrl}
      indexLabel={indexLabel}
      regionLabel={regionLabel}
      startDate={startDate}
      endDate={endDate}
      scaleBar={{ label: scale.label, widthPt: scale.barWidthPx * 0.75 }}
      legend={legend}
      tableRows={tableRows}
    />
  )

  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeIndex = String(selectedIndex).replace(/[^a-zA-Z0-9_-]+/g, '_')
  a.href = url
  a.download = `MIDMS_Report_${safeIndex}_${startDate}_${endDate}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
