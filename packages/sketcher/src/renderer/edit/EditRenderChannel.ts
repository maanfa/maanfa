import {
  GeometryInstance,
  GroundPolylinePrimitive,
  GroundPolylineGeometry,
  Material,
  PolylineMaterialAppearance,
} from 'cesium'
import type PrimitiveContainer from '../rendering/PrimitiveContainer'
import type { RenderedItem } from '../rendering/PrimitiveContainer'
import type {
  DistanceLabelInfo,
  EditHandleAppearance,
  HandleInfo,
  LabelAppearance,
  VisualGuide,
} from '../types'
import { DefaultHandles, DefaultLabelAppearance, EDIT_CHANNEL_KEYS } from '../constants'

/**
 * 编辑期临时通道：手柄 / 距离标签 / 引导线，固定 key，退出编辑统一清理。
 * 由原 HelperRendererHub 拆分重命名而来（预览职责已迁至 DrawRenderChannel）。
 */
class EditRenderChannel {
  constructor(
    private readonly container: PrimitiveContainer,
    private readonly asyncGetter: () => boolean,
  ) {}

  /** 编辑手柄（顶点 + 中点，key = edit:handles，渲染前 removeAll）。 */
  renderHandles(
    handles: HandleInfo[],
    hoveredIdx: number | null,
    activeIdx: number | null,
    style?: Partial<EditHandleAppearance>,
  ): void {
    const s = { ...DefaultHandles, ...style }
    const items: RenderedItem[] = handles.map((h, i) => {
      const isHovered = hoveredIdx === i
      const isActive = activeIdx === i
      let color = h.type === 'vertex' ? s.vertex.color : s.midpoint.color
      let pixelSize = h.type === 'vertex' ? s.vertex.pixelSize : s.midpoint.pixelSize
      if (isActive) {
        color = s.draggingHighlight
      } else if (isHovered) {
        color = s.hoverHighlight
      }
      return {
        host: 'point',
        point: {
          position: h.position,
          color,
          pixelSize,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }
    })
    this.container.set(EDIT_CHANNEL_KEYS.handles, items)
  }

  clearHandles(): void {
    this.container.remove(EDIT_CHANNEL_KEYS.handles)
  }

  /** 编辑期距离标签（key = edit:labels）。 */
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
    this.container.set(EDIT_CHANNEL_KEYS.labels, items)
  }

  clearLabels(): void {
    this.container.remove(EDIT_CHANNEL_KEYS.labels)
  }

  /** 视觉引导线（key = edit:guides）。 */
  renderGuides(guides: VisualGuide[]): void {
    const items: RenderedItem[] = guides.map((g) => ({
      host: 'ground',
      primitive: new GroundPolylinePrimitive({
        geometryInstances: new GeometryInstance({
          geometry: new GroundPolylineGeometry({
            positions: g.positions,
            width: g.appearance.width,
          }),
        }),
        appearance: new PolylineMaterialAppearance({
          material: Material.fromType('Color', { color: g.appearance.color }),
        }),
        asynchronous: this.asyncGetter(),
      }),
    }))
    this.container.set(EDIT_CHANNEL_KEYS.guides, items)
  }

  clearGuides(): void {
    this.container.remove(EDIT_CHANNEL_KEYS.guides)
  }
}

export default EditRenderChannel
