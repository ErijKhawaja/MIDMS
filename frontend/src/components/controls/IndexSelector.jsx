import { useState } from 'react'
import useMapStore from '../../store/mapStore'
import { INDEX_INFO } from '../../constants/indexInfo'

const CATEGORIES = [
  {
    id: 'agricultural',
    label: 'Agricultural',
    color: '#22c55e',
    indices: [
      { id: 'VCI',        label: 'VCI',        full: 'Vegetation Condition Index' },
      { id: 'TCI',        label: 'TCI',        full: 'Temperature Condition Index' },
      { id: 'VHI',        label: 'VHI',        full: 'Vegetation Health Index' },
      { id: 'mTVDI',      label: 'mTVDI',      full: 'Modified Temp-Veg Dryness Index' },
      { id: 'SMI',        label: 'SMI',        full: 'Soil Moisture Index' },
      { id: 'SMCI_SMAP',  label: 'SMCI (SMAP)', full: 'Soil Moisture Condition Index' },
      { id: 'SMCI_FLDAS', label: 'SMCI (FLDAS)',full: 'Soil Moisture Condition Index' },
    ]
  },
  {
    id: 'meteorological',
    label: 'Meteorological',
    color: '#3B82F6',
    indices: [
      { id: 'SPI',      label: 'SPI',      full: 'Standardized Precipitation Index' },
      { id: 'SPEI',     label: 'SPEI',     full: 'Standardized P-ET Index' },
      { id: 'PDSI',     label: 'PDSI',     full: 'Palmer Drought Severity Index' },
      { id: 'RDI',      label: 'RDI',      full: 'Reconnaissance Drought Index' },
      { id: 'DRYSPELL', label: 'Dry Spell', full: 'Consecutive Dry Days' },
    ]
  },
  {
    id: 'hydrological',
    label: 'Hydrological',
    color: '#06b6d4',
    indices: [
      { id: 'TWSA', label: 'TWSA', full: 'Terrestrial Water Storage Anomaly (GRACE)' },
      { id: 'NDWI', label: 'NDWI', full: 'Normalized Difference Water Index' },
      { id: 'SWA',  label: 'SWA',  full: 'Surface Water Extent Anomaly' },
    ]
  },
  {
    id: 'impact',
    label: 'Impact',
    color: '#f97316',
    indices: [
      { id: 'NDVI_ANOMALY', label: 'NDVI Anomaly', full: 'NDVI Departure from Baseline' },
      { id: 'NPP_ANOMALY',  label: 'NPP Anomaly',  full: 'Net Primary Productivity Anomaly' },
      { id: 'LST_ANOMALY',  label: 'LST Anomaly',  full: 'Land Surface Temperature Anomaly' },
    ]
  },
]

function IndexInfoModal({ indexId, fullName, onClose }) {
  const info = indexId ? INDEX_INFO[indexId] : null
  if (!info) return null

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-5"
        style={{
          background: '#111827',
          border: '1px solid #1e3a5f',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="mb-4 pr-8"
          style={{
            fontFamily: '"DM Serif Display", serif',
            color: '#C8963E',
            fontSize: 18,
          }}
        >
          {fullName}
        </h3>
        <div
          className="rounded p-3 mb-3 font-mono text-xs"
          style={{
            background: '#0B1220',
            color: '#E8EDF5',
            border: '1px solid #1e3a5f',
          }}
        >
          {info.formula}
        </div>
        <p className="text-sm mb-3" style={{ color: '#E8EDF5', lineHeight: 1.5 }}>
          {info.description}
        </p>
        <p className="text-xs mb-1" style={{ color: '#6B7FA3' }}>
          <strong style={{ color: '#E8EDF5' }}>Data source:</strong> {info.source}
        </p>
        <p className="text-xs mb-4" style={{ color: '#6B7FA3' }}>
          <strong style={{ color: '#E8EDF5' }}>Reference:</strong> {info.reference}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded flex items-center justify-center transition-colors"
          style={{
            border: '1px solid #1e3a5f',
            color: '#6B7FA3',
            background: 'transparent',
            fontSize: 18,
            lineHeight: 1,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#1e3a5f'
            e.currentTarget.style.color = '#E8EDF5'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#6B7FA3'
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function IndexSelector() {
  const { selectedCategory, selectedIndex, setCategory, setIndex, timescale, setTimescale } = useMapStore()
  const [modalIndexId, setModalIndexId] = useState(null)

  const activeCat = CATEGORIES.find(c => c.id === selectedCategory)

  return (
    <div>
      <p className="label mb-3">Index</p>

      <div className="grid grid-cols-2 gap-1 mb-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setCategory(cat.id)
              setIndex(cat.indices[0].id)
            }}
            className="py-1.5 px-2 rounded text-left transition-all"
            style={{
              fontSize:   11,
              fontWeight: 500,
              color:      selectedCategory === cat.id ? '#0B1220' : '#6B7FA3',
              background: selectedCategory === cat.id ? cat.color : 'transparent',
              border:     `1px solid ${selectedCategory === cat.id ? cat.color : '#1e3a5f'}`,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {activeCat?.indices.map(idx => (
          <div
            key={idx.id}
            className="flex items-center gap-1"
          >
            <button
              onClick={() => setIndex(idx.id)}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded text-left transition-all"
              style={{
                background:  selectedIndex === idx.id ? 'rgba(200,150,62,0.1)' : 'transparent',
                border:      `1px solid ${selectedIndex === idx.id ? 'rgba(200,150,62,0.3)' : 'transparent'}`,
                color:       selectedIndex === idx.id ? '#C8963E' : '#E8EDF5',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500 }}>{idx.label}</span>
              <span className="text-muted truncate" style={{ fontSize: 10 }}>{idx.full}</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setModalIndexId(idx.id) }}
              className="shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
              style={{
                background: 'transparent',
                border: '1px solid #1e3a5f',
                color: '#6B7FA3',
                fontSize: 12,
              }}
              title="Index info"
            >
              ⓘ
            </button>
          </div>
        ))}
      </div>

      {(selectedIndex === 'SPI' || selectedIndex === 'SPEI') && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="label">Timescale</span>
            <span className="value-badge">{timescale} months</span>
          </div>
          <div className="flex gap-2">
            {[1, 3, 6, 12].map(t => (
              <button
                key={t}
                onClick={() => setTimescale(t)}
                className="flex-1 py-1 rounded text-center transition-all"
                style={{
                  fontSize:   11,
                  color:      timescale === t ? '#0B1220' : '#6B7FA3',
                  background: timescale === t ? '#C8963E' : 'transparent',
                  border:     `1px solid ${timescale === t ? '#C8963E' : '#1e3a5f'}`,
                }}
              >
                {t}mo
              </button>
            ))}
          </div>
        </div>
      )}

      {modalIndexId && (
        <IndexInfoModal
          indexId={modalIndexId}
          fullName={CATEGORIES.flatMap(c => c.indices).find(i => i.id === modalIndexId)?.full ?? modalIndexId}
          onClose={() => setModalIndexId(null)}
        />
      )}
    </div>
  )
}
