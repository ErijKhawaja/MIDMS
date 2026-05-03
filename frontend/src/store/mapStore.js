import { create } from 'zustand'

const useMapStore = create((set, get) => ({
  // ── Region ──────────────────────────────────────────────
  selectedRegion:   'PAKISTAN',
  selectedDistrict: null,
  selectedTehsil:   null,
  customGeojson:    null,

  // ── Module & Index ──────────────────────────────────────
  activeModule:     'monitoring',   // monitoring | prediction | correlation | comparative
  selectedCategory: 'agricultural',
  selectedIndex:    'VCI',
  aggregation:      'mean',
  timescale:        3,              // SPI / SPEI only

  // ── Date ────────────────────────────────────────────────
  startDate: '2020-01-01',
  endDate:   '2022-12-31',

  // ── Map tiles ───────────────────────────────────────────
  tileUrl:       null,
  leafletMap:    null,
  isLoading:     false,
  error:         null,
  opacity:       0.85,
  activeBasemap: 'dark',
  progressPercent: 0,
  progressStatus:  '',

  // ── Chart ───────────────────────────────────────────────
  timeSeries:  [],
  isChartOpen: false,

  // ── Correlation module ───────────────────────────────────
  driverIndex:  'SPI',
  targetIndex:  'VCI',
  corrTileUrl:  null,
  pvalTileUrl:  null,
  corrMean:     null,
  corrSigFrac:  null,

  // ── Prediction module ────────────────────────────────────
  forecastDate:  new Date().toISOString().split('T')[0],
  leadMonths:    1,
  alertTileUrl:  null,
  alertStats:    null,

  // ── Comparative module ───────────────────────────────────
  compSlots: [
    { index: 'SPI',          tileUrl: null, isLoading: false },
    { index: 'VCI',          tileUrl: null, isLoading: false },
    { index: 'TWSA',         tileUrl: null, isLoading: false },
    { index: 'NDVI_ANOMALY', tileUrl: null, isLoading: false },
  ],

  // ── Actions ──────────────────────────────────────────────
  setRegion:    (region)   => set({ selectedRegion: region, selectedDistrict: null, selectedTehsil: null }),
  setDistrict:  (district) => set({ selectedDistrict: district, selectedTehsil: null }),
  setTehsil:    (tehsil)   => set({ selectedTehsil: tehsil }),
  setModule:    (module)   => set({ activeModule: module }),
  setCategory:  (cat)      => set({ selectedCategory: cat }),
  setIndex:     (idx)      => set({ selectedIndex: idx }),
  setAggregation: (agg)    => set({ aggregation: agg }),
  setTimescale: (ts)       => set({ timescale: ts }),
  setDateRange: (s, e)     => set({ startDate: s, endDate: e }),
  setOpacity:   (v)        => set({ opacity: v }),
  setBasemap:   (bm)       => set({ activeBasemap: bm }),
  setChartOpen: (open)     => set({ isChartOpen: open }),
  setTileUrl:   (url)      => set({ tileUrl: url }),
  setLeafletMap: (map)     => set({ leafletMap: map }),

  setResult: ({ tileUrl, timeSeries }) => set({
    tileUrl,
    timeSeries,
    isChartOpen: timeSeries?.length > 0,
    isLoading: false,
    error: null,
    progressPercent: 100,
    progressStatus: 'complete',
  }),

  setLoading: (v) => set({ isLoading: v, error: null }),
  setProgress: (percent, status) => set({ progressPercent: percent, progressStatus: status }),
  setError:   (e) => set({ error: e, isLoading: false }),

  setCorrelationResult: ({ corrTileUrl, pvalTileUrl, meanCorrelation = null, significantFraction = null }) =>
    set({
      corrTileUrl,
      pvalTileUrl,
      corrMean:    meanCorrelation,
      corrSigFrac: significantFraction,
      isLoading:   false,
    }),

  setAlertResult: ({ alertTileUrl, alertStats }) =>
    set({ alertTileUrl, alertStats, isLoading: false }),
  setForecastDate: (d) => set({ forecastDate: d }),
  setLeadMonths:  (m) => set({ leadMonths: m }),

  setCompSlot: (slotIndex, data) => set((state) => {
    const slots = [...state.compSlots]
    slots[slotIndex] = { ...slots[slotIndex], ...data }
    return { compSlots: slots }
  }),

  clearResults: () => set({
    tileUrl: null, timeSeries: [], isChartOpen: false,
    corrTileUrl: null, pvalTileUrl: null, corrMean: null, corrSigFrac: null,
    alertTileUrl: null, alertStats: null,
  }),
}))

export default useMapStore
