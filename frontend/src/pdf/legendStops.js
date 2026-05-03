import { LEGEND_CONFIG, DEFAULT_LEGEND } from '../constants/indicesAndLegends'

function extractGradientColors(gradientCss) {
  const hex = [...gradientCss.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].map((m) => `#${m[1]}`)
  if (hex.length >= 2) return hex
  const rgb = [...gradientCss.matchAll(/rgba?\([^)]+\)/g)].map((m) => m[0])
  if (rgb.length >= 2) return rgb
  return ['#64748b', '#f2a900']
}

/** @returns {{ min: number, max: number, stops: { offset: number, color: string }[] }} */
export function getPdfLegendStops(selectedIndex) {
  const cfg = LEGEND_CONFIG[selectedIndex] ?? DEFAULT_LEGEND
  const colors = extractGradientColors(cfg.gradient)
  const stops = colors.map((color, i) => ({
    offset: colors.length === 1 ? 0 : i / (colors.length - 1),
    color,
  }))
  return { min: cfg.min, max: cfg.max, stops }
}
