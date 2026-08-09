import type { Cartesian2, Cartesian3 } from 'cesium'
import type { IDrawStrategy } from './IDrawStrategy'
import type { IDrawContext } from '../../controllers/DrawContext'
import type { IElementRenderer } from '../../renderer/elements/ElementRenderer'
import type { DrawSubState } from '../../state/types'
import type { ElementType } from '../../types'
import type { DrawPreviewAppearance } from '../../renderer/types'
import { DRAFT_ELEMENT_ID, hexToCesiumColor } from '../../renderer'
import { Line } from '../../element'
import { checkSelfIntersection } from '../../utils/intersection'

/**
 * 线绘制策略 — 多点连续落点构成折线。
 *
 * 渲染自驱：
 * - 已放置 ≥ 2 点 → `renderDraftElement(Line(placed))`（真身草稿，复用 Element 适配器）
 * - 橡皮筋尾 → `renderPreview`（活动边）
 * - 已放置顶点 + 边长 → `vertexHelpers.sync`
 */
class DrawLineStrategy implements IDrawStrategy {
  private placed: Cartesian3[] = []
  private cursor: Cartesian3 | null = null
  private draft: Line | null = null
  private state: DrawSubState = 'ready'

  constructor(
    private readonly context: IDrawContext,
    private readonly endingAction: 'right-up' | 'double-click' = 'right-up',
  ) {}

  get elementRenderer(): IElementRenderer {
    return this.context.elementRenderer
  }

  get coords(): Cartesian3[] {
    return this.cursor && this.placed.length > 0 ? [...this.placed, this.cursor] : this.placed
  }

  get hasActiveDrag(): boolean {
    return this.cursor !== null
  }

  leftDown(pos: Cartesian2): DrawSubState {
    const p = this.context.pick(pos)
    if (!p) return this.state
    if (this.placed.length >= 2 && checkSelfIntersection(this.placed, p, 'polyline')) {
      return this.state
    }

    this.placed.push(p)
    this.cursor = null
    this.state = 'drawing'
    this.syncRender()
    return this.state
  }

  leftUp(_pos: Cartesian2): DrawSubState {
    return this.state
  }

  mouseMove(_start: Cartesian2, end: Cartesian2): DrawSubState {
    if (this.placed.length === 0) return this.state
    const p = this.context.pick(end)
    if (!p) return this.state
    this.cursor = p
    this.state = 'drawing'
    this.syncRender()
    return this.state
  }

  rightUp(_pos: Cartesian2): DrawSubState {
    if (this.endingAction !== 'right-up') return this.state
    this.state = 'ready'
    this.cursor = null
    return this.state
  }

  dblClick(_pos: Cartesian2): DrawSubState {
    if (this.endingAction !== 'double-click') return this.state
    this.state = 'ready'
    this.cursor = null
    return this.state
  }

  canFinish(): boolean {
    return this.placed.length >= 2 && this.state === 'ready'
  }

  cancelLast(): void {
    if (this.placed.length > 0) this.placed.pop()
    this.cursor = null
    if (this.placed.length === 0) this.state = 'ready'
    this.syncRender()
  }

  reset(): void {
    this.placed = []
    this.cursor = null
    this.draft = null
    this.state = 'ready'
    // 视觉清理由 Drawer 统一调用 context.clearDraft()
  }

  private syncRender(): void {
    const type: ElementType = 'polyline'

    // 1) 真身草稿：已放置 ≥ 2 时经元素适配器渲染（草稿只含已放置点）
    if (this.placed.length >= 2) {
      if (!this.draft || this.draft.getVertexCount() !== this.placed.length) {
        this.draft = new Line(DRAFT_ELEMENT_ID, this.placed)
      } else {
        this.placed.forEach((c, i) => this.draft!.setVertex(i, c))
      }
      this.context.renderDraftElement(this.draft, this.context.style)
    } else {
      this.context.clearDraftElement()
    }

    // 2) 预览：活动边（橡皮筋）；子最小态传全结构
    if (this.cursor && this.placed.length > 0) {
      const activeEdge =
        this.placed.length >= 2
          ? [this.placed[this.placed.length - 1], this.cursor]
          : [this.placed[0], this.cursor]
      this.context.renderPreview({ type, coords: activeEdge, style: this.previewStyle })
    } else {
      this.context.clearPreview()
    }

    // 3) 顶点辅助元素 + 距离标签
    this.context.vertexHelpers.sync(this.placed, { type, cursor: this.cursor ?? undefined })
  }

  private get previewStyle(): Partial<DrawPreviewAppearance> | undefined {
    const line = this.context.style?.line
    if (!line) return undefined
    return { color: hexToCesiumColor(line.color, line.opacity), lineWidth: line.width }
  }
}

export default DrawLineStrategy
