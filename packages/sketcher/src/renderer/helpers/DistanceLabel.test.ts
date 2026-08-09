import { describe, expect, it } from 'vitest'
import { Cartesian3 } from 'cesium'
import DistanceLabel from './DistanceLabel'
import { formatDistance } from './formatDistance'

describe('formatDistance', () => {
  it('formats meters and kilometers', () => {
    expect(formatDistance(12.34)).toBe('12.3 m')
    expect(formatDistance(999.95)).toBe('1000.0 m')
    expect(formatDistance(1234.5)).toBe('1.23 km')
  })
})

describe('DistanceLabel', () => {
  it('update computes midpoint and text, and stays non-interactive', () => {
    const label = new DistanceLabel(0, new Cartesian3(), '')
    const a = Cartesian3.fromDegrees(0, 0, 0)
    const b = Cartesian3.fromDegrees(1, 0, 0)
    label.update(a, b)

    expect(label.position.x).toBeCloseTo((a.x + b.x) / 2, 6)
    expect(label.text).toMatch(/ km$| m$/)
    expect(label.interactive).toBe(false)
    expect(label.hoverable).toBe(false)
    expect(label.toInfo().text).toBe(label.text)
  })
})
