import { describe, expect, it } from 'vitest'
import { Cartesian3 } from 'cesium'
import {
  segmentsIntersect2D,
  checkSelfIntersection,
  checkEditSelfIntersection,
} from './intersection'
import { Line, Polygon } from '../element'

/** 将经纬度转为 ECEF Cartesian3，用于构造测试几何。 */
function deg(lon: number, lat: number): Cartesian3 {
  return Cartesian3.fromDegrees(lon, lat)
}

describe('segmentsIntersect2D', () => {
  it('returns true for two crossing segments', () => {
    expect(segmentsIntersect2D([0, 0], [10, 10], [0, 10], [10, 0])).toBe(true)
  })

  it('returns false for disjoint segments', () => {
    expect(segmentsIntersect2D([0, 0], [1, 1], [0, 2], [1, 3])).toBe(false)
  })

  it('returns false for parallel non-overlapping segments', () => {
    expect(segmentsIntersect2D([0, 0], [1, 0], [0, 1], [1, 1])).toBe(false)
  })

  it('returns true for collinear overlapping segments', () => {
    expect(segmentsIntersect2D([0, 0], [10, 0], [5, 0], [15, 0])).toBe(true)
  })
})

describe('checkSelfIntersection — polyline', () => {
  it('returns false when fewer than 3 points exist (no segment to check)', () => {
    const coords = [deg(0, 0), deg(10, 0)]
    expect(checkSelfIntersection(coords, deg(5, 5), 'polyline')).toBe(false)
  })

  it('returns true when the new segment crosses an existing one', () => {
    const coords = [deg(0, 0), deg(10, 0), deg(5, 10)]
    expect(checkSelfIntersection(coords, deg(5, -10), 'polyline')).toBe(true)
  })

  it('returns false when the new segment does not cross', () => {
    const coords = [deg(0, 0), deg(10, 0), deg(5, 10)]
    expect(checkSelfIntersection(coords, deg(8, 10), 'polyline')).toBe(false)
  })
})

describe('checkSelfIntersection — polygon', () => {
  it('returns true when the new segment crosses an existing one', () => {
    const coords = [deg(0, 0), deg(10, 0), deg(5, 10)]
    expect(checkSelfIntersection(coords, deg(5, -10), 'polygon')).toBe(true)
  })

  it('returns true when the closing edge crosses an existing segment', () => {
    const coords = [deg(0, 0), deg(10, 0), deg(4, 8), deg(12, 10)]
    expect(checkSelfIntersection(coords, deg(12, 4), 'polygon')).toBe(true)
  })

  it('returns false for a concave but non-self-intersecting polygon', () => {
    const coords = [deg(0, 0), deg(10, 0), deg(10, 10), deg(0, 10)]
    expect(checkSelfIntersection(coords, deg(-5, 5), 'polygon')).toBe(false)
  })
})

describe('checkEditSelfIntersection', () => {
  it('detects a polyline vertex drag that crosses another segment', () => {
    const element = new Line('l', [deg(0, 0), deg(10, 0), deg(10, 10), deg(0, 10)])
    expect(checkEditSelfIntersection(element, 1, deg(5, 10))).toBe(true)
  })

  it('allows a polyline vertex drag that stays valid', () => {
    const element = new Line('l', [deg(0, 0), deg(10, 0), deg(10, 10), deg(0, 10)])
    expect(checkEditSelfIntersection(element, 1, deg(5, 0))).toBe(false)
  })

  it('detects a polygon vertex drag overlapping an edge', () => {
    const element = new Polygon('p', [deg(0, 0), deg(10, 0), deg(10, 10), deg(0, 10)])
    expect(checkEditSelfIntersection(element, 1, deg(0, 5))).toBe(true)
  })

  it('allows a polygon vertex drag that stays valid', () => {
    const element = new Polygon('p', [deg(0, 0), deg(10, 0), deg(10, 10), deg(0, 10)])
    expect(checkEditSelfIntersection(element, 1, deg(5, 0))).toBe(false)
  })
})
