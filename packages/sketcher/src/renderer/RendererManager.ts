import {
  ApproximateTerrainHeights,
  LabelCollection,
  PointPrimitiveCollection,
} from 'cesium'
import type { Viewer } from 'cesium'
import type Element from '../element/Element'
import type { ElementStyle } from '../styles'
import type { IRendererManager } from './IRendererManager'
import PrimitiveContainer from './rendering/PrimitiveContainer'
import ElementRendererHub from './rendering/ElementRendererHub'
import type { ElementRendererContext } from './elements/ElementRenderer'
import DrawRenderChannel from './draw/DrawRenderChannel'
import DrawPreviewRenderer from './draw/DrawPreviewRenderer'
import EditRenderChannel from './edit/EditRenderChannel'
import type { RenderedItem } from './rendering/PrimitiveContainer'
import PickRegistry from './rendering/PickRegistry'
import type { PickTarget } from './rendering/PickRegistry'
import { DRAFT_ELEMENT_ID } from './constants'

/**
 * CesiumJS Primitive + Appearance 适配层门面（内置唯一实现）。
 *
 * 只做“接收 Element → 产出 Primitive”与临时通道（draw / edit）托管；
 * 元素存储与查询归 ElementStore；反馈样式由外观层合成后经 render(element, style) 传入。
 */
class RendererManager implements IRendererManager {
  readonly viewer: Viewer

  useAsyncGeometry = true

  readonly elementRenderer: ElementRendererHub

  readonly draw: DrawRenderChannel

  readonly edit: EditRenderChannel

  /** 告警 logger（默认空实现） */
  warn: (msg: string) => void = () => {}

  private readonly container: PrimitiveContainer

  private readonly pointCollection: PointPrimitiveCollection

  private readonly labelCollection: LabelCollection

  private readonly pickRegistry = new PickRegistry()

  constructor(viewer: Viewer) {
    this.viewer = viewer
    this.pointCollection = new PointPrimitiveCollection()
    this.labelCollection = new LabelCollection()
    viewer.scene.primitives.add(this.pointCollection)
    viewer.scene.primitives.add(this.labelCollection)

    this.container = new PrimitiveContainer(viewer.scene, this.pointCollection, this.labelCollection)

    const ctx: ElementRendererContext = {
      useAsyncGeometry: () => this.useAsyncGeometry,
      warn: (m) => this.warn(m),
      createPickId: (elementId, part) =>
        this.pickRegistry.createPickId(elementId, part, elementId !== DRAFT_ELEMENT_ID),
    }
    this.elementRenderer = new ElementRendererHub(ctx, this.container)
    this.draw = new DrawRenderChannel(this.container, new DrawPreviewRenderer(ctx))
    this.edit = new EditRenderChannel(this.container, () => this.useAsyncGeometry)

    void ApproximateTerrainHeights._initPromise.then(() => {
      this.useAsyncGeometry = false
    })
  }

  render(element: Element, style?: ElementStyle): void {
    this.pickRegistry.removeElement(element.id)
    this.elementRenderer.render(element, style)
  }

  remove(id: string): void {
    this.elementRenderer.remove(id)
    this.pickRegistry.removeElement(id)
  }

  resolvePickTarget(pickId: unknown): PickTarget | undefined {
    return this.pickRegistry.resolve(pickId)
  }

  replaceElementItems(id: string, items: RenderedItem[]): void {
    this.container.set(id, items)
  }

  clear(): void {
    this.container.clear()
    this.draw.clear()
    this.edit.clearHandles()
    this.edit.clearLabels()
    this.edit.clearGuides()
    this.pickRegistry.clear()
  }

  destroy(): void {
    this.clear()
    this.viewer.scene.primitives.remove(this.pointCollection)
    this.viewer.scene.primitives.remove(this.labelCollection)
    if (!this.pointCollection.isDestroyed()) {
      this.pointCollection.destroy()
    }
    if (!this.labelCollection.isDestroyed()) {
      this.labelCollection.destroy()
    }
  }
}

export default RendererManager
