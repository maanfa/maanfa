import { describe, expect, it, vi } from 'vitest'
import HoverManager from './HoverManager'
import PickRegistry from '../renderer/rendering/PickRegistry'
import type { IRendererManager } from '../renderer/IRendererManager'
import type { IElementStore } from '../store/IElementStore'

function store(): IElementStore {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn((id: string) => id === 'element-1'),
    findById: vi.fn(),
    count: vi.fn(() => 1),
    bounds: vi.fn(() => null),
    clear: vi.fn(),
    importGeoJSON: vi.fn(() => []),
    exportGeoJSON: vi.fn(() => ''),
  } as unknown as IElementStore
}

describe('HoverManager', () => {
  it('resolves a component pick token to its Element id', () => {
    const registry = new PickRegistry()
    const pickId = registry.createPickId('element-1', 'polygon-outline')
    const onHoverChange = vi.fn()
    const rendererManager = {
      viewer: { scene: { pick: vi.fn(() => ({ id: pickId })) } },
      resolvePickTarget: (id: unknown) => registry.resolve(id),
    } as unknown as IRendererManager
    const cursorManager = { register: vi.fn(), release: vi.fn() }
    const hover = new HoverManager()
    hover.rendererManager = rendererManager
    hover.elementStore = store()
    hover.cursorManager = cursorManager as never
    hover.onHoverChange = onHoverChange

    hover.onMouseMove({ endPosition: {} } as never)

    expect(onHoverChange).toHaveBeenCalledWith('element-1')
    expect(cursorManager.register).toHaveBeenCalledWith('hover', 'pointer', 50)
  })

  it('keeps direct Element ids working for custom renderers', () => {
    const onHoverChange = vi.fn()
    const rendererManager = {
      viewer: { scene: { pick: vi.fn(() => ({ id: 'element-1' })) } },
    } as unknown as IRendererManager
    const hover = new HoverManager()
    hover.rendererManager = rendererManager
    hover.elementStore = store()
    hover.cursorManager = { register: vi.fn(), release: vi.fn() } as never
    hover.onHoverChange = onHoverChange

    hover.onMouseMove({ endPosition: {} } as never)

    expect(onHoverChange).toHaveBeenCalledWith('element-1')
  })
})
