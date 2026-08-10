import type { PickResult, Viewer } from 'cesium'
import EventEmitter from 'eventemitter3'
import { StateMachine } from './state'
import type { Mode } from './state/types'
import { MouseEventManager, HotkeyManager, CursorManager } from './interaction'
import { ElementStore } from './store'
import type { IElementStore } from './store'
import { FeedbackStyleStack, RendererManager } from './renderer'
import type { IRendererManager } from './renderer'
import { Drawer, Modifier, HoverManager, Picker, InteractionArbiter } from './controllers'
import type { InteractionPolicy } from './controllers'
import type { Element } from './element'
import type { DrawOption } from './types'
import type { ElementStyle, ElementStyles } from './styles'
import type {
  DrawFinishEvent,
  ElementUpdateEvent,
  ModeChangeEvent,
  PickEventPayload,
} from './types'
import createLogger from './utils/logger'
import type { InteractionHandler } from './interaction/MouseEventManager'
import type { Modifier as ModifierType } from './controllers'

/**
 * 合成编辑反馈：继承 hover 的尺寸/形态变化，但使用基础样式颜色，避免编辑态继续闪烁高亮。
 */
function resolveEditingStyle(element: Element): ElementStyle {
  const base = element.style
  const hover = element.hoverStyle
  if (!hover) return element.editingStyle ?? base ?? {}

  return {
    line: hover.line
      ? { ...hover.line, color: base?.line?.color ?? hover.line.color, opacity: base?.line?.opacity ?? hover.line.opacity }
      : base?.line,
    fill: hover.fill
      ? { ...hover.fill, color: base?.fill?.color ?? hover.fill.color, opacity: base?.fill?.opacity ?? hover.fill.opacity }
      : base?.fill,
    symbol: hover.symbol ?? base?.symbol,
    label: hover.label
      ? { ...hover.label, color: base?.label?.color ?? hover.label.color, opacity: base?.label?.opacity ?? hover.label.opacity }
      : base?.label,
    customShaders: hover.customShaders ?? base?.customShaders,
  }
}

/**
 * Sketcher 对外事件映射。
 */
type SketcherEvents = {
  /** 绘制完成 */
  'draw-finish': (evt: DrawFinishEvent) => void
  /** 元素变更 */
  'element-updated': (evt: ElementUpdateEvent) => void
  /** 元素添加 */
  'element-added': (evt: ElementUpdateEvent) => void
  /** 元素移除 */
  'element-removed': (evt: ElementUpdateEvent) => void
  /** 拾取结果 */
  'pick-result': (evt: PickEventPayload) => void
  /** 模式变更 */
  'mode-change': (evt: ModeChangeEvent) => void
  /** 选中变更 */
  'select-change': (evt: { id: string | null }) => void
  /** 悬停变更 */
  'hover-change': (evt: { id: string | null }) => void
}

/**
 * Sketcher — 外观类，Cesium 几何绘图工具总调度者。
 *
 * 聚合所有子模块，对外提供统一的 API：
 * - 绘制：`enterDraw()` / `exitDraw()`
 * - 编辑：`enterEdit()` / `exitEdit()`
 * - 悬停/选中：`hover()` / `unhover()` / `select()` / `deselect()`
 * - 数据 CRUD：`addElement()` / `removeElement()` / `updateElement()`
 * - 导入导出：`importGeoJSON()` / `exportGeoJSON()`
 */
class Sketcher extends EventEmitter<SketcherEvents> {
  /** 状态机 */
  readonly stateMachine: StateMachine = new StateMachine()

  /** 热键管理器 */
  readonly hotkeys: HotkeyManager = new HotkeyManager()

  /** 鼠标事件管家 */
  readonly mouseEventManager: MouseEventManager = new MouseEventManager()

  /** 游标管理器 */
  readonly cursorManager: CursorManager = new CursorManager()

  /** 元素仓库 */
  readonly elementStore: IElementStore

  /** 渲染管理器（元素通道 + 辅助通道） */
  readonly rendererManager: IRendererManager

  /** 绘制器 */
  readonly drawer: Drawer = new Drawer()

  /** 编辑变更器 */
  readonly modifier: ModifierType

  /** 悬停管理器 */
  readonly hoverManager: HoverManager = new HoverManager()

  /** 拾取器 */
  readonly picker: Picker = new Picker()

  /** 日志记录器 */
  readonly logger: ReturnType<typeof createLogger> = createLogger(false)

  /** 全局默认选择/编辑反馈样式（悬停反馈始终由 Element 实例提供） */
  readonly globalStyles: ElementStyles = {}

  /** 反馈样式栈（hover / select / edit 由外观层合成后经 render(element, style) 传入） */
  private readonly feedback = new FeedbackStyleStack()

  private _debug = false
  private _hoverEnabled = true
  private _selectedId: string | null = null
  private _hoveredId: string | null = null
  private _cursorOverride: string | null = null
  /** 跨控制器交互开关；编辑与绘制互斥规则不在此配置。 */
  readonly interaction: InteractionPolicy
  /** 行为仲裁器，负责把拾取意图转换为编辑/退出等模式操作。 */
  readonly interactionArbiter: InteractionArbiter
  readonly viewer: Viewer

  constructor(
    viewer: Viewer,
    opts?: {
      elementStore?: IElementStore
      rendererManager?: IRendererManager
      styles?: ElementStyles
      interaction?: Partial<InteractionPolicy>
    },
  ) {
    super()

    if (viewer.isDestroyed()) {
      throw new Error('[Sketcher] Viewer is required and must not be destroyed')
    }

    this.viewer = viewer
    this.globalStyles = opts?.styles ?? {}
    this.interaction = {
      enableAutoEdit: opts?.interaction?.enableAutoEdit ?? true,
      enablePickToEdit: opts?.interaction?.enablePickToEdit ?? false,
      enableBlankClickExitEdit: opts?.interaction?.enableBlankClickExitEdit ?? true,
    }

    // 注入可替换实现
    this.elementStore = opts?.elementStore ?? new ElementStore()
    this.rendererManager = opts?.rendererManager ?? new RendererManager(viewer)
    this.modifier = new Modifier(viewer)
    const getMode = (): Mode => this.stateMachine.mode
    const getEditingElement = (): Element | null => this.modifier.editingElement
    this.interactionArbiter = new InteractionArbiter(
      {
        get mode() {
          return getMode()
        },
        get editingElement() {
          return getEditingElement()
        },
        resolvePickedElement: (picks) => this.resolvePickedElement(picks),
        enterEdit: (element) => this.enterEdit(element),
        exitEdit: () => this.exitEdit(),
      },
      this.interaction,
    )

    this.wireComponents()
    this.bindInternalEvents()
  }

  // #region 公开属性

  /** 调试模式开关 */
  get debug(): boolean {
    return this._debug
  }
  set debug(v: boolean) {
    this._debug = v
    this.logger.enable(v)
    this.logger.debug('[Sketcher] debug mode:', v)
  }

  /** 悬停开关 */
  get hoverEnabled(): boolean {
    return this._hoverEnabled
  }
  set hoverEnabled(v: boolean) {
    this._hoverEnabled = v
    this.hoverManager.enabled = v
  }

  /** 游标覆盖锁定 */
  get cursorOverride(): string | null {
    return this._cursorOverride
  }
  set cursorOverride(v: string | null) {
    this._cursorOverride = v
    this.cursorManager.cursorOverride = v
  }

  // #endregion

  // #region 组件注入与依赖连接

  /**
   * 将全部子组件注入上下文并建立引用链。
   */
  private wireComponents(): void {
    const ctx = this.stateMachine

    const drawCtrl = this.drawer
    drawCtrl.stateMachine = ctx
    drawCtrl.rendererManager = this.rendererManager
    drawCtrl.elementStore = this.elementStore
    drawCtrl.viewer = this.viewer
    drawCtrl.cursorManager = this.cursorManager
    drawCtrl.defaultAutoEdit = this.interaction.enableAutoEdit
    drawCtrl.onDrawFinish = (element, autoEdit) => {
      this.emit('draw-finish', { element })
      this.emit('element-added', { element })
      this.logger.debug('[Sketcher] draw finish:', element.type, element.id)

      if (autoEdit) {
        this.enterEdit(element)
      } else {
        this.stateMachine.transition('idle')
      }
    }

    const editCtrl = this.modifier
    editCtrl.stateMachine = ctx
    editCtrl.rendererManager = this.rendererManager
    editCtrl.elementStore = this.elementStore
    editCtrl.viewer = this.viewer
    editCtrl.cursorManager = this.cursorManager
    editCtrl.resolveStyle = (element) => this.feedback.effective(element.style, element.id)

    const hoverCtrl = this.hoverManager
    hoverCtrl.stateMachine = ctx
    hoverCtrl.rendererManager = this.rendererManager
    hoverCtrl.elementStore = this.elementStore
    hoverCtrl.cursorManager = this.cursorManager
    hoverCtrl.onHoverChange = (id) => this.applyHover(id)

    const pickerCtrl = this.picker
    pickerCtrl.elementStore = this.elementStore
    pickerCtrl.onPickResult = (evt) => {
      this.emit('pick-result', evt)
      this.logger.debug('[Sketcher] pick result:', evt.picks.length)
      this.interactionArbiter.handlePick(evt.picks)
    }
    pickerCtrl.viewer = this.viewer

    // ElementStore 的变更回调 → Renderer 刷新
    const store = this.elementStore as ElementStore
    if (typeof (store as any).onMutation !== 'undefined') {
      store.onMutation = (element: Element) => {
        this.rendererManager.render(element, this.feedback.effective(element.style, element.id))
        this.emit('element-updated', { element })
      }
    }

    this.cursorManager.bind(this.viewer)
    this.mouseEventManager.bind(this.viewer)
  }

  /** 内部事件绑定 */
  private bindInternalEvents(): void {
    // ESC → StateMachine.cancel()
    this.hotkeys.on('cancel', () => {
      this.logger.debug('[Sketcher] ESC pressed, delegating to StateMachine.cancel()')
      this.stateMachine.cancel()
    })

    // 键盘状态同步到编辑器
    this.hotkeys.on('keydown', () => {
      this.modifier.setHotkeyState(this.hotkeys.state)
    })
    this.hotkeys.on('keyup', () => {
      this.modifier.setHotkeyState(this.hotkeys.state)
    })

    // 模式切换 → 配置 MouseEventManager 优先级链
    this.stateMachine.on('mode-change', ({ prevMode, nextMode, prevSub, nextSub }) => {
      // 状态机只保存状态；控制器负责释放各自的临时资源。
      if (prevMode === 'draw') this.drawer.onModeExit(prevMode, prevSub as never)
      if (prevMode === 'edit') this.modifier.onModeExit(prevMode, prevSub as never)
      if (prevMode === 'idle' || prevMode === 'edit') {
        this.hoverManager.onModeExit(prevMode, prevSub as never)
      }

      if (nextMode === 'draw') this.drawer.onModeEnter(nextMode, nextSub as never)
      if (nextMode === 'edit') this.modifier.onModeEnter(nextMode, nextSub as never)
      if (nextMode === 'idle' || nextMode === 'edit') {
        this.hoverManager.onModeEnter(nextMode, nextSub as never)
      }

      this.configureRouter(nextMode)
      this.emit('mode-change', {
        prevMode: '',
        nextMode: nextMode,
      })

      this.logger.debug('[Sketcher] mode changed:', nextMode)
    })

    // Draw 模式取消事件
    this.stateMachine.on('cancel', () => {
      const mode = this.stateMachine.mode
      if (mode === 'draw') {
        this.drawer.exitDraw()
      } else if (mode === 'edit') {
        const sub = this.stateMachine.editSubState as string
        if (sub === 'dragging' || sub === 'inserting') {
          this.modifier.cancelCurrentDrag()
        } else {
          this.clearEditingFeedback()
          // StateMachine 只负责模式值变更，显式释放 Modifier 的辅助上下文。
          this.modifier.exitEdit()
        }
      }
    })
  }

  /**
   * 根据当前模式配置 MouseEventManager 优先级链。
   */
  private configureRouter(mode: string): void {
    const drawCtrl = this.drawer as unknown as InteractionHandler
    const editCtrl = this.modifier as unknown as InteractionHandler
    const hoverCtrl = this.hoverManager as unknown as InteractionHandler
    const pickerCtrl = this.picker as unknown as InteractionHandler

    switch (mode) {
      case 'idle':
        this.mouseEventManager.configure([pickerCtrl, hoverCtrl])
        break
      case 'draw':
        this.mouseEventManager.configure([drawCtrl])
        break
      case 'edit':
        // 编辑态只允许编辑辅助元素命中；元素级 hover 在编辑期间不参与反馈。
        this.mouseEventManager.configure([editCtrl, pickerCtrl])
        break
    }
  }

  // #endregion

  // #region 公开 API — 绘制

  /** 进入绘图模式 */
  enterDraw(opt: DrawOption): void {
    this.logger.debug('[Sketcher] enterDraw:', opt.type)
    this.interactionArbiter.beforeEnterDraw()
    this.drawer.defaultAutoEdit = this.interaction.enableAutoEdit
    this.drawer.enterDraw(opt)

    const mode = this.stateMachine.mode
    if (mode === 'draw') {
      this.configureRouter('draw')
    }
  }

  /** 退出绘图模式 */
  exitDraw(): void {
    this.logger.debug('[Sketcher] exitDraw')
    this.drawer.exitDraw()
    this.stateMachine.transition('idle')
  }

  // #endregion

  // #region 公开 API — 编辑

  /**
   * 进入编辑模式。
   *
   * 可传入已加入 `ElementStore` 的实例或元素 id，静态数据无需经过绘制流程即可编辑。
   * @returns 是否成功进入编辑（元素不存在或没有对应渲染器时返回 `false`）
   */
  enterEdit(target: Element | string): boolean {
    const element = typeof target === 'string' ? this.elementStore.get(target) : this.elementStore.get(target.id)
    if (!element) {
      this.logger.debug('[Sketcher] enterEdit: element not found', target)
      return false
    }

    // 清除进入编辑前遗留的元素悬停状态，并同步 HoverManager 的内部命中缓存。
    this.hoverManager.unhover()

    const current = this.modifier.editingElement
    if (current && current.id !== element.id) {
      this.clearEditingFeedback()
      this.modifier.exitEdit()
    }

    this.logger.debug('[Sketcher] enterEdit:', element.id)
    if (!this.modifier.enterEdit(element)) return false
    this.feedback.apply(element.id, element.editingStyle ?? this.globalStyles.editingStyle ?? resolveEditingStyle(element), 'edit')
    this.rendererManager.render(element, this.feedback.effective(element.style, element.id))
    this.configureRouter('edit')
    return true
  }

  /** 退出编辑模式 */
  exitEdit(): void {
    this.logger.debug('[Sketcher] exitEdit')
    this.clearEditingFeedback()
    this.modifier.exitEdit()
  }

  /** 清理当前编辑元素的反馈样式并恢复基础渲染。 */
  private clearEditingFeedback(): void {
    const editing = this.modifier.editingElement
    if (!editing) return
    this.feedback.clear(editing.id, 'edit')
    this.rendererManager.render(editing, this.feedback.effective(editing.style, editing.id))
  }

  // #endregion

  // #region 公开 API — 悬停/选中

  /** 主动悬停指定元素（与 UI 联动） */
  hover(id: string): void {
    if (this.stateMachine.mode === 'edit') return
    this.hoverManager.hover(id)
  }

  /** 清除当前悬停 */
  unhover(): void {
    this.hoverManager.unhover()
  }

  /** 主动选中指定元素 */
  select(id: string): void {
    if (!this.elementStore.has(id)) return

    if (this._selectedId && this._selectedId !== id) {
      this.clearSelectFeedback(this._selectedId)
    }

    const element = this.elementStore.get(id)
    if (element) {
      this.feedback.apply(id, element.selectedStyle ?? this.globalStyles.selectedStyle ?? element.style ?? {}, 'select')
      this.rendererManager.render(element, this.feedback.effective(element.style, id))
    }
    this._selectedId = id
    this.emit('select-change', { id })
  }

  /** 取消选中 */
  deselect(): void {
    if (this._selectedId) {
      this.clearSelectFeedback(this._selectedId)
      this._selectedId = null
      this.emit('select-change', { id: null })
    }
  }

  /** 应用悬停反馈（含清除上一个悬停元素的反馈并重渲染）。 */
  private applyHover(id: string | null): void {
    if (id && this.stateMachine.mode === 'edit') return
    if (this._hoveredId && this._hoveredId !== id) {
      const prev = this.elementStore.get(this._hoveredId)
      if (prev) {
        this.feedback.clear(this._hoveredId, 'hover')
        this.rendererManager.render(prev, this.feedback.effective(prev.style, prev.id))
      }
    }
    this._hoveredId = id
    if (!id) return

    const element = this.elementStore.get(id)
    if (!element) return
    this.feedback.apply(id, element.hoverStyle, 'hover')
    this.rendererManager.render(element, this.feedback.effective(element.style, id))
  }

  /** 将 Cesium 拾取结果解析为 ElementStore 中的规范元素实例。 */
  private resolvePickedElement(picks: PickResult[]): Element | null {
    for (const pick of picks) {
      const pickId = (pick as unknown as { id?: unknown }).id
      const target = this.rendererManager.resolvePickTarget?.(pickId)
      const id = target?.elementId ?? (typeof pickId === 'string' ? pickId : null)
      if (!id) continue
      const element = this.elementStore.get(id)
      if (element) return element
    }
    return null
  }

  /** 清除某元素选中反馈并重渲染。 */
  private clearSelectFeedback(id: string): void {
    const element = this.elementStore.get(id)
    if (!element) return
    this.feedback.clear(id, 'select')
    this.rendererManager.render(element, this.feedback.effective(element.style, id))
  }

  // #endregion

  // #region 公开 API — 数据 CRUD

  /** 添加元素 */
  addElement(element: Element): string {
    const id = this.elementStore.add(element)
    this.rendererManager.render(element)
    this.emit('element-added', { element })
    return id
  }

  /** 移除元素 */
  removeElement(id: string): boolean {
    const element = this.elementStore.get(id)
    if (!element) return false

    if (this._selectedId === id) this.deselect()
    if (this._hoveredId === id) this.unhover()
    if (this.modifier.editingElement?.id === id) this.exitEdit()

    this.rendererManager.remove(id)
    this.feedback.clearEntry(id)
    this.elementStore.remove(id)
    this.emit('element-removed', { element })
    return true
  }

  /** 更新元素几何（触发重渲染） */
  updateElement(element: Element): void {
    this.rendererManager.render(element, this.feedback.effective(element.style, element.id))
    this.emit('element-updated', { element })
  }

  // #endregion

  // #region 公开 API — 导入导出

  /** 从 GeoJSON 字符串导入 */
  importGeoJSON(json: string): string[] {
    const ids = this.elementStore.importGeoJSON(json)
    for (const id of ids) {
      const element = this.elementStore.get(id)
      if (element) {
        this.rendererManager.render(element)
      }
    }
    return ids
  }

  /** 导出全部元素为 GeoJSON 字符串 */
  exportGeoJSON(): string {
    return this.elementStore.exportGeoJSON()
  }

  // #endregion

  // #region 生命周期

  /** 销毁 Sketcher，清理全部资源 */
  destroy(): void {
    this.logger.debug('[Sketcher] destroying...')
    this.removeAllListeners()
    this.hotkeys.destroy()
    this.mouseEventManager.destroy()
    this.cursorManager.destroy()
    this.rendererManager.destroy()
    this.elementStore.clear()
  }

  // #endregion
}

export default Sketcher
