import { describe, expect, it, vi } from 'vitest'
import { Cartesian3 } from 'cesium'
import DrawRenderChannel from './DrawRenderChannel'
import type PrimitiveContainer from '../rendering/PrimitiveContainer'
import type DrawPreviewRenderer from './DrawPreviewRenderer'

function mockContainer(): PrimitiveContainer {
  const keys = new Set<string>()
  return {
    set: vi.fn((k: string) => void keys.add(k)),
    remove: vi.fn((k: string) => void keys.delete(k)),
    get: vi.fn(),
    has: vi.fn((k: string) => keys.has(k)),
    clear: vi.fn(() => keys.clear()),
  } as unknown as PrimitiveContainer
}

function makeChannel(container: PrimitiveContainer): DrawRenderChannel {
  const preview = { render: vi.fn(() => []) } as unknown as DrawPreviewRenderer
  return new DrawRenderChannel(container, preview)
}

describe('DrawRenderChannel', () => {
  it('routes preview, draft, vertices and labels to fixed keys', () => {
    const container = mockContainer()
    const channel = makeChannel(container)
    const c0 = Cartesian3.fromDegrees(0, 0)
    const c1 = Cartesian3.fromDegrees(1, 0)

    channel.renderPreview({ type: 'polyline', coords: [c0, c1] })
    expect(container.set).toHaveBeenCalledWith('draw:preview', expect.any(Array))

    channel.renderDraft([])
    expect(container.set).toHaveBeenCalledWith('draw:draft', [])

    channel.renderVertices([c0])
    expect(container.set).toHaveBeenCalledWith('draw:vertices', expect.any(Array))

    channel.renderLabels([{ position: c0, text: '10 m' }])
    expect(container.set).toHaveBeenCalledWith('draw:labels', expect.any(Array))
  })

  it('clear removes all four keys', () => {
    const container = mockContainer()
    const channel = makeChannel(container)
    channel.renderPreview({ type: 'polyline', coords: [Cartesian3.fromDegrees(0, 0), Cartesian3.fromDegrees(1, 0)] })
    channel.renderDraft([])
    channel.renderVertices([Cartesian3.fromDegrees(0, 0)])
    channel.renderLabels([{ position: Cartesian3.fromDegrees(0, 0), text: '1 m' }])

    channel.clear()
    expect(container.remove).toHaveBeenCalledWith('draw:preview')
    expect(container.remove).toHaveBeenCalledWith('draw:draft')
    expect(container.remove).toHaveBeenCalledWith('draw:vertices')
    expect(container.remove).toHaveBeenCalledWith('draw:labels')
  })
})
