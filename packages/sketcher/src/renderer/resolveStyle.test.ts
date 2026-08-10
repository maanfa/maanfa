import { describe, expect, it } from 'vitest'
import { Cartesian3 } from 'cesium'
import Point from '../element/Point'
import {
  resolveElementStyle,
  mergeElementStyle,
  hexToCesiumColor,
  clampOpacity,
  opacityToByte,
} from './resolveStyle'
import type { ElementStyle } from '../styles'

const marker = (): Point => new Point('p1', Cartesian3.fromDegrees(0, 0))

describe('resolveElementStyle', () => {
  it('returns the base style when no layer is given', () => {
    const el = marker()
    el.style = { line: { color: '#ff0000', opacity: 1, width: 2 } }
    expect(resolveElementStyle(el, undefined)).toBe(el.style)
  })

  it('prefers instance feedback style over base style', () => {
    const el = marker()
    el.style = { line: { color: '#ff0000', opacity: 1, width: 2 } }
    el.hoverStyle = { line: { color: '#00ff00', opacity: 1, width: 2 } }
    expect(resolveElementStyle(el, undefined, 'hover')).toBe(el.hoverStyle)
  })

  it('does not use global styles as a hover fallback', () => {
    const el = marker()
    el.style = { line: { color: '#ff0000', opacity: 1, width: 2 } }
    const global = { selectedStyle: { line: { color: '#0000ff', opacity: 1, width: 2 } } }
    expect(resolveElementStyle(el, global, 'hover')).toBe(el.style)
  })

  it('falls back to element base style when no feedback configured', () => {
    const el = marker()
    el.style = { line: { color: '#ff0000', opacity: 1, width: 2 } }
    expect(resolveElementStyle(el, undefined, 'selected')).toBe(el.style)
  })

  it('returns undefined when nothing is configured', () => {
    expect(resolveElementStyle(marker(), undefined, 'editing')).toBeUndefined()
  })

  it('resolves selected and editing layers independently', () => {
    const el = marker()
    el.selectedStyle = { line: { color: '#aaaaaa', opacity: 1, width: 3 } }
    el.editingStyle = { line: { color: '#bbbbbb', opacity: 1, width: 4 } }
    expect(resolveElementStyle(el, undefined, 'selected')).toBe(el.selectedStyle)
    expect(resolveElementStyle(el, undefined, 'editing')).toBe(el.editingStyle)
  })
})

describe('mergeElementStyle', () => {
  it('returns feedback alone when base is undefined', () => {
    const feedback: ElementStyle = { line: { color: '#ff0000', opacity: 1, width: 2 } }
    expect(mergeElementStyle(undefined, feedback)).toBe(feedback)
  })

  it('returns base alone when feedback is undefined', () => {
    const base: ElementStyle = { fill: { color: '#00ff00', opacity: 0.5 } }
    expect(mergeElementStyle(base, undefined)).toBe(base)
  })

  it('overlays feedback sub-styles on base, keeping non-overridden parts', () => {
    const base: ElementStyle = {
      line: { color: '#ff0000', opacity: 1, width: 2 },
      fill: { color: '#00ff00', opacity: 0.5 },
    }
    const feedback: ElementStyle = {
      line: { color: '#0000ff', opacity: 1, width: 3 },
    }
    const merged = mergeElementStyle(base, feedback)!
    expect(merged.line?.color).toBe('#0000ff')
    expect(merged.line?.width).toBe(3)
    expect(merged.fill).toBe(base.fill)
  })
})

describe('hexToCesiumColor', () => {
  it('converts a hex color to Cesium Color', () => {
    const c = hexToCesiumColor('#ff8c00')
    expect(c.red).toBeCloseTo(1)
    expect(c.green).toBeCloseTo(0.549, 2)
    expect(c.blue).toBeCloseTo(0)
    expect(c.alpha).toBeCloseTo(1)
  })

  it('applies opacity', () => {
    const c = hexToCesiumColor('#ff0000', 0.5)
    expect(c.alpha).toBeCloseTo(0.5)
  })

  it('falls back to white on invalid hex and warns', () => {
    const warns: string[] = []
    const c = hexToCesiumColor('not-a-color', 1, (m) => warns.push(m))
    expect(warns.length).toBe(1)
    expect(c.red).toBeCloseTo(1)
    expect(c.green).toBeCloseTo(1)
    expect(c.blue).toBeCloseTo(1)
  })
})

describe('clampOpacity / opacityToByte', () => {
  it('clamps opacity to 0..1', () => {
    expect(clampOpacity(-1)).toBe(0)
    expect(clampOpacity(2)).toBe(1)
    expect(clampOpacity(Number.NaN)).toBe(1)
    expect(clampOpacity(0.5)).toBe(0.5)
  })

  it('converts opacity to a byte (0..255)', () => {
    expect(opacityToByte(0)).toBe(0)
    expect(opacityToByte(1)).toBe(255)
    expect(opacityToByte(0.5)).toBe(128)
  })
})
