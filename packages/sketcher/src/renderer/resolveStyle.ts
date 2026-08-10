import { Color } from 'cesium'
import type Element from '../element/Element'
import type { ElementStyle, ElementStyles } from '../styles'

/**
 * 解析某元素在指定状态下的生效样式。
 *
 * 选择/编辑反馈优先使用 Element 实例样式，再回退到外观类默认样式。
 * 悬停反馈只使用 Element 实例样式。
 *
 * 都未配置时返回 `undefined`（无反馈）。
 */
function resolveElementStyle(
  element: Element,
  globalStyles: ElementStyles | undefined,
  layer?: 'hover' | 'selected' | 'editing',
): ElementStyle | undefined {
  if (layer === 'hover') {
    return element.hoverStyle ?? element.style
  }
  if (layer === 'selected') {
    return element.selectedStyle ?? globalStyles?.selectedStyle ?? element.style
  }
  if (layer === 'editing') {
    return element.editingStyle ?? globalStyles?.editingStyle ?? element.style
  }
  return element.style
}

/**
 * 将反馈样式叠加到基础样式之上，得到有效样式。
 * 反馈层只覆盖其存在的子样式（line/fill/symbol/label），未配置项沿用基础样式。
 */
function mergeElementStyle(
  base: ElementStyle | undefined,
  feedback: ElementStyle | undefined,
): ElementStyle | undefined {
  if (!feedback) return base
  if (!base) return feedback
  return {
    line: feedback.line ?? base.line,
    fill: feedback.fill ?? base.fill,
    symbol: feedback.symbol ?? base.symbol,
    label: feedback.label ?? base.label,
    customShaders: feedback.customShaders ?? base.customShaders,
  }
}

/**
 * 将 css hex 颜色 + 透明度（0~1）转为 Cesium `Color`。
 * 非法 hex 时告警并回退为默认颜色，避免渲染崩溃。
 */
function hexToCesiumColor(hex: string | undefined, opacity = 1, logger?: (msg: string) => void): Color {
  if (hex === undefined) {
    return Color.fromCssColorString('#ffffff').withAlpha(opacity)
  }

  try {
    const c = Color.fromCssColorString(hex)
    if (!c) throw new Error(`invalid hex: ${hex}`)
    return c.withAlpha(clampOpacity(opacity))
  } catch {
    logger?.(`[styles] invalid color hex "${hex}", fallback to white`)
    return Color.fromCssColorString('#ffffff').withAlpha(clampOpacity(opacity))
  }
}

function clampOpacity(opacity: number): number {
  if (Number.isNaN(opacity)) return 1
  return Math.min(1, Math.max(0, opacity))
}

/**
 * 将透明度 0~1 换算为 hex 的 alpha 通道值（0~255，四舍五入）。
 */
function opacityToByte(opacity: number): number {
  return Math.round(clampOpacity(opacity) * 255)
}

export { resolveElementStyle, mergeElementStyle, hexToCesiumColor, clampOpacity, opacityToByte }
