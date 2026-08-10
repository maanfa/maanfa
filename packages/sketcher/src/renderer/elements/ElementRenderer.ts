import type Element from '../../element/Element'
import type { ElementStyle } from '../../styles'
import type { RenderedItem } from '../rendering/PrimitiveContainer'

/**
 * 类型级元素渲染器的共享上下文。
 * 由 rendererManager 创建并注入，渲染器不自行管理全局状态。
 */
interface ElementRendererContext {
  /** 当前是否使用异步几何加载（运行时切换，用 getter 读取） */
  useAsyncGeometry: () => boolean
  /** 告警 logger */
  warn: (msg: string) => void
  /** 创建并登记可反查到 Element 的 Cesium pick token。 */
  createPickId?: (elementId: string, part: string) => string
}

/**
 * 类型级元素渲染器接口。
 *
 * 每种几何类型一个实现：根据元素几何与样式**构建** Cesium Primitive 列表并返回。
 * 渲染器不负责挂载/销毁——产物交给 {@link PrimitiveContainer} 统一托管（按元素 id 去重）。
 */
interface IElementRenderer {
  /**
   * 构建该元素的有效样式渲染产物。
   * @param element - 待渲染元素
   * @param style - 有效样式（已含反馈叠加）；缺省用元素自身样式
   */
  render(element: Element, style?: ElementStyle): RenderedItem[]
}

export type { ElementRendererContext, IElementRenderer }
