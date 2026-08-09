import { describe, expect, it, vi } from 'vitest'
import { Cartesian3 } from 'cesium'
import ElementStore from './ElementStore'
import { Line, Point } from '../element'

describe('ElementStore', () => {
  it('tracks count incrementally (add / remove / clear)', () => {
    const store = new ElementStore()
    expect(store.count()).toBe(0)

    store.add(new Point('p1', Cartesian3.fromDegrees(0, 0)))
    expect(store.count()).toBe(1)

    // 重复添加同一 id 不重复计数
    store.add(new Point('p1', Cartesian3.fromDegrees(1, 1)))
    expect(store.count()).toBe(1)

    expect(store.remove('p1')).toBe(true)
    expect(store.count()).toBe(0)
    expect(store.remove('p1')).toBe(false)

    store.add(new Point('p2', Cartesian3.fromDegrees(2, 2)))
    store.clear()
    expect(store.count()).toBe(0)
  })

  it('findById aliases get', () => {
    const store = new ElementStore()
    const p = new Point('p1', Cartesian3.fromDegrees(0, 0))
    store.add(p)
    expect(store.findById('p1')).toBe(p)
    expect(store.findById('missing')).toBeUndefined()
  })

  it('computes geographic bounds and returns null when empty', () => {
    const store = new ElementStore()
    expect(store.bounds()).toBeNull()

    store.add(new Point('a', Cartesian3.fromDegrees(10, 20, 100)))
    store.add(new Point('b', Cartesian3.fromDegrees(30, -5, 50)))

    const b = store.bounds()!
    expect(b.west).toBeCloseTo(10, 6)
    expect(b.south).toBeCloseTo(-5, 6)
    expect(b.east).toBeCloseTo(30, 6)
    expect(b.north).toBeCloseTo(20, 6)
    expect(b.minHeight).toBeCloseTo(50, 6)
    expect(b.maxHeight).toBeCloseTo(100, 6)
  })

  it('invalidates bounds on remove and on vertex mutation', () => {
    const store = new ElementStore()
    const line = new Line('l1', [
      Cartesian3.fromDegrees(0, 0, 0),
      Cartesian3.fromDegrees(10, 10, 0),
    ])
    store.add(line)

    // 突变 → 缓存失效重算
    line.setVertex(1, Cartesian3.fromDegrees(100, 80, 500))
    const afterMove = store.bounds()!
    expect(afterMove.east).toBeCloseTo(100, 6)
    expect(afterMove.north).toBeCloseTo(80, 6)
    expect(afterMove.maxHeight).toBeCloseTo(500, 6)

    // 删除 → 空仓
    store.remove('l1')
    expect(store.bounds()).toBeNull()
  })

  it('notifies mutation through onMutation', () => {
    const store = new ElementStore()
    const onMutation = vi.fn()
    store.onMutation = onMutation

    const line = new Line('l1', [
      Cartesian3.fromDegrees(0, 0),
      Cartesian3.fromDegrees(10, 10),
    ])
    store.add(line)
    line.setVertex(0, Cartesian3.fromDegrees(20, 20))

    expect(onMutation).toHaveBeenCalledTimes(1)
    expect(onMutation.mock.calls[0][0]).toBe(line)
  })
})
