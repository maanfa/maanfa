import { describe, expect, it } from 'vitest'
import PickRegistry from './PickRegistry'

describe('PickRegistry', () => {
  it('registers and resolves component targets', () => {
    const registry = new PickRegistry()
    const pickId = registry.createPickId('element-1', 'polygon-fill')

    expect(registry.resolve(pickId)).toEqual({ elementId: 'element-1', part: 'polygon-fill' })
  })

  it('removes all component targets for an element', () => {
    const registry = new PickRegistry()
    const fill = registry.createPickId('element-1', 'polygon-fill')
    const outline = registry.createPickId('element-1', 'polygon-outline')
    const other = registry.createPickId('element-2', 'polygon-fill')

    registry.removeElement('element-1')

    expect(registry.resolve(fill)).toBeUndefined()
    expect(registry.resolve(outline)).toBeUndefined()
    expect(registry.resolve(other)).toEqual({ elementId: 'element-2', part: 'polygon-fill' })
  })

  it('can create temporary tokens without registering them', () => {
    const registry = new PickRegistry()
    const pickId = registry.createPickId('draw:draft', 'polygon-fill', false)

    expect(registry.resolve(pickId)).toBeUndefined()
  })
})
