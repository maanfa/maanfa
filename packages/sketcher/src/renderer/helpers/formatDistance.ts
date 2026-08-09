/**
 * 距离文本格式化：< 1km → "x.x m"，否则 "x.xx km"。
 */
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`
  }
  return `${meters.toFixed(1)} m`
}

export { formatDistance }
