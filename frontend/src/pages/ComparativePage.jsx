import { useRef } from 'react'
import ComparativeMapPanel from '../components/comparative/ComparativeMapPanel'

export default function ComparativePage() {
  const map0 = useRef(null)
  const map1 = useRef(null)
  const map2 = useRef(null)
  const map3 = useRef(null)
  const mapRefsArray = useRef(null)
  if (!mapRefsArray.current) {
    mapRefsArray.current = [map0, map1, map2, map3]
  }
  const isSyncingRef = useRef(false)

  return (
    <div className="relative flex flex-col h-full">
      <div className="grid grid-cols-2 grid-rows-2 gap-2 p-2 flex-1 min-h-0">
        <ComparativeMapPanel
          slotIndex={0}
          mapRefOut={map0}
          otherMapRefs={mapRefsArray}
          isSyncingRef={isSyncingRef}
        />
        <ComparativeMapPanel
          slotIndex={1}
          mapRefOut={map1}
          otherMapRefs={mapRefsArray}
          isSyncingRef={isSyncingRef}
        />
        <ComparativeMapPanel
          slotIndex={2}
          mapRefOut={map2}
          otherMapRefs={mapRefsArray}
          isSyncingRef={isSyncingRef}
        />
        <ComparativeMapPanel
          slotIndex={3}
          mapRefOut={map3}
          otherMapRefs={mapRefsArray}
          isSyncingRef={isSyncingRef}
        />
      </div>
    </div>
  )
}
