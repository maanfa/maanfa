import { describe, expect, it, vi } from 'vitest'
import { Cartesian3 } from 'cesium'
import Point from '../element/Point'
import InteractionArbiter from './InteractionArbiter'
import type { InteractionArbiterHost, InteractionPolicy } from './InteractionArbiter'

function setup(mode: 'idle' | 'draw' | 'edit' = 'idle') {
  const element = new Point('element-a', Cartesian3.fromDegrees(0, 0))
  const host = {
    mode,
    editingElement: mode === 'edit' ? element : null,
    resolvePickedElement: vi.fn(() => element),
    enterEdit: vi.fn(() => true),
    exitEdit: vi.fn(),
  } as unknown as InteractionArbiterHost & { mode: 'idle' | 'draw' | 'edit' }
  const policy: InteractionPolicy = {
    enableAutoEdit: true,
    enablePickToEdit: false,
    enableBlankClickExitEdit: true,
  }
  return { arbiter: new InteractionArbiter(host, policy), host, element }
}

describe('InteractionArbiter', () => {
  it('enters edit from idle only when pick-to-edit is enabled', () => {
    const { arbiter, host, element } = setup()
    arbiter.handlePick([{} as never])
    expect(host.enterEdit).not.toHaveBeenCalled()

    arbiter.policy.enablePickToEdit = true
    arbiter.handlePick([{} as never])
    expect(host.enterEdit).toHaveBeenCalledWith(element)
  })

  it('exits edit on blank pick when enabled', () => {
    const { arbiter, host } = setup('edit')
    ;(host.resolvePickedElement as ReturnType<typeof vi.fn>).mockReturnValue(null)

    arbiter.handlePick([])

    expect(host.exitEdit).toHaveBeenCalledTimes(1)
  })

  it('always exits edit before entering draw', () => {
    const { arbiter, host } = setup('edit')

    arbiter.beforeEnterDraw()

    expect(host.exitEdit).toHaveBeenCalledTimes(1)
  })
})
