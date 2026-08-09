import type Element from '../element/Element'
import type { ElementStyle } from '../styles'
import type { IRendererManager } from '../renderer/IRendererManager'
import type { IElementRenderer } from '../renderer/elements/ElementRenderer'
import EditVertexHelper from './EditVertexHelper'

/**
 * 编辑上下文：Modifier 按元素类型取常驻 elementRenderer 注入，
 * 经它刷新被编辑元素渲染并访问编辑期辅助管理器。
 */
interface IEditContext {
  /** 当前编辑元素类型对应的 Element 渲染适配器（Modifier 注入，常驻实例） */
  readonly elementRenderer: IElementRenderer
  /** 编辑期辅助管理器（顶点/中点手柄 + 距离标签） */
  readonly helper: EditVertexHelper

  /** 刷新被编辑元素渲染（默认用外观层注入的反馈合成样式；显式 style 优先） */
  renderElement(element: Element, style?: ElementStyle): void
  /** 按需渲染：用注入的 elementRenderer 构建并替换产物（低层） */
  renderElementWith(element: Element, style?: ElementStyle): void
}

class EditContext implements IEditContext {
  constructor(
    private readonly manager: IRendererManager,
    readonly elementRenderer: IElementRenderer,
    readonly helper: EditVertexHelper,
    /** 反馈合成样式解析（外观层注入，见设计 §11.2；缺省用元素自身样式） */
    private readonly resolveStyle: (element: Element) => ElementStyle | undefined = (el) => el.style,
  ) {}

  renderElement(element: Element, style?: ElementStyle): void {
    this.manager.render(element, style ?? this.resolveStyle(element))
  }

  renderElementWith(element: Element, style?: ElementStyle): void {
    const items = this.elementRenderer.render(element, style ?? this.resolveStyle(element))
    this.manager.replaceElementItems(element.id, items)
  }
}

export type { IEditContext }
export default EditContext
