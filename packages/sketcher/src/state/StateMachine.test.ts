import { describe, expect, it, vi } from 'vitest'
import StateMachine from './StateMachine'

function setup() {
  const ctx = new StateMachine()
  const modeChange = vi.fn()
  const stateChange = vi.fn()
  const cancel = vi.fn()
  ctx.on('mode-change', modeChange)
  ctx.on('state-change', stateChange)
  ctx.on('cancel', cancel)
  return { ctx, modeChange, stateChange, cancel }
}

describe('StateMachine', () => {
  it('starts in idle mode with ready sub-states', () => {
    const { ctx } = setup()
    expect(ctx.mode).toBe('idle')
    expect(ctx.drawSubState).toBe('ready')
    expect(ctx.editSubState).toBe('ready')
    expect(ctx.currentSub).toBeNull()
  })

  it('ignores sub-state changes outside their mode', () => {
    const { ctx, stateChange } = setup()
    ctx.setDrawSubState('drawing')
    expect(ctx.drawSubState).toBe('ready')
    ctx.setEditSubState('dragging')
    expect(ctx.editSubState).toBe('ready')
    expect(stateChange).not.toHaveBeenCalled()
  })

  it('transition emits mode-change and resets sub-states', () => {
    const { ctx, modeChange, stateChange } = setup()
    ctx.transition('draw')
    expect(ctx.mode).toBe('draw')
    expect(ctx.drawSubState).toBe('ready')
    expect(modeChange).toHaveBeenCalledWith({
      prevMode: 'idle',
      nextMode: 'draw',
      prevSub: null,
      nextSub: 'ready',
    })
    expect(stateChange).toHaveBeenCalledTimes(1)
  })

  it('ignores transition to the same mode', () => {
    const { ctx, modeChange } = setup()
    ctx.transition('draw')
    modeChange.mockClear()
    ctx.transition('draw')
    expect(modeChange).not.toHaveBeenCalled()
  })

  it('setDrawSubState only takes effect in draw mode', () => {
    const { ctx, stateChange } = setup()
    ctx.transition('draw')
    ctx.setDrawSubState('drawing')
    expect(ctx.drawSubState).toBe('drawing')
    expect(stateChange).toHaveBeenLastCalledWith({
      prevMode: 'draw',
      nextMode: 'draw',
      prevSub: 'ready',
      nextSub: 'drawing',
    })
  })

  it('setEditSubState only takes effect in edit mode', () => {
    const { ctx } = setup()
    ctx.transition('edit')
    ctx.setEditSubState('dragging')
    expect(ctx.editSubState).toBe('dragging')
  })

  it('cancel during draw/drawing reverts to ready and stays in draw', () => {
    const { ctx, cancel } = setup()
    ctx.transition('draw')
    ctx.setDrawSubState('drawing')
    ctx.cancel()
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(ctx.drawSubState).toBe('ready')
    expect(ctx.mode).toBe('draw')
  })

  it('cancel during draw/ready exits to idle', () => {
    const { ctx, cancel } = setup()
    ctx.transition('draw')
    ctx.cancel()
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(ctx.mode).toBe('idle')
  })

  it('cancel during edit/dragging reverts to ready and stays in edit', () => {
    const { ctx, cancel } = setup()
    ctx.transition('edit')
    ctx.setEditSubState('dragging')
    ctx.cancel()
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(ctx.editSubState).toBe('ready')
    expect(ctx.mode).toBe('edit')
  })

  it('cancel during edit/ready exits to idle', () => {
    const { ctx, cancel } = setup()
    ctx.transition('edit')
    ctx.cancel()
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(ctx.mode).toBe('idle')
  })

  it('cancel in idle mode is a no-op', () => {
    const { ctx, cancel } = setup()
    ctx.cancel()
    expect(cancel).not.toHaveBeenCalled()
    expect(ctx.mode).toBe('idle')
  })
})
