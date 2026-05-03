import useMapStore from '../../store/mapStore'
import { ALL_INDICES } from '../../constants/indicesAndLegends'

const SLOT_LABELS = [
  'Slot 1 (Top Left)',
  'Slot 2 (Top Right)',
  'Slot 3 (Bottom Left)',
  'Slot 4 (Bottom Right)',
]

export default function ComparativeSlotSelector() {
  const { compSlots, setCompSlot } = useMapStore()

  return (
    <div>
      <p className="label mb-3">Map slots</p>
      <div className="flex flex-col gap-3">
        {compSlots.map((slot, i) => (
          <div key={i}>
            <span
              className="block mb-1"
              style={{ fontSize: 11, color: '#6B7FA3' }}
            >
              {SLOT_LABELS[i]}
            </span>
            <select
              value={slot.index}
              onChange={(e) => setCompSlot(i, { index: e.target.value })}
              className="w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#C8963E]"
              style={{
                background: '#1a2535',
                border: '1px solid #1e3a5f',
                color: '#E8EDF5',
              }}
            >
              {ALL_INDICES.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
