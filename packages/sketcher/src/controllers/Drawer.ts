import type { MotionEvent, PositionedEvent, Viewer } from 'cesium'
import type { Mode, DrawSubState } from '../state/types'
import type { IController } from './IController'
import type { InteractionHandler } from '../interaction/MouseEventManager'
import type { IRendererManager } from '../renderer/IRendererManager'
import type { DrawOption } from '../strategies/draw/DrawStrategyFactory'
import DrawStrategyFactory from '../strategies/draw/DrawStrategyFactory'
import type { IDrawStrategy } from '../strategies/draw/IDrawStrategy'
import DrawContext from './DrawContext'
import type { IDrawContext } from './DrawContext'
import type StateMachine from '../state/StateMachine'
import type Element from '../element/Element'
import { Line, Point, Polygon } from '../element'
import type { IElementStore } from '../store/IElementStore'
import type CursorManager from '../interaction/CursorManager'
import { pickPosition } from '../utils/pickPosition'

type DrawFinishCallback = (element: Element, autoEdit: boolean) => void

/**
 * 绘制器 — 管理绘制模式下的全部交互与生命周期。
 *
 * 只做事件路由、上下文装配与最终提交；渲染由策略通过 `DrawContext` 自驱完成。
 */
class Drawer implements IController, InteractionHandler {
  readonly priority = 10

  private strategy: IDrawStrategy | null = null
  private opt: DrawOption | null = null
  private drawContext: IDrawContext | null = null

  stateMachine!: StateMachine
  rendererManager!: IRendererManager
  elementStore!: IElementStore
  viewer!: Viewer
  cursorManager!: CursorManager
  /** 当前绘制会话完成后是否自动进入编辑。 */
  autoEdit = true
  /** Sketcher 级默认值，DrawOption.autoEdit 可对单次绘制覆盖。 */
  defaultAutoEdit = true

  onDrawFinish?: DrawFinishCallback

  onModeEnter(_mode: Mode, _sub: DrawSubState | null): void {}

  onModeExit(_mode: Mode, _sub: DrawSubState | null): void {
    this.clearStrategy()
  }

  /**
   * 进入绘制：按类型取常驻 elementRenderer 注入 DrawContext，再创建策略。
   */
  enterDraw(opt: DrawOption): void {
    this.opt = opt
    // 绘制完成后默认进入编辑；调用方可显式传 false 保持静态结果。
    this.autoEdit = opt.autoEdit ?? this.defaultAutoEdit

    const renderer = this.rendererManager.elementRenderer.get(opt.type)
    if (!renderer) {
      console.warn(`[Drawer] no element renderer for type "${opt.type}"`)
      return
    }

    this.drawContext = new DrawContext(
      this.rendererManager,
      renderer,
      (pos) => pickPosition(this.viewer, pos),
      opt.style,
    )
    this.strategy = DrawStrategyFactory.create(opt, this.drawContext)

    // 绘制期游标：十字标（退出/完成时释放，回到默认）
    this.cursorManager?.register('draw', 'crosshair', 80)

    this.stateMachine?.transition('draw')
    this.stateMachine?.setDrawSubState('ready')
  }

  exitDraw(): void {
    this.clearStrategy()
    this.stateMachine?.transition('idle')
  }

  onLeftDown(e: PositionedEvent): boolean {
    if (!this.strategy) return false
    const sub = this.strategy.leftDown(e.position)
    this.stateMachine?.setDrawSubState(sub)
    return true
  }

  onLeftUp(e: PositionedEvent): boolean {
    if (!this.strategy) return false
    const sub = this.strategy.leftUp(e.position)
    this.stateMachine?.setDrawSubState(sub)
    if (this.strategy.canFinish()) {
      this.commitElement()
    }
    return true
  }

  onMouseMove(e: MotionEvent): boolean {
    if (!this.strategy) return false
    const sub = this.strategy.mouseMove(e.startPosition, e.endPosition)
    this.stateMachine?.setDrawSubState(sub)
    return true
  }

  onRightUp(e: PositionedEvent): boolean {
    if (!this.strategy) return false
    const stateBefore = this.stateMachine?.drawSubState
    const sub = this.strategy.rightUp(e.position)
    this.stateMachine?.setDrawSubState(sub)
    if (sub === 'ready' && stateBefore === 'drawing') {
      if (this.strategy.canFinish()) {
        this.commitElement()
      }
    }
    return true
  }

  onDblClick(e: PositionedEvent): boolean {
    if (!this.strategy) return false
    const stateBefore = this.stateMachine?.drawSubState
    const sub = this.strategy.dblClick(e.position)
    this.stateMachine?.setDrawSubState(sub)
    if (sub === 'ready' && stateBefore === 'drawing') {
      if (this.strategy.canFinish()) {
        this.commitElement()
      }
    }
    return true
  }

  /** 提交绘制结果：创建 Element → 入库（存储先行）→ 渲染跟随。 */
  private commitElement(): void {
    if (!this.strategy || !this.opt) return
    const coords = this.strategy.coords
    if (coords.length === 0) return

    const id = crypto.randomUUID()
    let element: Element
    switch (this.opt.type) {
      case 'marker':
        element = new Point(id, coords[0])
        break
      case 'polyline':
        element = new Line(id, coords)
        break
      case 'polygon':
        element = new Polygon(id, coords)
        break
    }

    if (this.opt.style) {
      element.setStyles({ style: this.opt.style })
    }
    this.elementStore.add(element)
    this.rendererManager.render(element)

    this.drawContext?.clearDraft()
    this.strategy.reset()

    // 绘制完成：释放十字标，回到默认游标
    this.cursorManager?.release('draw')

    const autoEdit = this.autoEdit
    this.onDrawFinish?.(element, autoEdit)
  }

  private clearStrategy(): void {
    this.strategy?.reset()
    this.strategy = null
    this.drawContext?.clearDraft()
    this.drawContext = null
    this.opt = null
    this.cursorManager?.release('draw')
  }
}

export type { DrawFinishCallback }
export default Drawer
