import { describe, expect, it, vi } from 'vitest'
import { Cartesian3 } from 'cesium'
import Polygon from './Polygon'

function polygon(coords: [number, number][], id = 'p1'): Polygon {
  return new Polygon(id, coords.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat)))
}

describe('Polygon', () => {
  it('has type polygon and requires at least 3 vertices', () => {
    const f = polygon([[0, 0], [10, 0], [10, 10]])
    expect(f.type).toBe('polygon')
    expect(f.validate()).toBe(true)
    const two = polygon([[0, 0], [10, 0]])
    expect(two.validate()).toBe(false)
  })

  it('removeVertex refuses to drop below 3 vertices', () => {
    const f = polygon([[0, 0], [10, 0], [10, 10]])
    f.removeVertex(0)
    expect(f.getVertexCount()).toBe(3)
  })

  it('removeVertex removes the vertex and notifies mutation', () => {
    const f = polygon([[0, 0], [10, 0], [10, 10], [0, 10]])
    const onMutation = vi.fn()
    f._onMutation = onMutation
    f.removeVertex(2)
    expect(f.getVertexCount()).toBe(3)
    expect(onMutation).toHaveBeenCalledTimes(1)
  })

  it('getMidpoints includes the closing edge midpoint', () => {
    const f = polygon([[0, 0], [2, 0], [2, 2]])
    const mids = f.getMidpoints()
    expect(mids).toHaveLength(3)
    // mids[0] is the midpoint of edge (0,0)-(2,0)
    expect(Cartesian3.distance(mids[0], f.coords[0])).toBeCloseTo(
      Cartesian3.distance(mids[0], f.coords[1]),
      10,
    )
    // mids[2] is the midpoint of the closing edge (2,2)-(0,0)
    expect(Cartesian3.distance(mids[2], f.coords[2])).toBeCloseTo(
      Cartesian3.distance(mids[2], f.coords[0]),
      10,
    )
  })

  it('round-trips through toPlain / fromPlain', () => {
    const f = polygon([[0, 0], [10, 0], [10, 10], [0, 10]])
    const restored = Polygon.fromPlain(f.toPlain())
    expect(restored.id).toBe('p1')
    expect(restored.type).toBe('polygon')
    expect(restored.getVertexCount()).toBe(4)
  })
})
