import type { Cartesian2, Cartesian3 } from 'cesium'
import type { IDrawStrategy } from './IDrawStrategy'
import type { IDrawContext } from '../../controllers/DrawContext'
import type { IElementRenderer } from '../../renderer/elements/ElementRenderer'
import type { DrawSubState } from '../../state/types'
import type { DrawPreviewAppearance } from '../../renderer/types'
import { hexToCesiumColor } from '../../renderer'

/**
 * 点绘制策略 — 左键点击拾取贴地坐标即完成。
 *
 * - `leftDown` 记录起始屏幕坐标
 * - `leftUp` 若与 `leftDown` 位置相同则视为点击，拾取 ECEF 坐标 → 完成
 * - mouseMove 渲染幽灵点预览（真身未创建，纯辅助通道）
 */
class DrawPointStrategy implements IDrawStrategy {
  private firstScreenCoord: Cartesian2 | null = null
  private _coord: Cartesian3 | null = null
  private finished = false

  constructor(private readonly context: IDrawContext) {}

  get elementRenderer(): IElementRenderer {
    return this.context.elementRenderer
  }

  get coords(): Cartesian3[] {
    return this._coord ? [this._coord] : []
  }

  get hasActiveDrag(): boolean {
    return false
  }

  leftDown(pos: Cartesian2): DrawSubState {
    this.firstScreenCoord = pos
    return 'ready'
  }

  leftUp(pos: Cartesian2): DrawSubState {
    if (this.firstScreenCoord && !pos.equals(this.firstScreenCoord)) {
      // 位置不同 = 相机拖拽，忽略本次操作
      this.firstScreenCoord = null
      return 'ready'
    }

    const pWC = this.context.pick(pos)
    if (!pWC) {
      this.firstScreenCoord = null
      return 'ready'
    }

    this._coord = pWC
    this.finished = true
    this.firstScreenCoord = null
    this.context.clearPreview()
    return 'ready'
  }

  mouseMove(_start: Cartesian2, end: Cartesian2): DrawSubState {
    const pWC = this.context.pick(end)
    if (!pWC) return 'ready'
    this.context.renderPreview({ type: 'marker', coords: [pWC], style: this.previewStyle })
    return 'ready'
  }

  rightUp(_pos: Cartesian2): DrawSubState {
    return 'ready'
  }

  dblClick(_pos: Cartesian2): DrawSubState {
    return 'ready'
  }

  canFinish(): boolean {
    return this.finished
  }

  cancelLast(): void {
    this._coord = null
    this.finished = false
  }

  reset(): void {
    this.firstScreenCoord = null
    this._coord = null
    this.finished = false
    this.context.clearPreview()
  }

  private get previewStyle(): Partial<DrawPreviewAppearance> | undefined {
    const line = this.context.style?.line
    if (!line) return undefined
    return { color: hexToCesiumColor(line.color, line.opacity), lineWidth: line.width }
  }
}

export default DrawPointStrategy
