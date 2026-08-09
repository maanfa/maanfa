import { describe, expect, it, vi } from 'vitest'
import { Cartesian3 } from 'cesium'
import Point from '../../element/Point'
import Line from '../../element/Line'
import ElementRendererHub from './ElementRendererHub'
import type { IElementRenderer, ElementRendererContext } from '../elements/ElementRenderer'
import type PrimitiveContainer from './PrimitiveContainer'
import type { RenderedItem } from './PrimitiveContainer'

const ctx: ElementRendererContext = {
  useAsyncGeometry: () => true,
  warn: () => {},
}

function mockContainer(): PrimitiveContainer {
  const items = new Map<
    string,
    { ground: RenderedItem[]; points: RenderedItem[] }
  >()
  return {
    set: (k: string, v: RenderedItem[]) =>
      items.set(k, {
        ground: v.filter((i) => i.host === 'ground'),
        points: v.filter((i) => i.host === 'point'),
      }),
    get: (k: string) => items.get(k) ?? { ground: [], points: [] },
    has: (k: string) => items.has(k),
    remove: (k: string) => void items.delete(k),
    clear: () => items.clear(),
  } as unknown as PrimitiveContainer
}

describe('ElementRendererHub', () => {
  it('dispatches to the renderer registered for the element type', () => {
    const container = mockContainer()
    const hub = new ElementRendererHub(ctx, container)
    const marker = new Point('p1', Cartesian3.fromDegrees(0, 0))
    hub.render(marker)
    expect(container.has('p1')).toBe(true)
    expect(container.get('p1').points.length).toBe(1)
  })

  it('overwrites previous render output for the same element id (dedupe)', () => {
    const container = mockContainer()
    const hub = new ElementRendererHub(ctx, container)
    const marker = new Point('p1', Cartesian3.fromDegrees(0, 0))
    hub.render(marker)
    expect(container.get('p1').points.length).toBe(1)
    hub.render(marker)
    expect(container.get('p1').points.length).toBe(1)
  })

  it('lets a custom renderer override the built-in one via register', () => {
    const container = mockContainer()
    const hub = new ElementRendererHub(ctx, container)
    const custom: IElementRenderer = {
      render: (): RenderedItem[] => [{ host: 'ground', primitive: {} as never }],
    }
    hub.register('polyline', custom)
    const polyline = new Line('l1', [Cartesian3.fromDegrees(0, 0), Cartesian3.fromDegrees(1, 1)])
    hub.render(polyline)
    expect(container.get('l1').ground.length).toBe(1)
  })

  it('warns and skips when no renderer is registered', () => {
    const container = mockContainer()
    const warn = vi.fn()
    const hub = new ElementRendererHub({ ...ctx, warn }, container)
    const marker = new Point('p1', Cartesian3.fromDegrees(0, 0))
    ;(marker as any).type = 'unknown'
    hub.render(marker)
    expect(warn).toHaveBeenCalled()
    expect(container.has('p1')).toBe(false)
  })
})
