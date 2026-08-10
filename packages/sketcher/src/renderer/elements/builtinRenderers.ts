import {
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  GeometryInstance,
  GroundPolylinePrimitive,
  GroundPolylineGeometry,
  GroundPrimitive,
  Material,
  PerInstanceColorAppearance,
  PolygonGeometry,
  PolylineMaterialAppearance,
  PolygonHierarchy,
} from 'cesium'
import type Element from '../../element/Element'
import type { ElementStyle, LineStyle, FillStyle } from '../../styles'
import { hexToCesiumColor } from '../resolveStyle'
import {
  DefaultMarker,
  DefaultMarkerColor,
  DefaultPolyline,
  DefaultPolygonFill,
  DefaultPolygonOutline,
} from '../constants'
import type { RenderedItem } from '../rendering/PrimitiveContainer'
import type { ElementRendererContext } from './ElementRenderer'

/** 共享的 Cesium 颜色转换工具。 */
function toColor(hex: string, opacity = 1, warn?: (msg: string) => void): Color {
  return hexToCesiumColor(hex, opacity, warn)
}

function pickId(context: ElementRendererContext, elementId: string, part: string): string {
  return context.createPickId?.(elementId, part) ?? elementId
}

/**
 * 点元素渲染器：产出单个 PointPrimitive 的挂载描述（由容器 add 到共享 collection）。
 */
class MarkerRenderer {
  readonly context: ElementRendererContext

  constructor(context: ElementRendererContext) {
    this.context = context
  }

  render(element: Element, style?: ElementStyle): RenderedItem[] {
    const cfg = { ...DefaultMarker, ...(style?.symbol ?? {}) }
    const color = style?.line?.color
      ? toColor(style.line.color, style.line.opacity, this.context.warn)
      : toColor(DefaultMarkerColor, cfg.opacity, this.context.warn)
    const radius = cfg.iconSize ?? 3

    return [
      {
        host: 'point',
        point: {
          position: element.coords[0],
          color,
          pixelSize: radius * 2,
          id: pickId(this.context, element.id, 'marker'),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      },
    ]
  }
}

/**
 * 线元素渲染器：构建 GroundPolylinePrimitive。
 */
class PolylineRenderer {
  readonly context: ElementRendererContext

  constructor(context: ElementRendererContext) {
    this.context = context
  }

  render(element: Element, style?: ElementStyle): RenderedItem[] {
    const cfg: LineStyle = { ...DefaultPolyline, ...(style?.line ?? {}) }
    const color = toColor(cfg.color, cfg.opacity, this.context.warn)

    const prim = new GroundPolylinePrimitive({
      geometryInstances: new GeometryInstance({
        geometry: new GroundPolylineGeometry({
          positions: element.coords,
          width: cfg.width,
        }),
        id: pickId(this.context, element.id, 'polyline'),
      }),
      appearance: new PolylineMaterialAppearance({
        material: Material.fromType('Color', { color }),
      }),
      asynchronous: this.context.useAsyncGeometry(),
    })
    return [{ host: 'ground', primitive: prim }]
  }
}

/**
 * 面元素渲染器：构建 GroundPrimitive（fill）+ GroundPolylinePrimitive（outline）。
 */
class PolygonRenderer {
  readonly context: ElementRendererContext

  constructor(context: ElementRendererContext) {
    this.context = context
  }

  render(element: Element, style?: ElementStyle): RenderedItem[] {
    const coords = element.coords
    if (coords.length < 3) return []

    const hull = coords.map((c) => Cartesian3.clone(c))
    const items: RenderedItem[] = []
    const fill: FillStyle | undefined = style?.fill
    const fillColor = fill
      ? toColor(fill.color, fill.opacity, this.context.warn)
      : toColor(DefaultPolygonFill.color, DefaultPolygonFill.opacity, this.context.warn)

    items.push({
      host: 'ground',
      primitive: new GroundPrimitive({
        geometryInstances: new GeometryInstance({
          geometry: new PolygonGeometry({
            polygonHierarchy: new PolygonHierarchy(hull),
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          }),
          id: pickId(this.context, element.id, 'polygon-fill'),
          attributes: { color: ColorGeometryInstanceAttribute.fromColor(fillColor) },
        }),
        appearance: new PerInstanceColorAppearance({ flat: true }),
        asynchronous: this.context.useAsyncGeometry(),
      }),
    })

    const outline: LineStyle = style?.line ?? DefaultPolygonOutline
    const outlineColor = toColor(outline.color, outline.opacity, this.context.warn)
    const outlineWidth = outline.width
    if (outlineColor && outlineWidth) {
      const closed = [...hull, Cartesian3.clone(hull[0])]
      items.push({
        host: 'ground',
        primitive: new GroundPolylinePrimitive({
          geometryInstances: new GeometryInstance({
            geometry: new GroundPolylineGeometry({
              positions: closed,
              width: outlineWidth,
            }),
            id: pickId(this.context, element.id, 'polygon-outline'),
          }),
          appearance: new PolylineMaterialAppearance({
            material: Material.fromType('Color', { color: outlineColor }),
          }),
          asynchronous: this.context.useAsyncGeometry(),
        }),
      })
    }

    return items
  }
}

export { MarkerRenderer, PolylineRenderer, PolygonRenderer }
