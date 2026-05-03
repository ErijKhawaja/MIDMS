// All indices from all 4 categories for comparative dropdowns
export const ALL_INDICES = [
  { id: 'VCI',        label: 'VCI' },
  { id: 'TCI',        label: 'TCI' },
  { id: 'VHI',        label: 'VHI' },
  { id: 'mTVDI',      label: 'mTVDI' },
  { id: 'SMI',        label: 'SMI' },
  { id: 'SMCI_SMAP',  label: 'SMCI (SMAP)' },
  { id: 'SMCI_FLDAS', label: 'SMCI (FLDAS)' },
  { id: 'SPI',        label: 'SPI' },
  { id: 'SPEI',       label: 'SPEI' },
  { id: 'PDSI',       label: 'PDSI' },
  { id: 'RDI',        label: 'RDI' },
  { id: 'DRYSPELL',   label: 'Dry Spell' },
  { id: 'TWSA',       label: 'TWSA' },
  { id: 'NDWI',       label: 'NDWI' },
  { id: 'SWA',        label: 'SWA' },
  { id: 'NDVI_ANOMALY', label: 'NDVI Anomaly' },
  { id: 'NPP_ANOMALY',  label: 'NPP Anomaly' },
  { id: 'LST_ANOMALY',  label: 'LST Anomaly' },
]

export const INDEX_LABELS = Object.fromEntries(
  ALL_INDICES.map(({ id, label }) => [id, label])
)

export const LEGEND_CONFIG = {
  VCI:   { gradient: 'linear-gradient(to right, #8B4513, #FFD700, #22c55e)', min: 0,   max: 100 },
  TCI:   { gradient: 'linear-gradient(to right, #8B4513, #FFD700, #22c55e)', min: 0,   max: 100 },
  VHI:   { gradient: 'linear-gradient(to right, #8B4513, #FFD700, #22c55e)', min: 0,   max: 100 },
  SPI:   { gradient: 'linear-gradient(to right, #7c3aed, #fff, #22c55e)', min: -2.5, max: 2.5 },
  SPEI:  { gradient: 'linear-gradient(to right, #7c3aed, #fff, #22c55e)', min: -2.5, max: 2.5 },
  RDI:   { gradient: 'linear-gradient(to right, #7c3aed, #fff, #22c55e)', min: -2.5, max: 2.5 },
  PDSI:  { gradient: 'linear-gradient(to right, #ef4444, #fff, #22c55e)', min: -5,   max: 5 },
  TWSA:  { gradient: 'linear-gradient(to right, #ef4444, #fff, #22c55e)', min: -100, max: 100 },
  mTVDI: { gradient: 'linear-gradient(to right, #ef4444, #FFD700, #22c55e)', min: 0,   max: 1 },
  SMI:   { gradient: 'linear-gradient(to right, #ef4444, #FFD700, #22c55e)', min: 0,   max: 1 },
  SMCI_SMAP:  { gradient: 'linear-gradient(to right, #ef4444, #FFD700, #22c55e)', min: 0, max: 1 },
  SMCI_FLDAS: { gradient: 'linear-gradient(to right, #ef4444, #FFD700, #22c55e)', min: 0, max: 1 },
  NDVI_ANOMALY: { gradient: 'linear-gradient(to right, #ef4444, #fff, #22c55e)', min: -0.3, max: 0.3 },
  NPP_ANOMALY:  { gradient: 'linear-gradient(to right, #ef4444, #fff, #22c55e)', min: -0.3, max: 0.3 },
  LST_ANOMALY:  { gradient: 'linear-gradient(to right, #3b82f6, #fff, #ef4444)', min: -8, max: 8 },
  NDWI:  { gradient: 'linear-gradient(to right, #ef4444, #fff, #22c55e)', min: -1, max: 1 },
  SWA:   { gradient: 'linear-gradient(to right, #ef4444, #fff, #22c55e)', min: 0, max: 1 },
  DRYSPELL: { gradient: 'linear-gradient(to right, #fff, #f97316)', min: 0, max: 30 },
}

export const DEFAULT_LEGEND = {
  gradient: 'linear-gradient(to right, #fff, #3b82f6)',
  min: 0,
  max: 1,
}
