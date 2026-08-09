import {
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
import type { RenderedItem } from '../rendering/PrimitiveContainer'
import { DefaultPreview } from '../constants'
import type { DrawPreviewInfo } from './DrawRenderChannel'

interface DrawPreviewRendererContext {
  useAsyncGeometry: () => boolean
  warn: (msg: string) => void
}

/**
 * 预览原语构建器：坐标结构 → `RenderedItem[]`（纯构建，不挂载）。
 * 从原 HelperRendererHub.renderPreview 迁移，并新增 marker 幽灵点。
 */
class DrawPreviewRenderer {
  constructor(private readonly ctx: DrawPreviewRendererContext) {}

  render(info: DrawPreviewInfo): RenderedItem[] {
    const { type, coords, style } = info
    const s = { ...DefaultPreview, ...style }
    const items: RenderedItem[] = []

    // marker：幽灵点
    if (type === 'marker' && coords.length === 1) {
      items.push({
        host: 'point',
        point: {
          position: coords[0],
          color: s.color,
          pixelSize: s.lineWidth * 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    }

    // polygon：临时填充（coords ≥ 3 时）
    if (type === 'polygon' && coords.length >= 3) {
      items.push({
        host: 'ground',
        primitive: new GroundPrimitive({
          geometryInstances: new GeometryInstance({
            geometry: new PolygonGeometry({
              polygonHierarchy: new PolygonHierarchy(coords),
              perPositionHeight: true,
              vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            }),
            attributes: {
              color: ColorGeometryInstanceAttribute.fromColor(s.color.withAlpha(0.15)),
            },
          }),
          appearance: new PerInstanceColorAppearance({ flat: true }),
          asynchronous: this.ctx.useAsyncGeometry(),
        }),
      })
    }

    // 橡皮筋 / 临时闭合线（coords ≥ 2 时）
    if (coords.length >= 2) {
      const closed = type === 'polygon' ? [...coords, coords[0]] : coords
      items.push({
        host: 'ground',
        primitive: new GroundPolylinePrimitive({
          geometryInstances: new GeometryInstance({
            geometry: new GroundPolylineGeometry({
              positions: closed,
              width: s.lineWidth,
            }),
          }),
          appearance: new PolylineMaterialAppearance({
            material: Material.fromType('Color', { color: s.color }),
          }),
          asynchronous: this.ctx.useAsyncGeometry(),
        }),
      })
    }

    return items
  }
}

export default DrawPreviewRenderer
