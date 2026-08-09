import { describe, expect, it, vi } from 'vitest'
import { Cartesian2, Cartesian3 } from 'cesium'
import type { Viewer } from 'cesium'
import { pickPosition } from './pickPosition'

const pos = new Cartesian2(0, 0)
const someCoord = Cartesian3.fromDegrees(116, 39, 0)

function makeViewer() {
  const pickPositionMock = vi.fn<() => Cartesian3 | undefined>()
  const globePickMock = vi.fn<() => Cartesian3 | undefined>()
  const ellipsoidMock = vi.fn<() => Cartesian3 | undefined>()
  const getPickRayMock = vi.fn(() => ({ origin: someCoord, direction: someCoord }))

  const viewer = {
    camera: {
      getPickRay: getPickRayMock,
      pickEllipsoid: ellipsoidMock,
    },
    scene: {
      pickPositionSupported: true,
      pickPosition: pickPositionMock,
      globe: {
        show: true,
        pick: globePickMock,
      },
    },
  } as unknown as Viewer

  return { viewer, pickPositionMock, globePickMock, ellipsoidMock, getPickRayMock }
}

describe('pickPosition — three-level fallback', () => {
  it('uses scene.pickPosition when supported and it returns a coordinate', () => {
    const m = makeViewer()
    m.pickPositionMock.mockReturnValue(someCoord)
    expect(pickPosition(m.viewer, pos)).toBe(someCoord)
    expect(m.pickPositionMock).toHaveBeenCalledWith(pos)
    expect(m.globePickMock).not.toHaveBeenCalled()
  })

  it('falls back to globe.pick when scene.pickPosition returns nothing', () => {
    const m = makeViewer()
    m.pickPositionMock.mockReturnValue(undefined)
    m.globePickMock.mockReturnValue(someCoord)
    expect(pickPosition(m.viewer, pos)).toBe(someCoord)
    expect(m.globePickMock).toHaveBeenCalled()
  })

  it('skips the globe when it is hidden and uses camera.pickEllipsoid', () => {
    const m = makeViewer()
    m.pickPositionMock.mockReturnValue(undefined)
    m.viewer.scene.globe.show = false
    m.ellipsoidMock.mockReturnValue(someCoord)
    expect(pickPosition(m.viewer, pos)).toBe(someCoord)
    expect(m.globePickMock).not.toHaveBeenCalled()
  })

  it('returns undefined when all three levels fail', () => {
    const m = makeViewer()
    m.pickPositionMock.mockReturnValue(undefined)
    m.globePickMock.mockReturnValue(undefined)
    m.ellipsoidMock.mockReturnValue(undefined)
    expect(pickPosition(m.viewer, pos)).toBeUndefined()
  })

  it('still uses camera.pickEllipsoid when pickPosition is unsupported', () => {
    const m = makeViewer()
    ;(m.viewer.scene as unknown as { pickPositionSupported: boolean }).pickPositionSupported =
      false
    m.ellipsoidMock.mockReturnValue(someCoord)
    expect(pickPosition(m.viewer, pos)).toBe(someCoord)
    expect(m.pickPositionMock).not.toHaveBeenCalled()
  })
})
