import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Cartesian2, Cartesian3 } from 'cesium'
import type { IDrawContext } from '../../controllers/DrawContext'
import DrawPolygonStrategy from './DrawPolygonStrategy'
import Polygon from '../../element/Polygon'

const { pickMock, queuePicks } = vi.hoisted(() => {
  const queue: unknown[] = []
  return {
    pickMock: vi.fn<(pos: Cartesian2) => Cartesian3 | undefined>(() => queue.shift() as Cartesian3 | undefined),
    queuePicks: (...coords: unknown[]) => {
      queue.length = 0
      queue.push(...coords)
    },
  }
})

const pos = (x: number, y: number): Cartesian2 => new Cartesian2(x, y)
const deg = (lon: number, lat: number): Cartesian3 => Cartesian3.fromDegrees(lon, lat)

function context(): IDrawContext {
  return {
    elementRenderer: {} as IDrawContext['elementRenderer'],
    vertexHelpers: { sync: vi.fn(), clear: vi.fn() } as unknown as IDrawContext['vertexHelpers'],
    pick: pickMock,
    renderPreview: vi.fn(),
    clearPreview: vi.fn(),
    renderDraftElement: vi.fn(),
    clearDraftElement: vi.fn(),
    clearDraft: vi.fn(),
  }
}

function strategy(): DrawPolygonStrategy {
  return new DrawPolygonStrategy(context())
}

function strategyWith(ctx: IDrawContext): DrawPolygonStrategy {
  return new DrawPolygonStrategy(ctx)
}

describe('DrawPolygonStrategy', () => {
  beforeEach(() => {
    pickMock.mockClear()
    queuePicks()
  })

  it('cannot finish before reaching 3 vertices', () => {
    queuePicks(deg(0, 0), deg(10, 0))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    expect(s.rightUp(pos(1, 0))).toBe('ready')
    expect(s.canFinish()).toBe(false)
  })

  it('finishes on rightUp with at least 3 vertices', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(10, 10))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))
    expect(s.rightUp(pos(2, 0))).toBe('ready')
    expect(s.canFinish()).toBe(true)
  })

  it('finishes on double click with at least 3 vertices', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(10, 10))
    const s = new DrawPolygonStrategy(context(), 'double-click')
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))
    expect(s.dblClick(pos(2, 0))).toBe('ready')
    expect(s.canFinish()).toBe(true)
  })

  it('rejects a point that causes self-intersection', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(5, 10), deg(5, -10))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))
    const sub = s.leftDown(pos(3, 0))
    expect(sub).toBe('drawing')
    expect(s.coords).toHaveLength(3)
  })

  it('cancelLast removes the last vertex', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(10, 10))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))
    s.cancelLast()
    expect(s.coords).toHaveLength(2)
  })

  it('reset clears all state', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(10, 10))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))
    s.reset()
    expect(s.coords).toHaveLength(0)
    expect(s.hasActiveDrag).toBe(false)
  })

  it('renders a live draft polygon including cursor after 3 vertices', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(10, 10), deg(20, 20))
    const ctx = context()
    const s = strategyWith(ctx)
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))
    s.mouseMove(pos(0, 0), pos(3, 0))

    const draft = vi.mocked(ctx.renderDraftElement).mock.calls.at(-1)?.[0]
    expect(draft).toBeInstanceOf(Polygon)
    expect(draft?.getVertexCount()).toBe(4)
    expect(Cartesian3.equals(draft!.getVertex(3), deg(20, 20))).toBe(true)
    // 草稿已覆盖游标：预览通道不再重复画活动边/临时闭合
    expect(ctx.clearPreview).toHaveBeenCalled()
    expect(ctx.renderPreview).not.toHaveBeenCalled()
  })

  it('recreates the draft element on every mouseMove (destroy & rebuild)', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(10, 10), deg(20, 20), deg(30, 30))
    const ctx = context()
    const s = strategyWith(ctx)
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))

    const renderDraftElement = vi.mocked(ctx.renderDraftElement)
    renderDraftElement.mockClear()
    s.mouseMove(pos(0, 0), pos(3, 0))
    s.mouseMove(pos(0, 0), pos(4, 0))

    expect(renderDraftElement).toHaveBeenCalledTimes(2)
    const first = renderDraftElement.mock.calls[0]![0] as Polygon
    const second = renderDraftElement.mock.calls[1]![0] as Polygon
    expect(first).not.toBe(second)
    expect(first.getVertexCount()).toBe(4)
    expect(second.getVertexCount()).toBe(4)
    expect(Cartesian3.equals(second.getVertex(3), deg(30, 30))).toBe(true)
  })

  it('renders draft without cursor after leftDown', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(10, 10))
    const ctx = context()
    const s = strategyWith(ctx)
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))

    const draft = vi.mocked(ctx.renderDraftElement).mock.calls.at(-1)?.[0]
    expect(draft?.getVertexCount()).toBe(3)
  })

  it('keeps preview only before 3 vertices', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(20, 20))
    const ctx = context()
    const s = strategyWith(ctx)
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.mouseMove(pos(0, 0), pos(2, 0))

    expect(ctx.renderPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'polygon',
        coords: [deg(10, 0), deg(20, 20), deg(0, 0)],
      }),
    )
    expect(vi.mocked(ctx.renderDraftElement)).not.toHaveBeenCalled()
    expect(vi.mocked(ctx.vertexHelpers.sync)).toHaveBeenLastCalledWith(
      [deg(0, 0), deg(10, 0)],
      { type: 'polygon', cursor: deg(20, 20) },
    )
  })

  it('passes polygon type with cursor to vertex helpers', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(10, 10), deg(20, 20))
    const ctx = context()
    const s = strategyWith(ctx)
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))
    s.mouseMove(pos(0, 0), pos(3, 0))

    expect(vi.mocked(ctx.vertexHelpers.sync)).toHaveBeenLastCalledWith(
      [deg(0, 0), deg(10, 0), deg(10, 10)],
      { type: 'polygon', cursor: deg(20, 20) },
    )
  })

  it('refreshes visuals on rightUp without finishing', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(20, 20))
    const ctx = context()
    const s = strategyWith(ctx)
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.mouseMove(pos(0, 0), pos(2, 0))
    vi.mocked(ctx.renderPreview).mockClear()

    s.rightUp(pos(2, 0))
    // 未达 3 点：预览被清掉，不再残留游标橡皮筋
    expect(ctx.clearPreview).toHaveBeenCalled()
    expect(vi.mocked(ctx.renderDraftElement)).not.toHaveBeenCalled()
  })
})
