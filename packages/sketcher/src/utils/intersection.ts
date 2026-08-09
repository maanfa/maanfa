import { Cartesian3, Cartographic } from 'cesium'
import type { Element } from '../element'

const EPSILON6 = 1.0e-6

/**
 * 将 ECEF 坐标数组转为经纬度（弧度）平面坐标对，供二维相交判定使用。
 */
function toLonLatPairs(coords: Cartesian3[]): [number, number][] {
  return coords.map((c) => {
    const cart = Cartographic.fromCartesian(c)
    return [cart.longitude, cart.latitude] as [number, number]
  })
}

/**
 * 二维线段相交判定（叉积方向法），含端点重合判断。
 * 返回 `true` 表示两条线段在端点之间有严格相交点（不含端点重合）。
 */
function segmentsIntersect2D(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
): boolean {
  const cross = (o: [number, number], p: [number, number], q: [number, number]): number => {
    return (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
  }

  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }

  if (Math.abs(d1) < EPSILON6 && onSegment(c, d, a)) return true
  if (Math.abs(d2) < EPSILON6 && onSegment(c, d, b)) return true
  if (Math.abs(d3) < EPSILON6 && onSegment(a, b, c)) return true
  if (Math.abs(d4) < EPSILON6 && onSegment(a, b, d)) return true

  return false
}

function onSegment(p: [number, number], q: [number, number], r: [number, number]): boolean {
  return (
    Math.min(p[0], q[0]) <= r[0] &&
    r[0] <= Math.max(p[0], q[0]) &&
    Math.min(p[1], q[1]) <= r[1] &&
    r[1] <= Math.max(p[1], q[1])
  )
}

/**
 * 检测新增顶点 `newCoord` 加入坐标数组 `coords` 后是否产生自交叉。
 *
 * - 对于 `'polyline'` 类型：仅检测新线段 `(coords[last], newCoord)` 与既有各段是否相交。
 * - 对于 `'polygon'` 类型：额外检测最终闭合边 `(newCoord, coords[0])` 与既有各段是否相交。
 *
 * @param coords - 已有顶点数组
 * @param newCoord - 待加入的新顶点
 * @param type - 元素类型
 * @returns 存在自交叉时返回 `true`
 */
function checkSelfIntersection(
  coords: Cartesian3[],
  newCoord: Cartesian3,
  type: 'polyline' | 'polygon',
): boolean {
  if (coords.length < 2) return false

  const pairs = toLonLatPairs([...coords, newCoord])
  const newIdx = pairs.length - 1
  const lastIdx = newIdx - 1

  /**
   * 新线段 (lastIdx, newIdx) 与既有线段 (i, i+1) 的相交检测。
   * 排除共顶点相邻线段。
   */
  for (let i = 0; i < lastIdx - 1; i++) {
    if (i === lastIdx) continue
    if (segmentsIntersect2D(pairs[lastIdx], pairs[newIdx], pairs[i], pairs[i + 1])) {
      return true
    }
  }

  /**
   * 面要素额外检测闭合边 (newIdx, 0) 是否与既有线段相交
   */
  if (type === 'polygon' && coords.length >= 3) {
    for (let i = 1; i < lastIdx - 1; i++) {
      if (segmentsIntersect2D(pairs[newIdx], pairs[0], pairs[i], pairs[i + 1])) {
        return true
      }
    }
  }

  return false
}

/**
 * 校验一次顶点更新（编辑拖拽）是否会导致自交叉。
 *
 * @param element - 被编辑的元素
 * @param index - 被修改的顶点索引
 * @param newCoord - 拖拽后的新坐标
 * @returns 存在自交叉时返回 `true`
 */
function checkEditSelfIntersection(element: Element, index: number, newCoord: Cartesian3): boolean {
  const coords = element.coords
  if (coords.length < 3) return false

  const testCoords = coords.map((c, i) => (i === index ? newCoord : c))
  const pairs = toLonLatPairs(testCoords)

  const { type } = element

  /** 检查第 `index` 位被修改时相邻的两条线段 (index-1, index) 和 (index, index+1) */
  const segmentsToCheck: [number, number][] = []
  const prev = (index - 1 + coords.length) % coords.length
  const next = (index + 1) % coords.length

  if (type === 'polyline') {
    if (index > 0) segmentsToCheck.push([prev, index])
    if (index < coords.length - 1) segmentsToCheck.push([index, next])
  } else if (type === 'polygon') {
    segmentsToCheck.push([prev, index], [index, next])
  }

  for (const [s1, s2] of segmentsToCheck) {
    for (let i = 0; i < pairs.length; i++) {
      if (type === 'polyline' && i === coords.length - 1) break
      const j = (i + 1) % pairs.length
      // 跳过与被检测线段相邻的线段（共享顶点）
      if (i === s1 || i === s2 || j === s1 || j === s2) continue
      if (segmentsIntersect2D(pairs[s1], pairs[s2], pairs[i], pairs[j])) {
        return true
      }
    }
  }

  return false
}

export { toLonLatPairs, segmentsIntersect2D, checkSelfIntersection, checkEditSelfIntersection }
