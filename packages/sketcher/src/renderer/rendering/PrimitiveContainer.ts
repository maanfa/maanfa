import type {
  GroundPolylinePrimitive,
  GroundPrimitive,
  Label,
  LabelCollection,
  PointPrimitiveCollection,
  PointPrimitive,
  Scene,
} from 'cesium'
import type { Cartesian2, Cartesian3, Color } from 'cesium'

type RenderHost = 'point' | 'ground' | 'label'

/**
 * 待挂载的标签样式描述（经 LabelCollection.add 实例化）。
 */
interface LabelOptions {
  position: Cartesian3
  text: string
  font?: string
  fillColor?: Color
  outlineColor?: Color
  outlineWidth?: number
  pixelOffset?: Cartesian2
  scale?: number
  disableDepthTestDistance?: number
}

/**
 * 待挂载的点样式描述（经 PointPrimitiveCollection.add 实例化）。
 */
interface PointPrimitiveOptions {
  position: import('cesium').Cartesian3
  color: import('cesium').Color
  pixelSize: number
  id?: string
  disableDepthTestDistance?: number
}

/**
 * 渲染产物：渲染器产出 Primitive（或点描述）并声明宿主容器，
 * 由 {@link PrimitiveContainer} 统一挂载、登记与回收。
 */
type RenderedItem =
  | {
      host: 'point'
      /** 点样式描述；容器 add 到共享 PointPrimitiveCollection 后得到真实 PointPrimitive */
      point: PointPrimitiveOptions
    }
  | {
      host: 'label'
      /** 标签样式描述；容器 add 到共享 LabelCollection 后得到真实 Label */
      label: LabelOptions
    }
  | {
      host: 'ground'
      primitive: GroundPrimitive | GroundPolylinePrimitive
    }

/**
 * Primitive 容器：按 key（元素 id 或辅助通道固定 key）去重托管渲染产物。
 *
 * - `set(key, items)`：先移除该 key 旧产物，再把新产物挂载到 scene 并登记
 * - `remove(key)`：从 scene 移除并销毁该 key 全部产物
 * - `clear()`：清空全部
 */
class PrimitiveContainer {
  private entries = new Map<
    string,
    { ground: (GroundPrimitive | GroundPolylinePrimitive)[]; points: PointPrimitive[]; labels: Label[] }
  >()

  constructor(
    private scene: Scene,
    private pointCollection: PointPrimitiveCollection,
    private labelCollection: LabelCollection,
  ) {}

  set(key: string, items: RenderedItem[]): void {
    this.remove(key)

    const root = this.scene.groundPrimitives
    const ground: (GroundPrimitive | GroundPolylinePrimitive)[] = []
    const points: PointPrimitive[] = []
    const labels: Label[] = []

    for (const item of items) {
      if (item.host === 'point') {
        const point = this.pointCollection.add(item.point)
        points.push(point)
      } else if (item.host === 'label') {
        const label = this.labelCollection.add(item.label)
        labels.push(label)
      } else {
        root.add(item.primitive)
        ground.push(item.primitive)
      }
    }

    this.entries.set(key, { ground, points, labels })
  }

  get(
    key: string,
  ): { ground: (GroundPrimitive | GroundPolylinePrimitive)[]; points: PointPrimitive[]; labels: Label[] } {
    return this.entries.get(key) ?? { ground: [], points: [], labels: [] }
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }

  remove(key: string): void {
    const entry = this.entries.get(key)
    if (!entry) return
    const root = this.scene.groundPrimitives
    for (const p of entry.ground) {
      root.remove(p)
      if (!p.isDestroyed()) p.destroy()
    }
    for (const p of entry.points) {
      this.pointCollection.remove(p)
    }
    for (const l of entry.labels) {
      this.labelCollection.remove(l)
    }
    this.entries.delete(key)
  }

  clear(): void {
    for (const key of Array.from(this.entries.keys())) {
      this.remove(key)
    }
  }
}

export type { RenderedItem, RenderHost, PointPrimitiveOptions, LabelOptions }
export default PrimitiveContainer
