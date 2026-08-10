import type { Cartesian2, Cartesian3, Color } from 'cesium'

/**
 * 反馈样式层级（统一命名）。
 * 视觉优先级：edit > select > hover。
 */
type FeedbackLayer = 'hover' | 'select' | 'edit'

/**
 * 绘制中预览外观（临时渲染，不会持久化）。
 */
interface DrawPreviewAppearance {
  color: Color
  lineWidth: number
  /** 虚线样式，预览默认使用虚线 */
  dashPattern?: number
}

/**
 * 编辑辅助手柄外观。
 */
interface EditHandleStyle {
  /** 顶点手柄颜色 */
  color: Color
  /** 手柄像素大小 */
  pixelSize: number
}

interface EditHandleAppearance {
  /** 顶点辅助点外观 */
  vertex: EditHandleStyle
  /** 中点辅助点外观 */
  midpoint: EditHandleStyle
  /** 拖拽中的手柄高亮色 */
  draggingHighlight: Color
  /** hover 中的手柄高亮色 */
  hoverHighlight: Color
}

/**
 * 视觉引导线外观（如空间编辑的垂直对地线）。
 */
interface GuideLineAppearance {
  color: Color
  width: number
  dashPattern?: number
}

/**
 * 距离标签渲染数据。
 */
interface DistanceLabelInfo {
  /** 标签锚点（通常为线段中点） */
  position: Cartesian3
  /** 显示文本，如 "12.4 m" */
  text: string
}

/**
 * 距离标签外观（绘制/编辑通道共用）。
 */
interface LabelAppearance {
  font?: string
  fillColor?: Color
  outlineColor?: Color
  outlineWidth?: number
  pixelOffset?: Cartesian2
  scale?: number
  /** 标签水平锚点 */
  horizontalOrigin?: import('cesium').HorizontalOrigin
  /** 标签垂直锚点 */
  verticalOrigin?: import('cesium').VerticalOrigin
  /** 禁用深度测试距离；Infinity 表示不被地形遮挡 */
  disableDepthTestDistance?: number
}

/** 顶点辅助元素单项样式 */
interface DrawVertexStyle {
  color: Color
  pixelSize: number
}

/**
 * 绘制期顶点辅助外观。
 */
interface DrawVertexAppearance {
  /** 已放置顶点 */
  placed: DrawVertexStyle
  /** 游标幽灵顶点 */
  ghost: DrawVertexStyle
}

/**
 * 视觉引导元素。
 */
interface VisualGuide {
  positions: import('cesium').Cartesian3[]
  appearance: GuideLineAppearance
}

/**
 * 编辑辅助手柄信息。
 */
interface HandleInfo {
  type: 'vertex' | 'midpoint'
  /** 对应 Element 中的顶点索引，或中点所在段起始顶点索引 */
  index: number
  /** 手柄世界坐标 */
  position: import('cesium').Cartesian3
}

/** 绘制过程中每次刷新通用的视觉参数 */
interface RenderContext<TAppearance = Record<string, unknown>> {
  /** 模式 */
  mode: 'draw' | 'edit' | 'idle'
  /** 外观 */
  appearance: TAppearance
}

export type {
  DrawPreviewAppearance,
  EditHandleAppearance,
  EditHandleStyle,
  GuideLineAppearance,
  VisualGuide,
  HandleInfo,
  FeedbackLayer,
  DistanceLabelInfo,
  LabelAppearance,
  DrawVertexStyle,
  DrawVertexAppearance,
  RenderContext,
}
