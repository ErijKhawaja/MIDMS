import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Path,
} from '@react-pdf/renderer'

const MM = 2.83465
const MARGIN = 17 * MM

export const ROWS_ON_PAGE_WITH_CHART = 22
export const ROWS_ON_CONTINUATION_PAGE = 48

const COLORS = {
  bg: '#1a1a1b',
  panel: '#242426',
  text: '#e8e8ea',
  muted: '#9ca3af',
  accent: '#f2a900',
  border: '#3f3f42',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    padding: MARGIN,
    fontFamily: 'Helvetica',
    color: COLORS.text,
    fontSize: 9,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logoMark: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: 'rgba(242,169,0,0.45)',
    backgroundColor: 'rgba(242,169,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlyph: { fontSize: 11, color: COLORS.accent },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: COLORS.accent, letterSpacing: 0.5 },
  subtitle: { fontSize: 8, color: COLORS.muted, marginTop: 2 },
  meta: { fontSize: 9, color: COLORS.text, marginTop: 4 },
  stamp: {
    position: 'absolute',
    top: MARGIN - 2,
    right: MARGIN + 8,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    color: COLORS.accent,
    fontSize: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    opacity: 0.88,
    transform: 'rotate(-18deg)',
  },
  mapFrame: {
    flex: 1,
    minHeight: 420,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panel,
    position: 'relative',
  },
  mapImage: { width: '100%', height: '100%', objectFit: 'cover' },
  mapOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  northWrap: { position: 'absolute', left: 10, top: 8 },
  scaleWrap: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'column' },
  scaleTrack: { height: 3, backgroundColor: COLORS.text, position: 'relative' },
  scaleCapLeft: { position: 'absolute', left: 0, top: -3, width: 1, height: 6, backgroundColor: COLORS.text },
  scaleCapRight: { position: 'absolute', right: 0, top: -3, width: 1, height: 6, backgroundColor: COLORS.text },
  scaleLabel: { fontSize: 7, color: COLORS.text, marginTop: 2 },
  legendWrap: {
    position: 'absolute',
    right: 10,
    top: 40,
    bottom: 52,
    width: 46,
    padding: 6,
    backgroundColor: 'rgba(26,26,27,0.94)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendTitle: { fontSize: 7, color: COLORS.accent, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  legendBody: { borderWidth: 1, borderColor: COLORS.border },
  legendSeg: { width: '100%' },
  legendTicks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  legendTickLabel: { fontSize: 6, color: COLORS.muted },
  footer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: COLORS.muted },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  chart: {
    width: '100%',
    height: 200,
    objectFit: 'contain',
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  chartPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  table: { borderWidth: 1, borderColor: COLORS.border },
  trh: { flexDirection: 'row', backgroundColor: COLORS.panel, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  th: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  thLast: { borderRightWidth: 0 },
  td: {
    flex: 1,
    fontSize: 7,
    color: COLORS.text,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tdLast: { borderRightWidth: 0 },
  note: { fontSize: 7, color: COLORS.muted, marginTop: 8 },
  pageNo: { position: 'absolute', bottom: MARGIN - 14, right: MARGIN, fontSize: 7, color: COLORS.muted },
})

function colorAtOffset(stops, t) {
  const tt = Math.max(0, Math.min(1, t))
  if (stops.length === 1) return stops[0].color
  let i = 0
  while (i < stops.length - 1 && stops[i + 1].offset < tt) i += 1
  const a = stops[i]
  const b = stops[Math.min(i + 1, stops.length - 1)]
  if (!b || a.offset === b.offset) return a.color
  return tt - a.offset < (b.offset - a.offset) / 2 ? a.color : b.color
}

function NorthArrow() {
  return (
    <View style={styles.northWrap}>
      <Svg width={36} height={40} viewBox="0 0 36 40">
        <Path d="M18 4 L22 30 L18 24 L14 30 Z" fill="#f2a900" stroke="#1a1a1b" strokeWidth={0.5} />
        <Path d="M18 24 L18 38" stroke="#e8e8ea" strokeWidth={1.1} />
      </Svg>
      <Text style={{ fontSize: 7, color: COLORS.accent, marginTop: -6, marginLeft: 12 }}>N</Text>
    </View>
  )
}

function LegendGradient({ legend }) {
  const segments = 32
  const band = 176 / segments
  const rows = []
  for (let i = 0; i < segments; i += 1) {
    const t = i / (segments - 1)
    const color = colorAtOffset(legend.stops, 1 - t)
    rows.push(<View key={i} style={[styles.legendSeg, { height: band, backgroundColor: color }]} />)
  }
  return (
    <View style={styles.legendWrap}>
      <Text style={styles.legendTitle}>Drought index</Text>
      <View style={[styles.legendBody, { height: 176 }]}>{rows}</View>
      <View style={styles.legendTicks}>
        <Text style={styles.legendTickLabel}>{legend.min}</Text>
        <Text style={styles.legendTickLabel}>{legend.max}</Text>
      </View>
    </View>
  )
}

function ScaleBar({ label, widthPt }) {
  const w = Math.max(52, Math.min(widthPt, 132))
  return (
    <View style={styles.scaleWrap}>
      <View style={[styles.scaleTrack, { width: w }]}>
        <View style={styles.scaleCapLeft} />
        <View style={styles.scaleCapRight} />
      </View>
      <Text style={styles.scaleLabel}>{label}</Text>
    </View>
  )
}

function TableBlock({ rows }) {
  return (
    <View style={styles.table}>
      <View style={styles.trh}>
        <Text style={styles.th}>Date (observation)</Text>
        <Text style={styles.th}>Index mean value</Text>
        <Text style={[styles.th, styles.thLast]}>Classification</Text>
      </View>
      {rows.map((row, i) => (
        <View style={styles.tr} key={`${row.date}-${i}`}>
          <Text style={styles.td}>{row.date}</Text>
          <Text style={styles.td}>{row.value}</Text>
          <Text style={[styles.td, styles.tdLast]}>{row.klass}</Text>
        </View>
      ))}
    </View>
  )
}

function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Powered by Google Earth Engine</Text>
      <Text style={styles.footerText}>Data source: MODIS / CHIRPS / FLDAS</Text>
    </View>
  )
}

function PageNumber() {
  return (
    <Text
      style={styles.pageNo}
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
    />
  )
}

export function MonitoringReportPdfDocument({
  mapImageDataUrl,
  chartImageDataUrl,
  indexLabel,
  regionLabel,
  startDate,
  endDate,
  scaleBar,
  legend,
  tableRows,
}) {
  const firstRows = tableRows.slice(0, ROWS_ON_PAGE_WITH_CHART)
  const tail = tableRows.slice(ROWS_ON_PAGE_WITH_CHART)
  const contPages = []
  for (let i = 0; i < tail.length; i += ROWS_ON_CONTINUATION_PAGE) {
    contPages.push(tail.slice(i, i + ROWS_ON_CONTINUATION_PAGE))
  }

  return (
    <Document title={`MIDMS — ${indexLabel} — ${startDate}–${endDate}`} creator="MIDMS">
      <Page size="A4" style={styles.page}>
        <View style={styles.stamp}>
          <Text>Verified via MIDMS</Text>
        </View>

        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={styles.logoMark}>
              <Text style={styles.logoGlyph}>◈</Text>
            </View>
            <View>
              <Text style={styles.title}>MIDMS</Text>
              <Text style={styles.subtitle}>Multi-Index Drought Monitoring System</Text>
              <Text style={styles.meta}>
                {indexLabel} · {regionLabel}
              </Text>
              <Text style={styles.meta}>
                Period: {startDate} — {endDate}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.mapFrame}>
          {mapImageDataUrl ? (
            <Image src={mapImageDataUrl} style={styles.mapImage} />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: COLORS.muted }}>Map preview unavailable — click Apply to load tiles.</Text>
            </View>
          )}
          <View style={styles.mapOverlay}>
            <NorthArrow />
            <LegendGradient legend={legend} />
            <ScaleBar label={scaleBar.label} widthPt={scaleBar.widthPt} />
          </View>
        </View>

        <Footer />
        <PageNumber />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Analytics &amp; observations</Text>
        {chartImageDataUrl ? (
          <Image src={chartImageDataUrl} style={styles.chart} />
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={{ color: COLORS.muted, fontSize: 9, textAlign: 'center', paddingHorizontal: 12 }}>
              No time-series figure — open the graph panel and run Apply to populate series.
            </Text>
          </View>
        )}

        <Text style={{ ...styles.sectionTitle, marginTop: 2 }}>Observation table</Text>
        <TableBlock rows={firstRows} />
        {tail.length > 0 ? <Text style={styles.note}>Continued on the next page.</Text> : null}

        <Footer />
        <PageNumber />
      </Page>

      {contPages.map((chunk, idx) => (
        <Page size="A4" style={styles.page} key={`tbl-${idx}`}>
          <Text style={styles.sectionTitle}>Observation table (continued)</Text>
          <TableBlock rows={chunk} />
          <Footer />
          <PageNumber />
        </Page>
      ))}
    </Document>
  )
}
