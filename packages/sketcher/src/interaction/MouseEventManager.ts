import { ScreenSpaceEventHandler, ScreenSpaceEventType } from 'cesium'
import type { MotionEvent, PositionedEvent, Viewer } from 'cesium'

/**
 * 交互处理器接口。
 *
 * 每个方法返回 `boolean`：
 * - `true`  事件已被消费，不再继续分发给更低优先级的处理器
 * - `false` 事件未被消费，继续向低优先级处理器传递
 */
interface InteractionHandler {
  /** 优先级，数字越小优先级越高 */
  readonly priority: number
  onLeftDown?(e: PositionedEvent): boolean
  onLeftUp?(e: PositionedEvent): boolean
  onRightDown?(e: PositionedEvent): boolean
  onRightUp?(e: PositionedEvent): boolean
  onMouseMove?(e: MotionEvent): boolean
  onLeftClick?(e: PositionedEvent): boolean
  onDblClick?(e: PositionedEvent): boolean
}

/**
 * Cesium 交互事件分发器 — 优先级链调度。
 *
 * 封装 {@link ScreenSpaceEventHandler}，将 Cesium 原始事件按优先级分发给
 * 注册的 {@link InteractionHandler} 链。事件被首个返回 `true` 的方法消费后停止传递。
 *
 * 使用方式：
 * ```
 * router.configure([editorHandler, pickerHandler, hoverHandler])
 * ```
 */
class MouseEventManager {
  private screenHandler: ScreenSpaceEventHandler | null = null
  private handlers: InteractionHandler[] = []
  private _viewer: Viewer | null = null

  /**
   * 注册 Cesium Viewer 并绑定画布事件。
   * 在 Sketcher 构造时调用。
   */
  bind(viewer: Viewer): void {
    if (this.screenHandler) {
      this.screenHandler.destroy()
    }
    this._viewer = viewer
    this.screenHandler = new ScreenSpaceEventHandler(viewer.canvas)

    this.screenHandler.setInputAction(this.dispatchLeftDown, ScreenSpaceEventType.LEFT_DOWN)
    this.screenHandler.setInputAction(this.dispatchLeftUp, ScreenSpaceEventType.LEFT_UP)
    this.screenHandler.setInputAction(this.dispatchRightDown, ScreenSpaceEventType.RIGHT_DOWN)
    this.screenHandler.setInputAction(this.dispatchRightUp, ScreenSpaceEventType.RIGHT_UP)
    this.screenHandler.setInputAction(this.dispatchMouseMove, ScreenSpaceEventType.MOUSE_MOVE)
    this.screenHandler.setInputAction(this.dispatchLeftClick, ScreenSpaceEventType.LEFT_CLICK)
    this.screenHandler.setInputAction(this.dispatchDblClick, ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  }

  /**
   * 重新配置交互处理器优先级链。
   *
   * 由 StateMachine 在模式切换时调用。
   * @param sortedHandlers 按优先级升序排列的处理器数组
   */
  configure(sortedHandlers: InteractionHandler[]): void {
    this.handlers = [...sortedHandlers]
  }

  get viewer(): Viewer | null {
    return this._viewer
  }

  /** 销毁事件绑定 */
  destroy(): void {
    this.handlers = []
    this.screenHandler?.destroy()
    this.screenHandler = null
  }

  // #region Cesium 事件分发（按优先级链逐一调用）
  private dispatchLeftDown = (e: PositionedEvent): void => {
    for (const h of this.handlers) {
      if (h.onLeftDown?.(e)) break
    }
  }

  private dispatchLeftUp = (e: PositionedEvent): void => {
    for (const h of this.handlers) {
      if (h.onLeftUp?.(e)) break
    }
  }

  private dispatchRightDown = (e: PositionedEvent): void => {
    for (const h of this.handlers) {
      if (h.onRightDown?.(e)) break
    }
  }

  private dispatchRightUp = (e: PositionedEvent): void => {
    for (const h of this.handlers) {
      if (h.onRightUp?.(e)) break
    }
  }

  private dispatchMouseMove = (e: MotionEvent): void => {
    for (const h of this.handlers) {
      if (h.onMouseMove?.(e)) break
    }
  }

  private dispatchLeftClick = (e: PositionedEvent): void => {
    for (const h of this.handlers) {
      if (h.onLeftClick?.(e)) break
    }
  }

  private dispatchDblClick = (e: PositionedEvent): void => {
    for (const h of this.handlers) {
      if (h.onDblClick?.(e)) break
    }
  }
  // #endregion
}

export type { InteractionHandler }
export default MouseEventManager
