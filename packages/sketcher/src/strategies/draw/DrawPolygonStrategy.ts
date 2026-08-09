import type { Cartesian2, Cartesian3 } from 'cesium'
import type { IDrawStrategy } from './IDrawStrategy'
import type { IDrawContext } from '../../controllers/DrawContext'
import type { IElementRenderer } from '../../renderer/elements/ElementRenderer'
import type { DrawSubState } from '../../state/types'
import type { ElementType } from '../../types'
import type { DrawPreviewAppearance } from '../../renderer/types'
import { DRAFT_ELEMENT_ID, hexToCesiumColor } from '../../renderer'
import { Polygon } from '../../element'
import { checkSelfIntersection } from '../../utils/intersection'

/**
 * 面绘制策略 — 多点连续落点构成封闭多边形。
 *
 * 渲染自驱：
 * - 已放置 ≥ 3 点 → `renderDraftElement(Polygon(placed + cursor))`（真身草稿，含游标实时刷新，每次销毁重建）
 * - 已放置 < 3 点 → `renderPreview`（活动边 + 临时闭合）
 * - 已放置顶点 + 边长（polygon 含闭合边） → `vertexHelpers.sync`
 */
class DrawPolygonStrategy implements IDrawStrategy {
  private placed: Cartesian3[] = []
  private cursor: Cartesian3 | null = null
  private draft: Polygon | null = null
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
    if (checkSelfIntersection(this.placed, p, 'polygon')) {
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
    this.syncRender()
    return this.state
  }

  dblClick(_pos: Cartesian2): DrawSubState {
    if (this.endingAction !== 'double-click') return this.state
    this.state = 'ready'
    this.cursor = null
    this.syncRender()
    return this.state
  }

  canFinish(): boolean {
    return this.placed.length >= 3 && this.state === 'ready'
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
  }

  private syncRender(): void {
    const type: ElementType = 'polygon'

    // 1) 真身草稿：已放置 ≥ 3 时经元素适配器渲染；
    //    含游标时草稿 = 已放置 + 游标（mousemove 实时刷新整面），每次销毁重建
    if (this.placed.length >= 3) {
      const draftCoords = this.cursor ? [...this.placed, this.cursor] : this.placed
      this.draft = new Polygon(DRAFT_ELEMENT_ID, draftCoords)
      this.context.renderDraftElement(this.draft, this.context.style)
    } else {
      this.context.clearDraftElement()
    }

    // 2) 预览：仅子最小态（< 3 已放置点）；草稿覆盖游标后不再重复画活动边/临时闭合
    if (this.cursor && this.placed.length > 0 && this.placed.length < 3) {
      const previewCoords =
        this.placed.length >= 2
          ? [this.placed[this.placed.length - 1], this.cursor, this.placed[0]]
          : [this.placed[0], this.cursor]
      this.context.renderPreview({ type, coords: previewCoords, style: this.previewStyle })
    } else {
      this.context.clearPreview()
    }

    // 3) 顶点辅助元素 + 距离标签（polygon 含闭合边 / 临时闭合边）
    this.context.vertexHelpers.sync(this.placed, { type, cursor: this.cursor ?? undefined })
  }

  private get previewStyle(): Partial<DrawPreviewAppearance> | undefined {
    const line = this.context.style?.line
    if (!line) return undefined
    return { color: hexToCesiumColor(line.color, line.opacity), lineWidth: line.width }
  }
}

export default DrawPolygonStrategy
