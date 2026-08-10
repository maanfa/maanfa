import pkg from '../package.json'

// 外观类
export { default as Sketcher } from './Sketcher'

// 数据真值
export * from './element'

// 数据池
export * from './store'

// 状态机
export * from './state'

// 交互基础设施
export { MouseEventManager, HotkeyManager, CursorManager } from './interaction'
export type { InteractionHandler } from './interaction/MouseEventManager'
export type { HotkeyState } from './interaction/HotkeyManager'

// 控制器
export {
  Drawer,
  Modifier,
  GroundClampResolver,
  HoverManager,
  Picker,
  InteractionArbiter,
  DrawContext,
  DrawVertexHelper,
  EditVertexHelper,
  EditContext,
} from './controllers'
export type {
  IController,
  DrawFinishCallback,
  IDragConstraintResolver,
  IEditVisualGuideProvider,
  IDrawContext,
  IEditContext,
  PickEventPayload,
  PickResultCallback,
  InteractionPolicy,
  InteractionArbiterHost,
} from './controllers'

// 策略接口（供包外扩展）
export type { IDrawStrategy } from './strategies/draw/IDrawStrategy'
export { default as DrawStrategyFactory } from './strategies/draw/DrawStrategyFactory'
export type { DrawOption } from './strategies/draw/DrawStrategyFactory'
export type { IEditStrategy } from './strategies/edit/IEditStrategy'
export { default as EditStrategyFactory } from './strategies/edit/EditStrategyFactory'

// 渲染器
export * from './renderer'

// 样式规范
export type {
  ColorHex,
  LineStyle,
  FillStyle,
  SymbolStyle,
  LabelStyle,
  ShaderSlot,
  ElementStyle,
  ElementStyles,
} from './styles'

// 工具函数
export {
  createLogger,
  pickPosition,
  pickGlobePositionByRay,
  pickSceneEllipsoid,
  checkSelfIntersection,
  checkEditSelfIntersection,
  surfaceMidpoint,
  exportToGeoJSON,
  importFromGeoJSON,
} from './utils'

// 顶层类型
export type { DrawOption as DrawOptionPublic, ElementType } from './types'
export type { DrawFinishEvent, ElementUpdateEvent } from './types'

/**
 * Sketcher 包名，始终为 `'@maanfa/sketcher'`。
 */
export const name: string = pkg.name
/**
 * Sketcher 包版本。
 */
export const version: string = pkg.version
