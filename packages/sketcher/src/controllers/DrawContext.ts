import type { Cartesian2, Cartesian3 } from 'cesium'
import type Element from '../element/Element'
import type { ElementStyle } from '../styles'
import type { IRendererManager } from '../renderer/IRendererManager'
import type { IElementRenderer } from '../renderer/elements/ElementRenderer'
import type { DrawPreviewInfo } from '../renderer/draw/DrawRenderChannel'
import DrawVertexHelper from './DrawVertexHelper'

/**
 * 绘制上下文：Drawer 在创建 strategy 前按绘制类型解析 elementRenderer 注入，
 * 再整体传给策略。策略通过它自驱渲染，不再直接触碰 viewer / rendererManager。
 */
interface IDrawContext {
  /** 当前绘制类型对应的 Element 渲染适配器（Drawer 注入，常驻实例） */
  readonly elementRenderer: IElementRenderer
  /** 绘制期辅助管理器（顶点辅助元素 + 距离标签） */
  readonly vertexHelpers: DrawVertexHelper
  /** 当前绘制的实例样式（Drawer 从 DrawOption 注入，可选） */
  readonly style?: ElementStyle

  /** 真身未创建：渲染坐标结构预览 */
  renderPreview(info: DrawPreviewInfo): void
  clearPreview(): void

  /** 真身已创建但未入容器：经 elementRenderer 渲染草稿体 */
  renderDraftElement(element: Element, style?: ElementStyle): void
  clearDraftElement(): void

  /** 退出/提交绘制：清预览 + 草稿 + 顶点 + 标签 */
  clearDraft(): void

  /** 屏幕坐标 → 世界坐标（由 Drawer 注入，策略不再持有 viewer） */
  pick(pos: Cartesian2): Cartesian3 | undefined
}

class DrawContext implements IDrawContext {
  readonly vertexHelpers: DrawVertexHelper

  constructor(
    private readonly manager: IRendererManager,
    readonly elementRenderer: IElementRenderer,
    private readonly pickFn: (pos: Cartesian2) => Cartesian3 | undefined,
    readonly style: ElementStyle | undefined = undefined,
  ) {
    this.vertexHelpers = new DrawVertexHelper(manager.draw)
  }

  renderPreview(info: DrawPreviewInfo): void {
    this.manager.draw.renderPreview(info)
  }

  clearPreview(): void {
    this.manager.draw.clearPreview()
  }

  renderDraftElement(element: Element, style?: ElementStyle): void {
    const items = this.elementRenderer.render(element, style ?? element.style)
    this.manager.draw.renderDraft(items)
  }

  clearDraftElement(): void {
    this.manager.draw.clearDraftElement()
  }

  clearDraft(): void {
    this.manager.draw.clear()
    this.vertexHelpers.clear()
  }

  pick(pos: Cartesian2): Cartesian3 | undefined {
    return this.pickFn(pos)
  }
}

export type { IDrawContext }
export default DrawContext
