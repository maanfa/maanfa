import { Cartesian2, Color, HorizontalOrigin, VerticalOrigin } from 'cesium'
import type { LineStyle, FillStyle, SymbolStyle } from '../styles'
import type {
  DrawPreviewAppearance,
  DrawVertexAppearance,
  EditHandleAppearance,
  LabelAppearance,
} from './types'

/**
 * 绘制期临时通道固定 key。
 */
const DRAW_CHANNEL_KEYS = {
  preview: 'draw:preview',
  draft: 'draw:draft',
  vertices: 'draw:vertices',
  labels: 'draw:labels',
} as const

/**
 * 编辑期临时通道固定 key。
 */
const EDIT_CHANNEL_KEYS = {
  handles: 'edit:handles',
  labels: 'edit:labels',
  guides: 'edit:guides',
} as const

/** 草稿元素统一临时 id（不进 ElementStore） */
const DRAFT_ELEMENT_ID = '__draft__'

/**
 * 默认外观常量（hex + opacity 形式，对应 ElementStyle 约定）。
 */

/** 绘制预览默认外观 */
const DefaultPreview: DrawPreviewAppearance = {
  color: Color.fromCssColorString('#ff4d4f'),
  lineWidth: 2,
  dashPattern: 0x0f0f,
}

/** 点元素默认颜色 */
const DefaultMarkerColor = '#ffd700'

/** 点元素默认符号样式 */
const DefaultMarker: SymbolStyle = {
  iconSize: 3,
  opacity: 1,
}

/** 线元素默认线样式 */
const DefaultPolyline: LineStyle = {
  color: '#00bfff',
  opacity: 1,
  width: 3,
}

/** 面元素默认填充样式 */
const DefaultPolygonFill: FillStyle = {
  color: '#00bfff',
  opacity: 0.3,
}

/** 面元素默认轮廓线样式 */
const DefaultPolygonOutline: LineStyle = {
  color: '#00bfff',
  opacity: 1,
  width: 2,
}

/** 编辑手柄默认外观 */
const DefaultHandles: EditHandleAppearance = {
  vertex: { color: Color.WHITE, pixelSize: 8 },
  midpoint: { color: Color.WHITE, pixelSize: 5 },
  draggingHighlight: Color.YELLOW,
  hoverHighlight: Color.CYAN,
}

/** 绘制期顶点辅助默认外观 */
const DefaultVertexAppearance: DrawVertexAppearance = {
  placed: { color: Color.WHITE, pixelSize: 8 },
  ghost: { color: Color.WHITE.withAlpha(0.5), pixelSize: 6 },
}

/** 距离标签默认外观 */
const DefaultLabelAppearance: LabelAppearance = {
  font: 'bold 13px sans-serif',
  scale: 1,
  // 以线段中点为锚点，向屏幕上方留出间距，避免文字压住几何线。
  pixelOffset: new Cartesian2(0, -8),
  horizontalOrigin: HorizontalOrigin.CENTER,
  verticalOrigin: VerticalOrigin.BOTTOM,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
}

export {
  DRAW_CHANNEL_KEYS,
  EDIT_CHANNEL_KEYS,
  DRAFT_ELEMENT_ID,
  DefaultPreview,
  DefaultMarkerColor,
  DefaultMarker,
  DefaultPolyline,
  DefaultPolygonFill,
  DefaultPolygonOutline,
  DefaultHandles,
  DefaultVertexAppearance,
  DefaultLabelAppearance,
}
