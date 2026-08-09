import { describe, expect, it } from 'vitest'
import FeedbackStyleStack from './FeedbackStyleStack'
import type { ElementStyle } from '../../styles'

const base: ElementStyle = { line: { color: '#333333', opacity: 1, width: 2 } }
const hover: ElementStyle = { line: { color: '#ff0000', opacity: 1, width: 3 } }
const edit: ElementStyle = { fill: { color: '#00ff00', opacity: 0.5 } }

describe('FeedbackStyleStack', () => {
  it('returns base when no feedback is applied', () => {
    const stack = new FeedbackStyleStack()
    expect(stack.effective(base, 'a')).toBe(base)
  })

  it('merges hover feedback over base per field', () => {
    const stack = new FeedbackStyleStack()
    stack.apply('a', hover, 'hover')
    const eff = stack.effective(base, 'a')!
    expect(eff.line?.color).toBe('#ff0000')
    expect(eff.line?.width).toBe(3)
    expect(eff.line?.opacity).toBe(1) // 未覆盖字段沿用 base
  })

  it('edit overrides select which overrides hover', () => {
    const stack = new FeedbackStyleStack()
    stack.apply('a', hover, 'hover')
    stack.apply('a', { fill: { color: '#0000ff', opacity: 0.2 } }, 'select')
    stack.apply('a', edit, 'edit')
    const eff = stack.effective(base, 'a')!
    // 顶层反馈（edit）未提供 line 时回落到 base，而不是穿透到 hover
    expect(eff.line?.color).toBe('#333333')
    expect(eff.line?.width).toBe(2)
    expect(eff.fill?.color).toBe('#00ff00') // fill 来自 edit
  })

  it('clear and clearAll restore lower layers', () => {
    const stack = new FeedbackStyleStack()
    stack.apply('a', hover, 'hover')
    stack.apply('a', edit, 'edit')
    stack.clear('a', 'edit')
    expect(stack.effective(base, 'a')?.line?.color).toBe('#ff0000')
    stack.clearAll('hover')
    expect(stack.effective(base, 'a')).toBe(base)
  })

  it('clearEntry removes all feedback for an id', () => {
    const stack = new FeedbackStyleStack()
    stack.apply('a', edit, 'edit')
    stack.clearEntry('a')
    expect(stack.effective(base, 'a')).toBe(base)
  })
})
