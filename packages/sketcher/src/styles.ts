/**
 * 颜色一律使用 css hex 字符串（如 `'#ff8c00'`），透明度一律用 `opacity`（0~1）单独表达，
 * 不鼓励 `#rrggbbaa` 混用透明度（见技能 styles.md）。
 */
type ColorHex = string

/**
 * 线样式。
 */
interface LineStyle {
  /** css hex 颜色，如 `'#ff8c00'` */
  color: ColorHex
  /** 透明度 0~1 */
  opacity: number
  /** 线宽，单位像素 */
  width: number
  /** 端帽样式（特定库支持） */
  cap?: 'butt' | 'round' | 'square'
  /** 拐角连接样式（特定库支持） */
  join?: 'miter' | 'round' | 'bevel'
  /** 虚线，如 `[8, 4]` */
  dash?: number[]
  /** 虚线起始偏移 */
  dashOffset?: number
  /** 箭头（特定库支持） */
  arrow?: 'none' | 'start' | 'end' | 'both'
}

/**
 * 面填充样式。
 */
interface FillStyle {
  /** css hex 颜色 */
  color: ColorHex
  /** 透明度 0~1 */
  opacity: number
  /** 图案填充（可选） */
  pattern?: string
}

/**
 * 符号 / 图标样式。
 */
interface SymbolStyle {
  /** url / data-uri / 库自带名 */
  icon?: string
  iconSize?: number
  /** 透明度 0~1 */
  opacity: number
  /** 旋转，弧度 */
  rotation?: number
}

/**
 * 文字样式。
 */
interface LabelStyle {
  text: string
  /** css hex 颜色 */
  color: ColorHex
  /** 透明度 0~1 */
  opacity: number
  fontSize: number
  fontFamily?: string
  /** 像素偏移 */
  offset?: [number, number]
  anchor?: 'top' | 'bottom' | 'center' | 'left' | 'right'
}

/**
 * 自定义着色器插槽（高级适配入口，默认实现可忽略）。
 */
interface ShaderSlot {
  kind: 'builtin' | 'custom'
  /** GLSL / 地图库着色器代码 */
  source?: string
  uniforms?: Record<string, unknown>
  defines?: Record<string, string | number | boolean>
}

/**
 * 元素样式聚合。四类基础样式按需组合：
 * - 立体元素（prism/cylinder/mesh）= `line` + `fill`
 * - 点状元素（marker/label/billboard）= `symbol` / `label`
 */
interface ElementStyle {
  line?: LineStyle
  fill?: FillStyle
  symbol?: SymbolStyle
  label?: LabelStyle
  /** 自定义着色器入口，地图库无原生语义时忽略并告警 */
  customShaders?: Record<string, ShaderSlot>
}

/**
 * 全局默认选择/编辑反馈样式（fallback）。悬停样式必须配置在 Element 实例上。
 * 解析优先级：实例反馈样式 > 全局默认反馈样式 > 元素自身基础样式（element.style）。
 */
interface ElementStyles {
  selectedStyle?: ElementStyle
  editingStyle?: ElementStyle
}

export type {
  ColorHex,
  LineStyle,
  FillStyle,
  SymbolStyle,
  LabelStyle,
  ShaderSlot,
  ElementStyle,
  ElementStyles,
}
