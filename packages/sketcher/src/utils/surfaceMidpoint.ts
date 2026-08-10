import { Cartographic, Cartesian3, Ellipsoid, EllipsoidGeodesic } from 'cesium'

const MIDPOINT_CACHE_LIMIT = 2048
const midpointCache = new Map<string, Cartesian3>()

/**
 * 计算两个 ECEF 点在椭球表面的中点。
 *
 * `Cartesian3.midpoint` 得到的是椭球弦线中点，通常位于地表内部；
 * 编辑手柄和距离标签需要锚定在地表曲线上，因此这里沿 WGS84 测地线插值。
 */
function surfaceMidpoint(a: Cartesian3, b: Cartesian3): Cartesian3 {
  const key = `${a.x},${a.y},${a.z}|${b.x},${b.y},${b.z}`
  const cached = midpointCache.get(key)
  if (cached) return Cartesian3.clone(cached)

  const ellipsoid = Ellipsoid.WGS84
  const start = Cartographic.fromCartesian(a)
  const end = Cartographic.fromCartesian(b)
  const geodesic = new EllipsoidGeodesic(start, end, ellipsoid)
  const midpoint = geodesic.interpolateUsingFraction(0.5)
  const result = Cartographic.toCartesian(midpoint, ellipsoid, new Cartesian3())
  if (midpointCache.size >= MIDPOINT_CACHE_LIMIT) {
    const oldest = midpointCache.keys().next().value
    if (oldest !== undefined) midpointCache.delete(oldest)
  }
  midpointCache.set(key, Cartesian3.clone(result))
  return result
}

export default surfaceMidpoint
