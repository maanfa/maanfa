import type { Cartesian3 } from 'cesium'
import type PrimitiveContainer from '../rendering/PrimitiveContainer'
import type { RenderedItem } from '../rendering/PrimitiveContainer'
import type {
  DistanceLabelInfo,
  DrawPreviewAppearance,
  DrawVertexAppearance,
  LabelAppearance,
} from '../types'
import { DefaultLabelAppearance, DefaultVertexAppearance, DRAW_CHANNEL_KEYS } from '../constants'
import type DrawPreviewRenderer from './DrawPreviewRenderer'

/** 预览信息：真身未创建时的坐标结构 */
interface DrawPreviewInfo {
  /** 几何类型 */
  type: 'marker' | 'polyline' | 'polygon'
  /**
   * 本次要预览的坐标结构。
   * 子最小态传全结构（如 [p0, cursor]）；草稿态只传活动边/临时闭合（如 [pLast, cursor]）。
   */
  coords: Cartesian3[]
  /** 预览外观（默认虚线） */
  style?: Partial<DrawPreviewAppearance>
}

/**
 * 绘制期临时通道：四个固定 key，渲染前自动去重，退出绘制统一清理。
 * 内容不进 ElementStore、不参与业务状态。
 */
class DrawRenderChannel {
  constructor(
    private readonly container: PrimitiveContainer,
    private readonly previewRenderer: DrawPreviewRenderer,
  ) {}

  renderPreview(info: DrawPreviewInfo): void {
    this.container.set(DRAW_CHANNEL_KEYS.preview, this.previewRenderer.render(info))
  }

  clearPreview(): void {
    this.container.remove(DRAW_CHANNEL_KEYS.preview)
  }

  /** 将类型级渲染器产出的原语挂到草稿通道（key = draw:draft）。 */
  renderDraft(items: RenderedItem[]): void {
    this.container.set(DRAW_CHANNEL_KEYS.draft, items)
  }

  clearDraftElement(): void {
    this.container.remove(DRAW_CHANNEL_KEYS.draft)
  }

  /** 渲染绘制期顶点辅助元素（落点标记，key = draw:vertices，复用共享点集合）。 */
  renderVertices(coords: Cartesian3[], style?: Partial<DrawVertexAppearance>): void {
    const s = { ...DefaultVertexAppearance, ...style }
    const items: RenderedItem[] = coords.map((position) => ({
      host: 'point',
      point: {
        position,
        color: s.placed.color,
        pixelSize: s.placed.pixelSize,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    }))
    this.container.set(DRAW_CHANNEL_KEYS.vertices, items)
  }

  clearVertices(): void {
    this.container.remove(DRAW_CHANNEL_KEYS.vertices)
  }

  /** 渲染绘制期距离标签（key = draw:labels）。 */
  renderLabels(labels: DistanceLabelInfo[], style?: Partial<LabelAppearance>): void {
    const s = { ...DefaultLabelAppearance, ...style }
    const items: RenderedItem[] = labels.map((label) => ({
      host: 'label',
      label: {
        position: label.position,
        text: label.text,
        font: s.font,
        fillColor: s.fillColor,
        outlineColor: s.outlineColor,
        outlineWidth: s.outlineWidth,
        pixelOffset: s.pixelOffset,
        scale: s.scale,
        horizontalOrigin: s.horizontalOrigin,
        verticalOrigin: s.verticalOrigin,
        disableDepthTestDistance: s.disableDepthTestDistance,
      },
    }))
    this.container.set(DRAW_CHANNEL_KEYS.labels, items)
  }

  clearLabels(): void {
    this.container.remove(DRAW_CHANNEL_KEYS.labels)
  }

  /** 一键清理预览 + 草稿 + 顶点 + 标签。 */
  clear(): void {
    this.clearPreview()
    this.clearDraftElement()
    this.clearVertices()
    this.clearLabels()
  }
}

export type { DrawPreviewInfo }
export default DrawRenderChannel
