import type { ElementStyle } from '@maanfa/sketcher'

/**
 * 绘制工具配置表：点 / 线 / 面 各自独立样式。
 * 颜色、线宽、透明度统一在这里维护，DrawForm 按类型取表项注入 enterDraw。
 */
interface DrawTypePreset {
  /** 面板按钮文案 */
  label: string
  /** 该类型绘制时注入的实例样式 */
  style: ElementStyle
}

const DRAW_TYPE_PRESETS: Record<'marker' | 'polyline' | 'polygon', DrawTypePreset> = {
  marker: {
    label: '点',
    style: {
      line: { color: '#ff8c00', opacity: 1, width: 3 },
      symbol: { iconSize: 6, opacity: 1 },
    },
  },
  polyline: {
    label: '线',
    style: {
      line: { color: '#1677ff', opacity: 0.9, width: 3 },
    },
  },
  polygon: {
    label: '面',
    style: {
      line: { color: '#13c2c2', opacity: 0.9, width: 2 },
      fill: { color: '#13c2c2', opacity: 0.25 },
    },
  },
}

export type { DrawTypePreset }
export default DRAW_TYPE_PRESETS
