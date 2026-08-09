import { describe, expect, it, vi } from 'vitest'
import { Cartesian2, Cartesian3 } from 'cesium'
import Drawer from './Drawer'
import type { IRendererManager } from '../renderer/IRendererManager'
import type { IDrawStrategy } from '../strategies/draw/IDrawStrategy'
import type { IElementStore } from '../store/IElementStore'
import DrawLineStrategy from '../strategies/draw/DrawLineStrategy'
import type CursorManager from '../interaction/CursorManager'

function makeCursorManager(): CursorManager {
  return {
    register: vi.fn(),
    release: vi.fn(),
  } as unknown as CursorManager
}

function makeRendererManager(): IRendererManager {
  return {
    viewer: {} as never,
    elementRenderer: {
      get: vi.fn(),
    } as never,
    draw: {
      renderPreview: vi.fn(),
      clearPreview: vi.fn(),
      renderDraft: vi.fn(),
      clearDraftElement: vi.fn(),
      renderVertices: vi.fn(),
      clearVertices: vi.fn(),
      renderLabels: vi.fn(),
      clearLabels: vi.fn(),
      clear: vi.fn(),
    } as never,
    edit: {} as never,
    render: vi.fn(),
    remove: vi.fn(),
    replaceElementItems: vi.fn(),
    clear: vi.fn(),
    destroy: vi.fn(),
  } as unknown as IRendererManager
}

function makeStore(): IElementStore {
  return {
    add: vi.fn((el: { id: string }) => el.id),
    remove: vi.fn(() => true),
    get: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
    findById: vi.fn(),
    count: vi.fn(() => 0),
    bounds: vi.fn(() => null),
    clear: vi.fn(),
    importGeoJSON: vi.fn(() => []),
    exportGeoJSON: vi.fn(() => ''),
  } as unknown as IElementStore
}

const coords2 = (): Cartesian3[] => [Cartesian3.fromDegrees(0, 0), Cartesian3.fromDegrees(1, 1)]

describe('Drawer', () => {
  it('enterDraw resolves the resident element renderer by type and injects style', () => {
    const rendererManager = makeRendererManager()
    const get = rendererManager.elementRenderer.get as ReturnType<typeof vi.fn>
    get.mockReturnValue({} as never)

    const drawer = new Drawer()
    drawer.rendererManager = rendererManager
    drawer.viewer = {} as never
    drawer.enterDraw({ type: 'polyline', style: { line: { color: '#00ff00', opacity: 1, width: 5 } } })

    expect(get).toHaveBeenCalledWith('polyline')
    expect(drawer['strategy']).toBeInstanceOf(DrawLineStrategy)
    expect(drawer['drawContext']?.style).toEqual({
      line: { color: '#00ff00', opacity: 1, width: 5 },
    })
  })

  it('warns and keeps no strategy when no renderer is registered', () => {
    const rendererManager = makeRendererManager()
    const get = rendererManager.elementRenderer.get as ReturnType<typeof vi.fn>
    get.mockReturnValue(undefined)

    const drawer = new Drawer()
    drawer.rendererManager = rendererManager
    drawer.viewer = {} as never
    drawer.enterDraw({ type: 'polyline' })

    expect(drawer['strategy']).toBeNull()
  })

  it('registers the crosshair cursor on enterDraw', () => {
    const rendererManager = makeRendererManager()
    const get = rendererManager.elementRenderer.get as ReturnType<typeof vi.fn>
    get.mockReturnValue({} as never)
    const cursorManager = makeCursorManager()

    const drawer = new Drawer()
    drawer.rendererManager = rendererManager
    drawer.viewer = {} as never
    drawer.cursorManager = cursorManager
    drawer.enterDraw({ type: 'polyline' })

    expect(cursorManager.register).toHaveBeenCalledWith('draw', 'crosshair', 80)
  })

  it('does not register a cursor when no renderer is available', () => {
    const rendererManager = makeRendererManager()
    const get = rendererManager.elementRenderer.get as ReturnType<typeof vi.fn>
    get.mockReturnValue(undefined)
    const cursorManager = makeCursorManager()

    const drawer = new Drawer()
    drawer.rendererManager = rendererManager
    drawer.viewer = {} as never
    drawer.cursorManager = cursorManager
    drawer.enterDraw({ type: 'polyline' })

    expect(cursorManager.register).not.toHaveBeenCalled()
  })

  it('commits to the store first, then renders, then clears the draft', () => {
    const rendererManager = makeRendererManager()
    const render = rendererManager.render as ReturnType<typeof vi.fn>
    const store = makeStore()
    const storeAdd = store.add as ReturnType<typeof vi.fn>

    const drawer = new Drawer()
    drawer.rendererManager = rendererManager
    drawer.elementStore = store
    ;(drawer as unknown as { strategy: IDrawStrategy | null }).strategy = {
      coords: coords2(),
      canFinish: () => true,
      reset: vi.fn(),
    } as unknown as IDrawStrategy
    ;(drawer as unknown as { opt: unknown }).opt = { type: 'polyline' }
    const clearDraft = vi.fn()
    ;(drawer as unknown as { drawContext: unknown }).drawContext = { clearDraft } as never

    const onDrawFinish = vi.fn()
    drawer.onDrawFinish = onDrawFinish
    ;(drawer as unknown as { commitElement(): void }).commitElement()

    expect(storeAdd).toHaveBeenCalledTimes(1)
    expect(render).toHaveBeenCalledTimes(1)
    expect(clearDraft).toHaveBeenCalledTimes(1)
    expect(onDrawFinish).toHaveBeenCalledTimes(1)
  })

  it('releases the draw cursor after committing', () => {
    const rendererManager = makeRendererManager()
    const store = makeStore()
    const cursorManager = makeCursorManager()

    const drawer = new Drawer()
    drawer.rendererManager = rendererManager
    drawer.elementStore = store
    drawer.cursorManager = cursorManager
    ;(drawer as unknown as { strategy: IDrawStrategy | null }).strategy = {
      coords: coords2(),
      canFinish: () => true,
      reset: vi.fn(),
    } as unknown as IDrawStrategy
    ;(drawer as unknown as { opt: unknown }).opt = { type: 'polyline' }
    ;(drawer as unknown as { drawContext: unknown }).drawContext = { clearDraft: vi.fn() } as never
    drawer.onDrawFinish = vi.fn()

    ;(drawer as unknown as { commitElement(): void }).commitElement()

    expect(cursorManager.release).toHaveBeenCalledWith('draw')
  })

  it('releases the draw cursor on exitDraw', () => {
    const rendererManager = makeRendererManager()
    const get = rendererManager.elementRenderer.get as ReturnType<typeof vi.fn>
    get.mockReturnValue({} as never)
    const cursorManager = makeCursorManager()

    const drawer = new Drawer()
    drawer.rendererManager = rendererManager
    drawer.viewer = {} as never
    drawer.cursorManager = cursorManager
    drawer.enterDraw({ type: 'polyline' })

    drawer.exitDraw()

    expect(cursorManager.release).toHaveBeenCalledWith('draw')
  })

  it('routes mouseMove to the strategy and syncs the state machine', () => {
    const drawer = new Drawer()
    const setDrawSubState = vi.fn()
    drawer.stateMachine = { setDrawSubState } as never
    ;(drawer as unknown as { strategy: IDrawStrategy | null }).strategy = {
      mouseMove: () => 'drawing',
    } as unknown as IDrawStrategy

    const consumed = drawer.onMouseMove({
      startPosition: new Cartesian2(0, 0),
      endPosition: new Cartesian2(1, 1),
    } as never)

    expect(consumed).toBe(true)
    expect(setDrawSubState).toHaveBeenCalledWith('drawing')
  })
})
