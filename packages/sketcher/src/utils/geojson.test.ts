import { describe, expect, it } from 'vitest'
import { Cartesian3 } from 'cesium'
import {
  elementToGeoJSON,
  geoJSONToElement,
  exportToGeoJSON,
  importFromGeoJSON,
} from './geojson'
import { Point, Line, Polygon } from '../element'

function deg(lon: number, lat: number, h = 0): Cartesian3 {
  return Cartesian3.fromDegrees(lon, lat, h)
}

describe('elementToGeoJSON', () => {
  it('converts a marker element to GeoJSON Point', () => {
    const element = new Point('p1', deg(116, 39, 100))
    const gj = elementToGeoJSON(element)
    expect(gj.type).toBe('Feature')
    expect(gj.geometry.type).toBe('Point')
    const geom = gj.geometry as GeoJSON.Point
    const [lon, lat, h] = geom.coordinates
    expect(lon).toBeCloseTo(116, 9)
    expect(lat).toBeCloseTo(39, 9)
    expect(h).toBeCloseTo(100, 6)
  })

  it('converts a polyline element to GeoJSON LineString', () => {
    const element = new Line('l1', [deg(0, 0), deg(10, 0), deg(10, 10)])
    const gj = elementToGeoJSON(element)
    expect(gj.geometry.type).toBe('LineString')
    const geom = gj.geometry as GeoJSON.LineString
    const coords = geom.coordinates
    expect(coords[0][0]).toBeCloseTo(0)
    expect(coords[0][1]).toBeCloseTo(0)
    expect(coords[2][0]).toBeCloseTo(10)
    expect(coords[2][1]).toBeCloseTo(10)
  })

  it('converts a polygon element to GeoJSON Polygon with a single ring', () => {
    const element = new Polygon('poly1', [deg(0, 0), deg(10, 0), deg(10, 10)])
    const gj = elementToGeoJSON(element)
    expect(gj.geometry.type).toBe('Polygon')
    const geom = gj.geometry as GeoJSON.Polygon
    expect(geom.coordinates).toHaveLength(1)
    expect(geom.coordinates[0]).toHaveLength(3)
  })
})

describe('geoJSONToElement', () => {
  it('rejects unsupported geometry types', () => {
    const gj: GeoJSON.Feature = {
      type: 'Feature',
      id: 'x',
      geometry: { type: 'MultiPoint', coordinates: [[0, 0]] },
      properties: {},
    }
    expect(() => geoJSONToElement(gj)).toThrow(/Unsupported geometry type/)
  })

  it('round-trips a polyline element through GeoJSON', () => {
    const original = new Line('l1', [deg(10, 20, 5), deg(30, 40, 7), deg(50, 60, 9)])
    const restored = geoJSONToElement(elementToGeoJSON(original)) as Line
    expect(restored.id).toBe(original.id)
    expect(restored.type).toBe('polyline')
    expect(restored.coords.length).toBe(3)
    const cart = restored.coords[0]
    const expectClose = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6)
    expectClose(cart.x, original.coords[0].x)
    expectClose(cart.y, original.coords[0].y)
    expectClose(cart.z, original.coords[0].z)
  })

  it('round-trips a marker element through GeoJSON', () => {
    const original = new Point('p1', deg(116, 39, 100))
    const restored = geoJSONToElement(elementToGeoJSON(original)) as Point
    expect(restored.id).toBe('p1')
    const a = restored.coord
    const b = original.coord
    expect(Math.abs(a.x - b.x)).toBeLessThan(1e-6)
    expect(Math.abs(a.y - b.y)).toBeLessThan(1e-6)
    expect(Math.abs(a.z - b.z)).toBeLessThan(1e-6)
  })
})

describe('exportToGeoJSON / importFromGeoJSON', () => {
  it('exports a FeatureCollection string', () => {
    const elements = [
      new Point('p1', deg(0, 0)),
      new Line('l1', [deg(0, 0), deg(1, 1)]),
    ]
    const json = exportToGeoJSON(elements)
    const parsed = JSON.parse(json) as GeoJSON.FeatureCollection
    expect(parsed.type).toBe('FeatureCollection')
    expect(parsed.features).toHaveLength(2)
  })

  it('imports a FeatureCollection string back into elements', () => {
    const json = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'a',
          geometry: { type: 'Point', coordinates: [116, 39, 0] },
          properties: {},
        },
        {
          type: 'Feature',
          id: 'b',
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0, 0],
              [10, 10, 0],
            ],
          },
          properties: {},
        },
      ],
    })
    const elements = importFromGeoJSON(json)
    expect(elements).toHaveLength(2)
    expect(elements[0].id).toBe('a')
    expect(elements[0].type).toBe('marker')
    expect(elements[1].type).toBe('polyline')
  })

  it('throws on invalid GeoJSON input', () => {
    expect(() => importFromGeoJSON('{"type":"Point"}')).toThrow(/Invalid GeoJSON/)
  })
})
