import { describe, expect, it, vi } from 'vitest'
import { Cartesian3 } from 'cesium'
import Line from './Line'

function line(coords: [number, number][], id = 'l1'): Line {
  return new Line(id, coords.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat)))
}

describe('Line', () => {
  it('requires at least 2 vertices to be valid', () => {
    expect(line([[0, 0], [1, 1]]).validate()).toBe(true)
    const single = new Line('s', [Cartesian3.fromDegrees(0, 0)])
    expect(single.validate()).toBe(false)
  })

  it('has type polyline', () => {
    expect(line([[0, 0], [1, 1]]).type).toBe('polyline')
  })

  it('clones coordinates on construction', () => {
    const coords = [Cartesian3.fromDegrees(0, 0), Cartesian3.fromDegrees(1, 1)]
    const f = new Line('a', coords)
    expect(f.coords[0]).not.toBe(coords[0])
  })

  it('throws on out-of-range vertex access', () => {
    const f = line([[0, 0], [1, 1]])
    expect(() => f.getVertex(2)).toThrow(RangeError)
    expect(() => f.setVertex(-1, Cartesian3.fromDegrees(2, 2))).toThrow(RangeError)
  })

  it('setVertex updates the vertex and notifies mutation', () => {
    const f = line([[0, 0], [1, 1], [2, 2]])
    const onMutation = vi.fn()
    f._onMutation = onMutation
    f.setVertex(1, Cartesian3.fromDegrees(10, 10))
    expect(Cartesian3.equals(f.getVertex(1), Cartesian3.fromDegrees(10, 10))).toBe(true)
    expect(onMutation).toHaveBeenCalledTimes(1)
  })

  it('insertVertex splices a new vertex and notifies mutation', () => {
    const f = line([[0, 0], [2, 2]])
    const onMutation = vi.fn()
    f._onMutation = onMutation
    f.insertVertex(1, Cartesian3.fromDegrees(1, 1))
    expect(f.getVertexCount()).toBe(3)
    expect(Cartesian3.equals(f.getVertex(1), Cartesian3.fromDegrees(1, 1))).toBe(true)
    expect(onMutation).toHaveBeenCalledTimes(1)
  })

  it('removeVertex refuses to drop below 2 vertices', () => {
    const f = line([[0, 0], [1, 1]])
    f.removeVertex(0)
    expect(f.getVertexCount()).toBe(2)
  })

  it('removeVertex removes the vertex and notifies mutation', () => {
    const f = line([[0, 0], [1, 1], [2, 2]])
    const onMutation = vi.fn()
    f._onMutation = onMutation
    f.removeVertex(1)
    expect(f.getVertexCount()).toBe(2)
    expect(onMutation).toHaveBeenCalledTimes(1)
  })

  it('getMidpoints returns vertexCount - 1 midpoints', () => {
    const f = line([[0, 0], [2, 0], [4, 0]])
    const mids = f.getMidpoints()
    expect(mids).toHaveLength(2)
    expect(Cartesian3.distance(mids[0], f.coords[0])).toBeCloseTo(
      Cartesian3.distance(mids[0], f.coords[1]),
      10,
    )
    expect(Cartesian3.distance(mids[1], f.coords[1])).toBeCloseTo(
      Cartesian3.distance(mids[1], f.coords[2]),
      10,
    )
  })

  it('round-trips through toPlain / fromPlain', () => {
    const f = line([[0, 0], [10, 10], [20, 20]])
    const restored = Line.fromPlain(f.toPlain())
    expect(restored.id).toBe('l1')
    expect(restored.getVertexCount()).toBe(3)
    expect(Cartesian3.equals(restored.getVertex(2), f.getVertex(2))).toBe(true)
  })
})
