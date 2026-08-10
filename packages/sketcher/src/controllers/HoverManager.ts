import type { MotionEvent } from 'cesium'
import type { Mode } from '../state/types'
import type { IController } from './IController'
import type { InteractionHandler } from '../interaction/MouseEventManager'
import type { IRendererManager } from '../renderer/IRendererManager'
import type { IElementStore } from '../store/IElementStore'
import type StateMachine from '../state/StateMachine'
import CursorManager from '../interaction/CursorManager'

/**
 * 悬停管理器。
 *
 * 在空闲模式与编辑模式 Ready 阶段激活。
 * 鼠标移动时判断是否命中已存储的 Element，命中则经 `onHoverChange` 通知外观层应用悬停反馈。
 *
 * 支持外部主动调用 `hover(id)` / `unhover()`。
 * 可通过 `enabled` 字段动态开关。
 */
class HoverManager implements IController, InteractionHandler {
  readonly priority = 20

  stateMachine!: StateMachine
  rendererManager!: IRendererManager
  elementStore!: IElementStore
  cursorManager!: CursorManager

  private _enabled = true
  private lastHoveredId: string | null = null

  /** 悬停变更回调（由外观层注入：应用反馈并重渲染） */
  onHoverChange?: (id: string | null) => void

  /** 悬停开关，设为 `false` 时自动清除当前悬停 */
  get enabled(): boolean {
    return this._enabled
  }
  set enabled(v: boolean) {
    if (this._enabled === v) return
    this._enabled = v
    if (!v) {
      this.unhover()
    }
  }

  // #region IController

  onModeEnter(_mode: Mode, _sub: any): void {}

  onModeExit(_mode: Mode, _sub: any): void {
    this.unhover()
  }

  // #endregion

  // #region InteractionHandler

  onMouseMove(e: MotionEvent): boolean {
    if (!this._enabled) return false

    const pickedObj = this.viewer.scene.pick(e.endPosition)
    if (!pickedObj) {
      this.unhover()
      return false
    }

    const id = this.findElementId(pickedObj)
    if (!id) {
      this.unhover()
      return false
    }

    if (id !== this.lastHoveredId) {
      this.lastHoveredId = id
      this.onHoverChange?.(id)
      this.cursorManager?.register('hover', 'pointer', 50)
    }
    return false
  }

  // #endregion

  // #region 公开 API

  /**
   * 主动悬停指定元素（供 UI 联动）。
   */
  hover(id: string): void {
    if (!this._enabled || !this.elementStore.has(id)) return
    if (this.lastHoveredId === id) return

    this.lastHoveredId = id
    this.onHoverChange?.(id)
    this.cursorManager?.register('hover', 'pointer', 50)
  }

  /** 清除当前悬停 */
  unhover(): void {
    if (this.lastHoveredId) {
      this.lastHoveredId = null
      this.onHoverChange?.(null)
    }
    this.cursorManager?.release('hover')
  }

  // #endregion

  // #region 工具

  get viewer(): import('cesium').Viewer {
    return this.rendererManager.viewer
  }

  /**
   * 从 Cesium pick 结果中提取 Element id。
   * 优先通过 RendererManager 的 pick registry 解析部件 token，
   * 再兼容自定义 renderer 直接使用 Element id 的情况。
   */
  private findElementId(pickedObj: any): string | null {
    const target = this.rendererManager.resolvePickTarget?.(pickedObj?.id)
    if (target) {
      return this.elementStore.has(target.elementId) ? target.elementId : null
    }
    if (pickedObj?.id && typeof pickedObj.id === 'string') {
      return this.elementStore.has(pickedObj.id) ? pickedObj.id : null
    }
    return null
  }

  // #endregion
}

export default HoverManager
