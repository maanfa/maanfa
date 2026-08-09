import type Element from './element/Element'
import type { ElementStyle } from './styles'
import type { PickEventPayload } from './controllers/Picker'

/**
 * 绘制选项 — 传递给 `sketcher.enterDraw(opt)` 的参数。
 */
interface DrawOption {
  type: ElementType
  endingAction?: 'right-up' | 'double-click'
  autoEdit?: boolean
  /** 新元素的基础样式（实例级） */
  style?: ElementStyle
}

type ElementType = 'marker' | 'polyline' | 'polygon'

/**
 * 全部元素的地理包围盒（WGS84；经/纬度为度，height 为米）。
 * 对应 skill coords.md 的轴对齐包围盒（west/south = min，east/north = max）。
 */
interface Bounds {
  /** 最小经度（度） */
  west: number
  /** 最小纬度（度） */
  south: number
  /** 最大经度（度） */
  east: number
  /** 最大纬度（度） */
  north: number
  /** 最小高程（米） */
  minHeight: number
  /** 最大高程（米） */
  maxHeight: number
}

interface DrawFinishEvent {
  element: Element
}

interface ElementUpdateEvent {
  element: Element
}

interface ModeChangeEvent {
  prevMode: string
  nextMode: string
}

export type {
  DrawOption,
  ElementType,
  Bounds,
  DrawFinishEvent,
  ElementUpdateEvent,
  ModeChangeEvent,
  PickEventPayload,
}
