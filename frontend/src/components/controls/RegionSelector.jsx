import { useState } from 'react'
import useMapStore from '../../store/mapStore'

const PROVINCES = [
  { value: 'PAKISTAN',          label: 'All Pakistan' },
  { value: 'PUNJAB',            label: 'Punjab' },
  { value: 'SINDH',             label: 'Sindh' },
  { value: 'BALOCHISTAN',       label: 'Balochistan' },
  { value: 'KHYBER_PAKHTUNKHWA',label: 'Khyber Pakhtunkhwa' },
  { value: 'GILGIT_BALTISTAN',  label: 'Gilgit-Baltistan' },
  { value: 'AZAD_KASHMIR',      label: 'Azad Kashmir' },
  { value: 'ICT',               label: 'ICT' },
  { value: 'FATA',              label: 'FATA' },
]

const DISTRICTS_PLACEHOLDER = [
  'Select District',
  'District 1',
  'District 2',
  'District 3',
]

const TEHSILS_PLACEHOLDER = [
  'Select Tehsil',
  'Tehsil 1',
  'Tehsil 2',
  'Tehsil 3',
]

export default function RegionSelector() {
  const { selectedRegion, selectedDistrict, setRegion, setDistrict } = useMapStore()
  const [mode, setMode] = useState('interactive') // interactive | polygon

  const handleProvinceChange = (event) => {
    const newRegion = event.target.value
    setRegion(newRegion)
  }

  const handleDistrictChange = (event) => {
    const value = event.target.value
    if (!value || value === 'Select District') {
      setDistrict(null)
    } else {
      setDistrict(value)
    }
  }

  const handleTehsilChange = (event) => {
    const value = event.target.value
    if (!value || value === 'Select Tehsil') {
      setTehsil(null)
    } else {
      setTehsil(value)
    }
  }

  const showDistrictDropdown =
    mode === 'interactive' && selectedRegion && selectedRegion !== 'PAKISTAN'
  const hasDistrictSelected =
    showDistrictDropdown && selectedDistrict && selectedDistrict !== 'Select District'
  const showTehsilDropdown = mode === 'interactive' && hasDistrictSelected

  return (
    <div>
      <p className="label mb-3">Region</p>

      {/* Mode toggle */}
      <div className="flex gap-4 mb-3">
        <label
          className="flex items-center gap-2 cursor-pointer"
          style={{
            fontSize: 12,
            color: mode === 'interactive' ? '#C8963E' : '#6B7FA3',
          }}
        >
          <input
            type="radio"
            name="region-mode"
            checked={mode === 'interactive'}
            onChange={() => setMode('interactive')}
            className="accent-[#C8963E]"
          />
          <span>Interactive</span>
        </label>

        <label
          className="flex items-center gap-2 cursor-pointer"
          style={{
            fontSize: 12,
            color: mode === 'polygon' ? '#C8963E' : '#6B7FA3',
          }}
        >
          <input
            type="radio"
            name="region-mode"
            checked={mode === 'polygon'}
            onChange={() => setMode('polygon')}
            className="accent-[#C8963E]"
          />
          <span>Draw Polygon</span>
        </label>
      </div>

      {mode === 'polygon' && (
        <p className="text-xs" style={{ color: '#6B7FA3' }}>
          Polygon drawing coming soon
        </p>
      )}

      {mode === 'interactive' && (
        <div className="flex flex-col gap-3">
          {/* Province dropdown */}
          <div>
            <span
              className="block mb-1"
              style={{ fontSize: 11, color: '#6B7FA3' }}
            >
              Province
            </span>
            <select
              value={selectedRegion || 'PAKISTAN'}
              onChange={handleProvinceChange}
              className="w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#C8963E]"
              style={{
                background: '#1a2535',
                border: '1px solid #1e3a5f',
                color: '#E8EDF5',
              }}
            >
              {PROVINCES.map((prov) => (
                <option key={prov.value} value={prov.value}>
                  {prov.label}
                </option>
              ))}
            </select>
          </div>

          {/* District dropdown */}
          {showDistrictDropdown && (
            <div>
              <span
                className="block mb-1"
                style={{ fontSize: 11, color: '#6B7FA3' }}
              >
                District
              </span>
              <select
                value={selectedDistrict || 'Select District'}
                onChange={handleDistrictChange}
                className="w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#C8963E]"
                style={{
                  background: '#1a2535',
                  border: '1px solid #1e3a5f',
                  color: '#E8EDF5',
                }}
              >
                {DISTRICTS_PLACEHOLDER.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tehsil dropdown */}
          {showTehsilDropdown && (
            <div>
              <span
                className="block mb-1"
                style={{ fontSize: 11, color: '#6B7FA3' }}
              >
                Tehsil
              </span>
              <select
                value={selectedTehsil || 'Select Tehsil'}
                onChange={handleTehsilChange}
                className="w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#C8963E]"
                style={{
                  background: '#1a2535',
                  border: '1px solid #1e3a5f',
                  color: '#E8EDF5',
                }}
              >
                {TEHSILS_PLACEHOLDER.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
