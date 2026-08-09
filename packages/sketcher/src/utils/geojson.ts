import { Cartesian3, Cartographic } from 'cesium'
import type { Element } from '../element'
import { Point, Line, Polygon } from '../element'

const RAD_TO_DEG = 180 / Math.PI

/**
 * 将 ECEF `Cartesian3` 转为经纬度 `[lng, lat, height]`（度单位）。
 */
function cartesianToDegrees(coord: Cartesian3): [number, number, number] {
  const cart = Cartographic.fromCartesian(coord)
  return [cart.longitude * RAD_TO_DEG, cart.latitude * RAD_TO_DEG, cart.height]
}

/**
 * 将 `[lng, lat, height]` 转为 ECEF `Cartesian3`。
 */
function degreesToCartesian(deg: [number, number, number]): Cartesian3 {
  return Cartesian3.fromDegrees(deg[0], deg[1], deg[2])
}

/**
 * 将单个 Element 转换为 GeoJSON Feature 对象。
 */
function elementToGeoJSON(element: Element): GeoJSON.Feature {
  switch (element.type) {
    case 'marker':
      return {
        type: 'Feature',
        id: element.id,
        geometry: {
          type: 'Point',
          coordinates: cartesianToDegrees(element.coords[0]),
        },
        properties: {},
      }
    case 'polyline':
      return {
        type: 'Feature' as const,
        id: element.id,
        geometry: {
          type: 'LineString' as const,
          coordinates: element.coords.map(cartesianToDegrees),
        },
        properties: {},
      }
    case 'polygon':
      return {
        type: 'Feature' as const,
        id: element.id,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [element.coords.map(cartesianToDegrees)],
        },
        properties: {},
      }
    default:
      throw new Error(`[geojson] Unsupported element type`)
  }
}

/**
 * 将 GeoJSON Feature 转换为 sketcher 内部 Element。
 */
function geoJSONToElement(gf: GeoJSON.Feature): Element {
  const id = (gf.id as string) ?? crypto.randomUUID()
  const { geometry } = gf

  switch (geometry.type) {
    case 'Point':
      return new Point(
        id,
        degreesToCartesian(geometry.coordinates as [number, number, number]),
      )
    case 'LineString':
      return new Line(
        id,
        (geometry.coordinates as number[][]).map((c) =>
          degreesToCartesian(c as [number, number, number]),
        ),
      )
    case 'Polygon':
      return new Polygon(
        id,
        (geometry.coordinates as number[][][])[0].map((c) =>
          degreesToCartesian(c as [number, number, number]),
        ),
      )
    default:
      throw new Error(`[geojson] Unsupported geometry type: ${geometry.type}`)
  }
}

/**
 * 将 Element 数组导出为 GeoJSON FeatureCollection 字符串。
 */
function exportToGeoJSON(elements: Element[]): string {
  const collection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: elements.map(elementToGeoJSON),
  }
  return JSON.stringify(collection)
}

/**
 * 从 GeoJSON 字符串导入为 Element 数组。
 */
function importFromGeoJSON(json: string): Element[] {
  const parsed = JSON.parse(json) as GeoJSON.FeatureCollection
  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error('[geojson] Invalid GeoJSON: expected FeatureCollection')
  }
  return parsed.features.map(geoJSONToElement)
}

export { elementToGeoJSON, geoJSONToElement, exportToGeoJSON, importFromGeoJSON }
