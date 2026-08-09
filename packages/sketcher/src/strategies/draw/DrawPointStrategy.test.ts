import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Cartesian2, Cartesian3 } from 'cesium'
import type { IDrawContext } from '../../controllers/DrawContext'
import DrawPointStrategy from './DrawPointStrategy'

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

function strategy(): DrawPointStrategy {
  return new DrawPointStrategy(context())
}

const pos = (x: number, y: number): Cartesian2 => new Cartesian2(x, y)

describe('DrawPointStrategy', () => {
  beforeEach(() => {
    pickMock.mockClear()
    queuePicks()
  })

  it('completes on a click (leftDown + leftUp at the same position)', () => {
    queuePicks(Cartesian3.fromDegrees(116, 39, 100))
    const s = strategy()
    s.leftDown(pos(0, 0))
    const sub = s.leftUp(pos(0, 0))
    expect(sub).toBe('ready')
    expect(s.canFinish()).toBe(true)
    expect(s.coords).toHaveLength(1)
  })

  it('ignores a drag (leftDown and leftUp at different positions)', () => {
    queuePicks()
    const s = strategy()
    s.leftDown(pos(0, 0))
    const sub = s.leftUp(pos(10, 10))
    expect(sub).toBe('ready')
    expect(s.canFinish()).toBe(false)
    expect(s.coords).toHaveLength(0)
  })

  it('stays unfinished when pickPosition returns nothing', () => {
    queuePicks(undefined)
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftUp(pos(0, 0))
    expect(s.canFinish()).toBe(false)
  })

  it('cancelLast resets the finished state', () => {
    queuePicks(Cartesian3.fromDegrees(0, 0))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftUp(pos(0, 0))
    expect(s.canFinish()).toBe(true)
    s.cancelLast()
    expect(s.canFinish()).toBe(false)
    expect(s.coords).toHaveLength(0)
  })

  it('reset clears all state', () => {
    queuePicks(Cartesian3.fromDegrees(0, 0))
    const s = strategy()
    s.leftDown(pos(0, 0))
    s.leftUp(pos(0, 0))
    s.reset()
    expect(s.coords).toHaveLength(0)
    expect(s.hasActiveDrag).toBe(false)
  })

  it('never has an active drag', () => {
    expect(strategy().hasActiveDrag).toBe(false)
  })
})
