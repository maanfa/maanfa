import { Cartographic, Cartesian2, Cartesian3, SceneTransforms } from 'cesium'
import type { MotionEvent, PositionedEvent, Viewer } from 'cesium'
import type { Mode, EditSubState } from '../state/types'
import type { IController } from './IController'
import type { InteractionHandler } from '../interaction/MouseEventManager'
import type { IRendererManager } from '../renderer/IRendererManager'
import EditContext from './EditContext'
import type { IEditContext } from './EditContext'
import EditVertexHelper from './EditVertexHelper'
import type StateMachine from '../state/StateMachine'
import type Element from '../element/Element'
import type { ElementStyle } from '../styles'
import type { IElementStore } from '../store/IElementStore'
import type { HotkeyState } from '../interaction/HotkeyManager'
import type { VisualGuide } from '../renderer/types'
import type { EditMotion } from '../renderer/helpers/types'
import { pickPosition } from '../utils/pickPosition'
import EditStrategyFactory from '../strategies/edit/EditStrategyFactory'
import type { IEditStrategy } from '../strategies/edit/IEditStrategy'
import CursorManager from '../interaction/CursorManager'

/**
 * 拖拽坐标约束解析器接口。
 */
interface IDragConstraintResolver {
  resolve(position: Cartesian2, keyboard: HotkeyState): Cartesian3 | undefined
}

/**
 * 编辑视觉引导提供者接口。
 */
interface IEditVisualGuideProvider {
  getGuides(element: Element): VisualGuide[]
}

/** 默认贴地拖拽坐标解析器，使用 `pickPosition` 三级回退。 */
class GroundClampResolver implements IDragConstraintResolver {
  constructor(private viewer: Viewer) {}

  resolve(position: Cartesian2, _keyboard: HotkeyState): Cartesian3 | undefined {
    return pickPosition(this.viewer, position)
  }
}

/**
 * 编辑控制器。
 *
 * 鼠标事件透传给 EditVertexHelper（onLeftDown / onMouseMove / onLeftUp / hover），
 * 命中并选中可交互辅助元素 → EditMotion → validate → 变更元素 → renderElement → helper.sync。
 */
class Modifier implements IController, InteractionHandler {
  readonly priority = 10

  /** 拖拽坐标约束解析器，可替换 */
  dragResolver: IDragConstraintResolver

  /** 视觉引导提供者，可替换 */
  guideProvider: IEditVisualGuideProvider = { getGuides: () => [] }

  /** 反馈合成样式解析（外观层注入，见设计 §11.2；缺省用元素自身样式） */
  resolveStyle: (element: Element) => ElementStyle | undefined = (el) => el.style

  stateMachine!: StateMachine
  rendererManager!: IRendererManager
  elementStore!: IElementStore
  viewer!: Viewer
  cursorManager!: CursorManager

  private element: Element | null = null
  private editContext: IEditContext | null = null
  private editStrategy: IEditStrategy | null = null
  private hotkeyState: HotkeyState = { ctrl: false, alt: false, shift: false }
  private dragStartCoords: Cartesian3[] | null = null
  /** 当前中点拖拽已经插入的新顶点索引；一次拖拽周期内只插入一次。 */
  private insertedVertexIndex: number | null = null
  /** 拖拽期间暂存相机输入开关，结束后恢复调用方原值。 */
  private previousCameraInputs: boolean | null = null

  /** 当前编辑的元素（可空） */
  get editingElement(): Element | null {
    return this.element
  }

  constructor(viewer: Viewer) {
    this.dragResolver = new GroundClampResolver(viewer)
  }

  /**
   * 进入编辑模式：按元素类型取常驻 elementRenderer 注入 EditContext。
   */
  enterEdit(element: Element): boolean {
    const renderer = this.rendererManager.elementRenderer.get(element.type)
    if (!renderer) {
      console.warn(`[Modifier] no element renderer for type "${element.type}"`)
      return false
    }

    // 允许从一个元素切换到另一个元素时复用同一套编辑生命周期。
    this.clearEditContext()
    this.element = element

    this.editContext = new EditContext(
      this.rendererManager,
      renderer,
      new EditVertexHelper(
        this.rendererManager.edit,
        (p) => SceneTransforms.worldToWindowCoordinates(this.viewer.scene, p, new Cartesian2()) ?? undefined,
        (p) => this.resolveEditPosition(p),
      ),
      this.resolveStyle,
    )
    this.editStrategy = EditStrategyFactory.create(element.type, this.editContext)
    this.editContext.helper.bind(element)

    this.stateMachine?.transition('edit')
    this.stateMachine?.setEditSubState('ready')
    this.registerCursors()
    return true
  }

  exitEdit(): void {
    this.clearEditContext()
    this.element = null
    this.dragStartCoords = null
    this.insertedVertexIndex = null
    this.restoreCameraInputs()
    this.releaseCursors()
    this.stateMachine?.transition('idle')
  }

  onModeEnter(_mode: Mode, _sub: EditSubState | null): void {}

  onModeExit(_mode: Mode, _sub: EditSubState | null): void {
    this.clearEditContext()
    this.element = null
    this.dragStartCoords = null
    this.insertedVertexIndex = null
    this.restoreCameraInputs()
    this.releaseCursors()
  }

  onLeftDown(e: PositionedEvent): boolean {
    if (!this.element || !this.editContext) return false
    // 鼠标事件透传：辅助管理器命中并选中可交互辅助元素
    if (!this.editContext.helper.onLeftDown(e.position)) return false // 未命中/不可交互 → 让 Picker 处理
    const picked = this.editContext.helper.picked!
    this.dragStartCoords = this.element.cloneCoords()
    this.insertedVertexIndex = null
    this.previousCameraInputs = this.viewer.scene.screenSpaceCameraController.enableInputs
    this.viewer.scene.screenSpaceCameraController.enableInputs = false
    this.stateMachine?.setEditSubState(picked.id.kind === 'midpoint' ? 'inserting' : 'dragging')
    this.registerCursors()
    return true
  }

  onMouseMove(e: MotionEvent): boolean {
    if (!this.editContext?.helper.picked) return this.onHoverMouseMove(e.endPosition)
    return this.onDragMouseMove(e.endPosition)
  }

  onLeftUp(_e: PositionedEvent): boolean {
    if (!this.editContext?.helper.picked) return false
    this.editContext.helper.onLeftUp()
    this.stateMachine?.setEditSubState('ready')
    this.dragStartCoords = null
    this.insertedVertexIndex = null
    this.restoreCameraInputs()
    this.editContext.helper.sync(this.element!)
    return true
  }

  onRightUp(_e: PositionedEvent): boolean {
    const sub = this.stateMachine.editSubState as string
    if (sub === 'dragging' || sub === 'inserting') {
      this.cancelCurrentDrag()
      return true
    }
    return false
  }

  onDblClick(_e: PositionedEvent): boolean {
    return false
  }

  /** ready 态：事件透传做悬停命中（驱动手柄高亮与光标）。 */
  private onHoverMouseMove(endPos: Cartesian2): boolean {
    const hovered = this.editContext!.helper.hover(endPos)
    this.cursorManager?.register('editor-handle', hovered ? 'grab' : 'default', 90)
    this.editContext!.helper.sync(this.element!)
    this.refreshGuides()
    return hovered !== null
  }

  private onDragMouseMove(endPos: Cartesian2): boolean {
    if (!this.element || !this.editContext) return true
    const to = this.dragResolver.resolve(endPos, this.hotkeyState)
    if (!to) return true

    const motion = this.editContext.helper.onMouseMove(this.element, to)
    if (!motion) return true
    if (this.editStrategy?.validate(this.element, motion) === false) return true

    // 应用拖拽新信息：变更元素 → 刷新渲染 → 重算辅助量
    this.applyMutation(motion)
    this.editContext.renderElement(this.element)
    this.editContext.helper.sync(this.element)
    this.refreshGuides()
    return true
  }

  private applyMutation(motion: EditMotion): void {
    if (motion.kind === 'vertex') {
      this.element!.setVertex(motion.handle.index, motion.to)
    } else if (this.insertedVertexIndex === null) {
      // 中点拖拽的第一次采样插入顶点；后续采样只更新这个顶点。
      this.insertedVertexIndex = motion.handle.index + 1
      this.element!.insertVertex(motion.handle.index + 1, motion.to) // 中点拖拽 = 插入新顶点
    } else {
      this.element!.setVertex(this.insertedVertexIndex, motion.to)
    }
  }

  /** ESC 触发取消：恢复拖拽前的坐标。 */
  cancelCurrentDrag(): void {
    if (!this.element || !this.dragStartCoords) {
      this.restoreCameraInputs()
      return
    }

    const currentCoords = this.element.coords
    const startCoords = this.dragStartCoords
    for (let i = 0; i < Math.min(currentCoords.length, startCoords.length); i++) {
      this.element.setVertex(i, Cartesian3.clone(startCoords[i]))
    }
    if (currentCoords.length > startCoords.length) {
      for (let i = startCoords.length; i < currentCoords.length; i++) {
        this.element.removeVertex(startCoords.length)
      }
    }

    this.editContext?.helper.onLeftUp()
    this.stateMachine?.setEditSubState('ready')
    this.dragStartCoords = null
    this.insertedVertexIndex = null
    this.restoreCameraInputs()
    this.editContext?.renderElement(this.element)
    this.editContext?.helper.sync(this.element)
    this.registerCursors()
  }

  private registerCursors(): void {
    const sub = this.stateMachine?.editSubState as string
    if (sub === 'dragging' || sub === 'inserting') {
      this.cursorManager?.register('editor', 'grabbing', 90)
    } else {
      this.cursorManager?.release('editor')
    }
  }

  private releaseCursors(): void {
    this.cursorManager?.release('editor')
    this.cursorManager?.release('editor-handle')
  }

  /** 将辅助点贴到当前已加载的场景几何；未支持或未命中时保留原坐标。 */
  private resolveEditPosition(position: Cartesian3): Cartesian3 {
    const scene = this.viewer.scene
    if (scene.clampToHeightSupported) {
      const clamped = scene.clampToHeight(position)
      if (clamped) return clamped
    }

    if (!scene.globe?.getHeight) return position
    const cartographic = Cartographic.fromCartesian(position)
    const terrainHeight = scene.globe.getHeight(cartographic)
    if (terrainHeight === undefined) return position
    cartographic.height = terrainHeight
    return Cartographic.toCartesian(cartographic, undefined, new Cartesian3())
  }

  /** 恢复拖拽开始前的 Cesium 相机输入状态。 */
  private restoreCameraInputs(): void {
    if (this.previousCameraInputs === null) return
    this.viewer.scene.screenSpaceCameraController.enableInputs = this.previousCameraInputs
    this.previousCameraInputs = null
  }

  /** 清理当前编辑上下文及其临时辅助图形。 */
  private clearEditContext(): void {
    if (this.editContext) {
      this.editContext.helper.detach()
      this.rendererManager.edit.clearGuides()
    }
    this.editContext = null
    this.editStrategy = null
  }

  private refreshGuides(): void {
    if (this.element) {
      const guides = this.guideProvider.getGuides(this.element)
      this.rendererManager.edit.renderGuides(guides)
    }
  }

  /** 设置键盘状态（由 HotkeyManager 同步）。 */
  setHotkeyState(state: HotkeyState): void {
    this.hotkeyState = state
  }
}

export type { IDragConstraintResolver, IEditVisualGuideProvider }
export { GroundClampResolver }
export default Modifier
