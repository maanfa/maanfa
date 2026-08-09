import { describe, expect, it, vi } from 'vitest'
import { Cartesian3 } from 'cesium'
import Point from './Point'

describe('Point', () => {
  it('exposes the single coordinate and type', () => {
    const coord = Cartesian3.fromDegrees(116, 39, 100)
    const f = new Point('p1', coord)
    expect(f.type).toBe('marker')
    expect(f.id).toBe('p1')
    expect(Cartesian3.equals(f.coord, coord)).toBe(true)
    expect(f.coords).toHaveLength(1)
  })

  it('validates only when the coordinate is non-zero', () => {
    expect(new Point('a', new Cartesian3(0, 0, 0)).validate()).toBe(false)
    expect(new Point('b', Cartesian3.fromDegrees(1, 2, 3)).validate()).toBe(true)
  })

  it('clones the coordinate on construction', () => {
    const coord = Cartesian3.fromDegrees(1, 2, 3)
    const f = new Point('a', coord)
    expect(f.coord).not.toBe(coord)
    expect(Cartesian3.equals(f.coord, coord)).toBe(true)
  })

  it('throws on out-of-range vertex access', () => {
    const f = new Point('a', Cartesian3.fromDegrees(1, 2))
    expect(() => f.getVertex(1)).toThrow(RangeError)
    expect(() => f.setVertex(1, Cartesian3.fromDegrees(3, 4))).toThrow(RangeError)
  })

  it('setVertex updates the coordinate and notifies mutation', () => {
    const f = new Point('a', Cartesian3.fromDegrees(1, 2))
    const onMutation = vi.fn()
    f._onMutation = onMutation
    f.setVertex(0, Cartesian3.fromDegrees(5, 6))
    expect(Cartesian3.equals(f.coord, Cartesian3.fromDegrees(5, 6))).toBe(true)
    expect(onMutation).toHaveBeenCalledTimes(1)
    expect(onMutation).toHaveBeenCalledWith(f)
  })

  it('silently ignores insertVertex and removeVertex', () => {
    const f = new Point('a', Cartesian3.fromDegrees(1, 2))
    f.insertVertex(0, Cartesian3.fromDegrees(3, 4))
    f.removeVertex(0)
    expect(f.getVertexCount()).toBe(1)
  })

  it('round-trips through toPlain / fromPlain', () => {
    const f = new Point('a', Cartesian3.fromDegrees(116, 39, 100))
    const restored = Point.fromPlain(f.toPlain())
    expect(restored.id).toBe('a')
    expect(Cartesian3.equals(restored.coord, f.coord)).toBe(true)
  })

  it('getStyleFor resolves feedback layers with base fallback', () => {
    const f = new Point('a', Cartesian3.fromDegrees(0, 0))
    const base = { line: { color: '#ff0000', opacity: 1, width: 2 } }
    f.style = base
    expect(f.getStyleFor()).toBe(base)
    expect(f.getStyleFor('hover')).toBe(base)

    const hover = { line: { color: '#00ff00', opacity: 1, width: 2 } }
    f.hoverStyle = hover
    expect(f.getStyleFor('hover')).toBe(hover)
    expect(f.getStyleFor('selected')).toBe(base)
  })

  it('setStyles merges instance styles and notifies mutation', () => {
    const f = new Point('a', Cartesian3.fromDegrees(0, 0))
    const onMutation = vi.fn()
    f._onMutation = onMutation

    f.setStyles({ style: { line: { color: '#ff0000', opacity: 1, width: 2 } } })
    expect(f.style?.line?.color).toBe('#ff0000')
    expect(onMutation).toHaveBeenCalledTimes(1)

    f.setStyles({ hoverStyle: { line: { color: '#00ff00', opacity: 1, width: 2 } } })
    expect(f.hoverStyle?.line?.color).toBe('#00ff00')
    expect(f.style?.line?.color).toBe('#ff0000')
    expect(onMutation).toHaveBeenCalledTimes(2)
  })

  it('round-trips styles through toPlain / fromPlain', () => {
    const f = new Point('a', Cartesian3.fromDegrees(116, 39, 100))
    f.style = { symbol: { iconSize: 6, opacity: 1 } }
    f.selectedStyle = { line: { color: '#ff0000', opacity: 0.8, width: 3 } }

    const restored = Point.fromPlain(f.toPlain())
    expect(restored.style?.symbol?.iconSize).toBe(6)
    expect(restored.selectedStyle?.line?.color).toBe('#ff0000')
    expect(restored.selectedStyle?.line?.opacity).toBe(0.8)
  })
})
