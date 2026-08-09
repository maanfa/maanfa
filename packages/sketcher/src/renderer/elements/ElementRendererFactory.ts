import type { IElementRenderer, ElementRendererContext } from './ElementRenderer'
import { MarkerRenderer, PolylineRenderer, PolygonRenderer } from './builtinRenderers'

/**
 * 元素渲染器工厂：按元素类型创建对应的类型级渲染器（Element → Primitive 适配角色）。
 */
class ElementRendererFactory {
  static create(type: string, ctx: ElementRendererContext): IElementRenderer {
    switch (type) {
      case 'marker':
        return new MarkerRenderer(ctx)
      case 'polyline':
        return new PolylineRenderer(ctx)
      case 'polygon':
        return new PolygonRenderer(ctx)
      default:
        throw new Error(`[ElementRendererFactory] Unsupported element type: ${type}`)
    }
  }
}

export default ElementRendererFactory
