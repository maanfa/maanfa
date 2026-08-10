import { describe, expect, it, vi } from 'vitest'
import { Cartesian3 } from 'cesium'
import DrawVertexHelper from './DrawVertexHelper'
import surfaceMidpoint from '../utils/surfaceMidpoint'
import type DrawRenderChannel from '../renderer/draw/DrawRenderChannel'
import type { DistanceLabelInfo } from '../renderer/types'

const deg = (lon: number, lat: number): Cartesian3 => Cartesian3.fromDegrees(lon, lat)

function channel(): DrawRenderChannel {
  return {
    renderVertices: vi.fn(),
    renderLabels: vi.fn(),
    clearVertices: vi.fn(),
    clearLabels: vi.fn(),
  } as unknown as DrawRenderChannel
}

function labelsOf(ch: DrawRenderChannel): DistanceLabelInfo[] {
  return vi.mocked(ch.renderLabels).mock.calls.at(-1)?.[0] ?? []
}

describe('DrawVertexHelper', () => {
  it('renders placed edges plus active edge for polyline', () => {
    const ch = channel()
    const helper = new DrawVertexHelper(ch)
    const a = deg(0, 0)
    const b = deg(10, 0)
    const c = deg(10, 10)
    const cur = deg(20, 20)

    helper.sync([a, b, c], { type: 'polyline', cursor: cur })

    const labels = labelsOf(ch)
    expect(labels).toHaveLength(3)
    expect(Cartesian3.equals(labels[2]!.position, surfaceMidpoint(c, cur))).toBe(true)
  })

  it('includes the closing edge label for polygon without cursor', () => {
    const ch = channel()
    const helper = new DrawVertexHelper(ch)
    const a = deg(0, 0)
    const b = deg(10, 0)
    const c = deg(10, 10)

    helper.sync([a, b, c], { type: 'polygon' })

    const labels = labelsOf(ch)
    expect(labels).toHaveLength(3) // A-B, B-C, C-A
    expect(Cartesian3.equals(labels[2]!.position, surfaceMidpoint(c, a))).toBe(true)
  })

  it('replaces the closing edge with active + temporary closing labels while cursor is active', () => {
    const ch = channel()
    const helper = new DrawVertexHelper(ch)
    const a = deg(0, 0)
    const b = deg(10, 0)
    const c = deg(10, 10)
    const cur = deg(20, 20)

    helper.sync([a, b, c], { type: 'polygon', cursor: cur })

    const labels = labelsOf(ch)
    expect(labels).toHaveLength(4) // A-B, B-C, C-cur, cur-A
    expect(Cartesian3.equals(labels[2]!.position, surfaceMidpoint(c, cur))).toBe(true)
    expect(Cartesian3.equals(labels[3]!.position, surfaceMidpoint(cur, a))).toBe(true)
  })

  it('shows the temporary closing label from 2 placed vertices', () => {
    const ch = channel()
    const helper = new DrawVertexHelper(ch)
    const a = deg(0, 0)
    const b = deg(10, 0)
    const cur = deg(5, 10)

    helper.sync([a, b], { type: 'polygon', cursor: cur })

    const labels = labelsOf(ch)
    expect(labels).toHaveLength(3) // A-B, B-cur, cur-A
    expect(Cartesian3.equals(labels[2]!.position, surfaceMidpoint(cur, a))).toBe(true)
  })

  it('renders only placed edges for polygon below 3 vertices without cursor', () => {
    const ch = channel()
    const helper = new DrawVertexHelper(ch)
    const a = deg(0, 0)
    const b = deg(10, 0)

    helper.sync([a, b], { type: 'polygon' })

    expect(labelsOf(ch)).toHaveLength(1) // A-B only, no closing edge yet
  })

  it('clear resets vertices and labels', () => {
    const ch = channel()
    const helper = new DrawVertexHelper(ch)
    helper.sync([deg(0, 0), deg(10, 0)], { type: 'polyline' })

    helper.clear()

    expect(vi.mocked(ch.clearVertices)).toHaveBeenCalled()
    expect(vi.mocked(ch.clearLabels)).toHaveBeenCalled()
  })
})
