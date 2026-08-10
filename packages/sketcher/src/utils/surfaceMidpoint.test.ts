import { describe, expect, it } from 'vitest'
import { Cartographic, Cartesian3 } from 'cesium'
import surfaceMidpoint from './surfaceMidpoint'

describe('surfaceMidpoint', () => {
  it('keeps the midpoint on the ellipsoid surface instead of inside the chord', () => {
    const a = Cartesian3.fromDegrees(0, 0)
    const b = Cartesian3.fromDegrees(10, 0)
    const midpoint = Cartographic.fromCartesian(surfaceMidpoint(a, b))

    expect(midpoint.height).toBeCloseTo(0, 6)
    expect(midpoint.longitude).toBeCloseTo(Cartographic.fromCartesian(Cartesian3.fromDegrees(5, 0)).longitude, 6)
  })
})
