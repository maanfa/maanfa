import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Cartesian2, Cartesian3 } from 'cesium'
import type { IDrawContext } from '../../controllers/DrawContext'
import DrawLineStrategy from './DrawLineStrategy'

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

function strategy(endingAction: 'right-up' | 'double-click' = 'right-up'): DrawLineStrategy {
  return new DrawLineStrategy(context(), endingAction)
}

describe('DrawLineStrategy — right-up ending', () => {
  beforeEach(() => {
    pickMock.mockClear()
    queuePicks()
  })

  it('accumulates vertices on leftDown and transitions to drawing', () => {
    queuePicks(deg(0, 0), deg(10, 0))
    const s = strategy()
    expect(s.leftDown(pos(0, 0))).toBe('drawing')
    expect(s.leftDown(pos(1, 0))).toBe('drawing')
    expect(s.coords).toHaveLength(2)
  })

  it('cannot finish before the minimum vertex count', () => {
    queuePicks(deg(0, 0))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.rightUp(pos(0, 0))
    expect(s.coords).toHaveLength(1)
    expect(s.canFinish()).toBe(false)
  })

  it('finishes on rightUp with at least 2 vertices', () => {
    queuePicks(deg(0, 0), deg(10, 0))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    expect(s.rightUp(pos(1, 0))).toBe('ready')
    expect(s.canFinish()).toBe(true)
  })

  it('does not finish on double click when endingAction is right-up', () => {
    queuePicks(deg(0, 0), deg(10, 0))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    expect(s.dblClick(pos(1, 0))).toBe('drawing')
    expect(s.canFinish()).toBe(false)
  })

  it('includes a preview vertex during mouseMove', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(5, 5))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.mouseMove(pos(0, 0), pos(2, 0))
    expect(s.coords).toHaveLength(3)
    expect(s.hasActiveDrag).toBe(true)
    expect(Cartesian3.equals(s.coords[2], deg(5, 5))).toBe(true)
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

  it('cancelLast removes the last committed vertex', () => {
    queuePicks(deg(0, 0), deg(10, 0), deg(10, 10))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.leftDown(pos(2, 0))
    s.cancelLast()
    expect(s.coords).toHaveLength(2)
  })

  it('reset clears vertices and returns to ready', () => {
    queuePicks(deg(0, 0), deg(10, 0))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    s.reset()
    expect(s.coords).toHaveLength(0)
    expect(s.hasActiveDrag).toBe(false)
  })
})

describe('DrawLineStrategy — double-click ending', () => {
  beforeEach(() => {
    pickMock.mockClear()
    queuePicks()
  })

  it('finishes on double click', () => {
    queuePicks(deg(0, 0), deg(10, 0))
    const s = strategy('double-click')
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    expect(s.dblClick(pos(1, 0))).toBe('ready')
    expect(s.canFinish()).toBe(true)
  })

  it('does not finish on rightUp when endingAction is double-click', () => {
    queuePicks(deg(0, 0), deg(10, 0))
    const s = strategy('double-click')
    s.leftDown(pos(0, 0))
    s.leftDown(pos(1, 0))
    expect(s.rightUp(pos(1, 0))).toBe('drawing')
    expect(s.canFinish()).toBe(false)
  })
})
