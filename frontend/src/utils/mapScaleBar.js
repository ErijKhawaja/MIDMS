/** Meters represented by one pixel at given latitude and zoom (Web Mercator). */
export function metersPerPixel(latDeg, zoom) {
  const lat = (latDeg * Math.PI) / 180
  return (156543.03392 * Math.cos(lat)) / 2 ** zoom
}

/**
 * @param {import('leaflet').Map | null} map
 * @param {number} targetBarWidthPx desired bar length on screen / capture (~px)
 * @returns {{ label: string, barWidthPx: number, meters: number }}
 */
export function computeScaleBar(map, targetBarWidthPx = 140) {
  if (!map) {
    return { label: '200 km', barWidthPx: targetBarWidthPx * 0.72, meters: 200_000 }
  }
  const c = map.getCenter()
  const z = map.getZoom()
  const mpp = metersPerPixel(c.lat, z)
  const maxMeters = mpp * targetBarWidthPx
  const nice = [500_000, 200_000, 100_000, 50_000, 20_000, 10_000, 5000, 2000, 1000, 500, 200, 100, 50]
  const meters = nice.find((n) => n <= maxMeters * 0.92) ?? 50
  const barWidthPx = meters / mpp
  const label = meters >= 1000 ? `${meters / 1000} km` : `${meters} m`
  return { label, barWidthPx: Math.min(barWidthPx, targetBarWidthPx), meters }
}
