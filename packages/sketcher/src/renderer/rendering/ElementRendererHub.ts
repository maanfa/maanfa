import type Element from '../../element/Element'
import type { ElementStyle } from '../../styles'
import type PrimitiveContainer from './PrimitiveContainer'
import type { IElementRenderer, ElementRendererContext } from '../elements/ElementRenderer'
import ElementRendererFactory from '../elements/ElementRendererFactory'

/**
 * 元素渲染器注册表：把 Element 分发到对应类型级渲染器（Element → Primitive 的适配入口）。
 *
 * - 按 `element.type` 从注册表查找渲染器
 * - 渲染器产出 `RenderedItem[]`，统一交给 {@link PrimitiveContainer} 托管（按元素 id 去重）
 */
class ElementRendererHub {
  private renderers = new Map<string, IElementRenderer>()

  constructor(
    private ctx: ElementRendererContext,
    private container: PrimitiveContainer,
  ) {
    // 注册内置类型级渲染器
    for (const type of ['marker', 'polyline', 'polygon'] as const) {
      this.register(type, ElementRendererFactory.create(type, ctx))
    }
  }

  /** 注册某类型的渲染器（可覆盖内置，供包外扩展） */
  register(type: string, renderer: IElementRenderer): void {
    this.renderers.set(type, renderer)
  }

  /** 获取已注册的渲染器（无则 undefined） */
  get(type: string): IElementRenderer | undefined {
    return this.renderers.get(type)
  }

  /**
   * 渲染某个元素：按类型分发 → 产物入容器（自动移除旧产物）。
   * @param style 有效样式（已含反馈叠加）；缺省用元素自身样式
   */
  render(element: Element, style?: ElementStyle): void {
    const renderer = this.renderers.get(element.type)
    if (!renderer) {
      this.ctx.warn(`[renderer] no element renderer registered for type "${element.type}"`)
      return
    }
    const items = renderer.render(element, style ?? element.style)
    this.container.set(element.id, items)
  }

  /** 移除某元素全部渲染产物 */
  remove(id: string): void {
    this.container.remove(id)
  }
}

export default ElementRendererHub
