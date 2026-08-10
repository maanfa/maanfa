import { describe, expect, it, vi } from 'vitest'
import { Cartesian2, Cartesian3, Cartographic, Math as CesiumMath } from 'cesium'
import EditVertexHelper from './EditVertexHelper'
import { Line, Polygon } from '../element'
import type EditRenderChannel from '../renderer/edit/EditRenderChannel'
import type { HandleInfo } from '../renderer/types'

function mockChannel(): EditRenderChannel {
  return {
    renderHandles: vi.fn(),
    clearHandles: vi.fn(),
    renderLabels: vi.fn(),
    clearLabels: vi.fn(),
    renderGuides: vi.fn(),
    clearGuides: vi.fn(),
  } as unknown as EditRenderChannel
}

/** 简化投影：经纬度（度）直接映射为屏幕像素坐标，便于命中测试。 */
function project(p: Cartesian3): Cartesian2 | undefined {
  const c = Cartographic.fromCartesian(p)
  return new Cartesian2(CesiumMath.toDegrees(c.longitude), CesiumMath.toDegrees(c.latitude))
}

function makeLine(): Line {
  return new Line('l1', [
    Cartesian3.fromDegrees(0, 0),
    Cartesian3.fromDegrees(10, 0),
    Cartesian3.fromDegrees(10, 10),
  ])
}

function lastHandles(channel: EditRenderChannel): HandleInfo[] {
  const mock = channel.renderHandles as ReturnType<typeof vi.fn>
  return mock.mock.calls.at(-1)?.[0] as HandleInfo[]
}

describe('EditVertexHelper', () => {
  it('builds vertex/midpoint handles and labels per geometry type', () => {
    const channel = mockChannel()
    const helper = new EditVertexHelper(channel, project)
    helper.bind(makeLine())

    const handles = lastHandles(channel)
    expect(handles.filter((h) => h.type === 'vertex')).toHaveLength(3)
    expect(handles.filter((h) => h.type === 'midpoint')).toHaveLength(2)
    expect(channel.renderLabels).toHaveBeenCalled()
  })

  it('includes the closing midpoint for polygons', () => {
    const channel = mockChannel()
    const helper = new EditVertexHelper(channel, project)
    const poly = new Polygon('p1', [
      Cartesian3.fromDegrees(0, 0),
      Cartesian3.fromDegrees(10, 0),
      Cartesian3.fromDegrees(10, 10),
    ])
    helper.bind(poly)

    const handles = lastHandles(channel)
    expect(handles.filter((h) => h.type === 'midpoint')).toHaveLength(3)
  })

  it('onLeftDown picks an interactive element and onMouseMove emits EditMotion', () => {
    const channel = mockChannel()
    const helper = new EditVertexHelper(channel, project)
    const line = makeLine()
    helper.bind(line)

    const screen = project(line.getVertex(0))!
    expect(helper.onLeftDown(screen)).toBe(true)
    expect(helper.picked?.id).toEqual({ kind: 'vertex', index: 0 })

    const to = Cartesian3.fromDegrees(5, 5)
    const motion = helper.onMouseMove(line, to)!
    expect(motion.kind).toBe('vertex')
    if (motion.kind === 'vertex') {
      expect(motion.handle.index).toBe(0)
      expect(Cartesian3.equals(motion.to, to)).toBe(true)
    }
  })

  it('onLeftDown returns false on miss', () => {
    const helper = new EditVertexHelper(mockChannel(), project)
    helper.bind(makeLine())
    expect(helper.onLeftDown(new Cartesian2(-999, -999))).toBe(false)
  })

  it('detach clears channels and state', () => {
    const channel = mockChannel()
    const helper = new EditVertexHelper(channel, project)
    helper.bind(makeLine())
    helper.detach()

    expect(channel.clearHandles).toHaveBeenCalled()
    expect(channel.clearLabels).toHaveBeenCalled()
    expect(helper.picked).toBeNull()
  })

  it('reuses resolved visual positions across repeated syncs', () => {
    const resolvePosition = vi.fn((position: Cartesian3) => position)
    const channel = mockChannel()
    const helper = new EditVertexHelper(channel, project, resolvePosition)
    const line = makeLine()

    helper.bind(line)
    const callsAfterBind = resolvePosition.mock.calls.length
    helper.sync(line)

    expect(callsAfterBind).toBeGreaterThan(0)
    expect(resolvePosition).toHaveBeenCalledTimes(callsAfterBind)
  })
})
