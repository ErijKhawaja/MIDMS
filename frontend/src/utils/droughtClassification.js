/**
 * Classification labels aligned with common drought-monitoring practice
 * (SPI/SPEI: McKee et al.; VCI/VHI: Kogan-style vegetation stress categories).
 */
export const DROUGHT_LABELS = {
  SEVERE: 'Severe',
  MODERATE: 'Moderate',
  MILD: 'Mild',
  NORMAL: 'Normal',
  WET: 'Wet',
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

export function classifyDroughtIndex(indexId, value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const v = Number(value)

  switch (indexId) {
    case 'VCI':
    case 'TCI':
    case 'VHI':
      if (v < 30) return DROUGHT_LABELS.SEVERE
      if (v < 50) return DROUGHT_LABELS.MODERATE
      return DROUGHT_LABELS.NORMAL
    case 'SPI':
    case 'SPEI':
    case 'RDI':
      if (v <= -2) return DROUGHT_LABELS.SEVERE
      if (v < -1.5) return DROUGHT_LABELS.MODERATE
      if (v < -1) return DROUGHT_LABELS.MILD
      if (v <= 1) return DROUGHT_LABELS.NORMAL
      return DROUGHT_LABELS.WET
    case 'PDSI':
      if (v <= -4) return DROUGHT_LABELS.SEVERE
      if (v < -2) return DROUGHT_LABELS.MODERATE
      if (v < 0) return DROUGHT_LABELS.MILD
      return DROUGHT_LABELS.NORMAL
    case 'mTVDI':
    case 'SMI':
    case 'SMCI_SMAP':
    case 'SMCI_FLDAS':
    case 'SWA': {
      const t = clamp(v, 0, 1)
      if (t >= 0.65) return DROUGHT_LABELS.SEVERE
      if (t >= 0.45) return DROUGHT_LABELS.MODERATE
      if (t >= 0.25) return DROUGHT_LABELS.MILD
      return DROUGHT_LABELS.NORMAL
    }
    case 'TWSA':
      if (v <= -50) return DROUGHT_LABELS.SEVERE
      if (v < -20) return DROUGHT_LABELS.MODERATE
      if (v < 0) return DROUGHT_LABELS.MILD
      return DROUGHT_LABELS.NORMAL
    case 'NDVI_ANOMALY':
    case 'NPP_ANOMALY':
      if (v <= -0.15) return DROUGHT_LABELS.SEVERE
      if (v < -0.08) return DROUGHT_LABELS.MODERATE
      if (v < 0) return DROUGHT_LABELS.MILD
      return DROUGHT_LABELS.NORMAL
    case 'LST_ANOMALY':
      if (v >= 3) return DROUGHT_LABELS.SEVERE
      if (v >= 1.5) return DROUGHT_LABELS.MODERATE
      if (v > 0.5) return DROUGHT_LABELS.MILD
      if (v >= -0.5) return DROUGHT_LABELS.NORMAL
      return DROUGHT_LABELS.WET
    case 'NDWI':
      if (v <= -0.35) return DROUGHT_LABELS.SEVERE
      if (v < -0.15) return DROUGHT_LABELS.MODERATE
      if (v < 0) return DROUGHT_LABELS.MILD
      return DROUGHT_LABELS.NORMAL
    case 'DRYSPELL':
      if (v >= 20) return DROUGHT_LABELS.SEVERE
      if (v >= 10) return DROUGHT_LABELS.MODERATE
      if (v >= 5) return DROUGHT_LABELS.MILD
      return DROUGHT_LABELS.NORMAL
    default: {
      const nv = clamp(v, 0, 100)
      if (nv < 30) return DROUGHT_LABELS.SEVERE
      if (nv < 50) return DROUGHT_LABELS.MODERATE
      return DROUGHT_LABELS.NORMAL
    }
  }
}
