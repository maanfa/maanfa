import { Cartesian2, Cartesian3, Viewer } from 'cesium'

/**
 * 通过射线与 Globe 相交拾取 ECEF 位置。
 */
function pickGlobePositionByRay(viewer: Viewer, winPos: Cartesian2): Cartesian3 | undefined {
  const { scene } = viewer
  const { globe } = scene

  if (!globe.show) {
    return
  }

  const ray = viewer.camera.getPickRay(winPos)
  if (!ray) {
    return
  }

  return globe.pick(ray, scene) ?? undefined
}

/**
 * 通过相机与椭球体相交拾取 ECEF 位置（作为最后回退）。
 */
function pickSceneEllipsoid(viewer: Viewer, winPos: Cartesian2): Cartesian3 | undefined {
  const { camera } = viewer
  return camera.pickEllipsoid(winPos) ?? undefined
}

/**
 * 贴地位置拾取：Scene → Globe → Ellipsoid 三级回退。
 *
 * @param viewer - Cesium Viewer 实例
 * @param winPos - 屏幕窗口坐标
 * @returns 拾取到的 ECEF 坐标，若三级均失败则返回 `undefined`
 */
function pickPosition(viewer: Viewer, winPos: Cartesian2): Cartesian3 | undefined {
  const { scene } = viewer

  if (scene.pickPositionSupported) {
    const scenePickResult = scene.pickPosition(winPos)
    if (scenePickResult) {
      return scenePickResult
    }
  }

  const globePickResult = pickGlobePositionByRay(viewer, winPos)
  if (globePickResult) {
    return globePickResult
  }

  return pickSceneEllipsoid(viewer, winPos)
}

export { pickGlobePositionByRay, pickSceneEllipsoid, pickPosition }
