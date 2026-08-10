import { describe, expect, it, vi } from 'vitest'
import { Cartesian3 } from 'cesium'
import Modifier from './Modifier'
import Line from '../element/Line'
import type { IRendererManager } from '../renderer/IRendererManager'
import type { IElementStore } from '../store/IElementStore'
import type CursorManager from '../interaction/CursorManager'
import type { EditMotion } from '../renderer/helpers/types'

function setup() {
  const clearHandles = vi.fn()
  const clearLabels = vi.fn()
  const clearGuides = vi.fn()
  const renderer = {}
  const rendererManager = {
    elementRenderer: { get: vi.fn(() => renderer) },
    edit: { clearHandles, clearLabels, clearGuides, renderHandles: vi.fn(), renderLabels: vi.fn() },
  } as unknown as IRendererManager
  const modifier = new Modifier({} as never)
  modifier.rendererManager = rendererManager
  modifier.viewer = { scene: {} } as never
  modifier.stateMachine = {
    transition: vi.fn(),
    setEditSubState: vi.fn(),
    editSubState: 'ready',
  } as never
  modifier.cursorManager = {
    register: vi.fn(),
    release: vi.fn(),
  } as unknown as CursorManager
  modifier.elementStore = {} as IElementStore
  return { modifier, rendererManager, clearHandles, clearLabels, clearGuides }
}

function line(id: string): Line {
  return new Line(id, [Cartesian3.fromDegrees(0, 0), Cartesian3.fromDegrees(1, 1)])
}

describe('Modifier', () => {
  it('enters editing for a stored element and returns success', () => {
    const { modifier } = setup()

    expect(modifier.enterEdit(line('a'))).toBe(true)
    expect(modifier.editingElement?.id).toBe('a')
  })

  it('cleans the previous helper context when switching elements', () => {
    const { modifier, clearHandles, clearLabels, clearGuides } = setup()

    modifier.enterEdit(line('a'))
    modifier.enterEdit(line('b'))

    expect(modifier.editingElement?.id).toBe('b')
    expect(clearHandles).toHaveBeenCalledTimes(1)
    expect(clearLabels).toHaveBeenCalledTimes(1)
    expect(clearGuides).toHaveBeenCalledTimes(1)
  })

  it('inserts one vertex for a midpoint drag and moves it afterwards', () => {
    const { modifier } = setup()
    const element = line('a')
    ;(modifier as unknown as { element: Line }).element = element
    const motion = (to: Cartesian3): EditMotion => ({
      kind: 'midpoint',
      elementId: element.id,
      from: element.getVertex(0),
      to,
      handle: { kind: 'midpoint', index: 0 },
    })

    ;(modifier as unknown as { applyMutation(m: EditMotion): void }).applyMutation(
      motion(Cartesian3.fromDegrees(0.5, 0.5)),
    )
    ;(modifier as unknown as { applyMutation(m: EditMotion): void }).applyMutation(
      motion(Cartesian3.fromDegrees(0.7, 0.7)),
    )

    expect(element.getVertexCount()).toBe(3)
    expect(Cartesian3.equals(element.getVertex(1), Cartesian3.fromDegrees(0.7, 0.7))).toBe(true)
  })
})
