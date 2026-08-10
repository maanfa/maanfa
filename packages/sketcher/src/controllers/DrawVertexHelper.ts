import { Cartesian3 } from 'cesium'
import type DrawRenderChannel from '../renderer/draw/DrawRenderChannel'
import type { DistanceLabelInfo, DrawVertexAppearance, LabelAppearance } from '../renderer/types'
import VertexElement from '../renderer/helpers/VertexElement'
import { formatDistance } from '../renderer/helpers/formatDistance'
import surfaceMidpoint from '../utils/surfaceMidpoint'

interface DrawVertexSyncOptions {
  /** 几何类型：polygon 时额外渲染闭合边 / 临时闭合边标签 */
  type: 'polyline' | 'polygon'
  /** 可选：活动边（last placed → cursor）标签 */
  cursor?: Cartesian3
  style?: Partial<DrawVertexAppearance & LabelAppearance>
}

/**
 * 绘制期辅助管理器（短角色名，同 Drawer / Modifier 风格）：
 * 管理辅助元素（VertexElement + DistanceLabel，interactive=false），
 * 不进 ElementStore；进入绘制创建、退出销毁。
 */
class DrawVertexHelper {
  private vertices: VertexElement[] = []

  constructor(private readonly channel: DrawRenderChannel) {}

  /** 同步绘制期辅助：已放置顶点 → 顶点标记 + 距离标签（polygon 含闭合边）。 */
  sync(coords: Cartesian3[], opts?: DrawVertexSyncOptions): void {
    // 1) 顶点辅助元素：按索引复用，只更新位置（interactive=false）
    this.vertices = coords.map((c, i) => {
      const v = this.vertices[i] ?? new VertexElement(i, c, { interactive: false })
      v.setPosition(c)
      return v
    })
    this.vertices.length = coords.length

    this.channel.renderVertices(coords, opts?.style)

    // 2) 距离标签：已放置边（coords.length - 1 条）；polygon 闭合边；活动边 / 临时闭合边可选
    const infos: DistanceLabelInfo[] = []
    for (let i = 0; i < coords.length - 1; i++) {
      infos.push(this.labelInfo(i, coords[i], coords[i + 1]))
    }
    const isPolygon = opts?.type === 'polygon'
    if (isPolygon && !opts?.cursor && coords.length >= 3) {
      // 闭合边：最后已放置点 → 首点（无游标时草稿即正式闭合多边形）
      infos.push(this.labelInfo(coords.length - 1, coords[coords.length - 1], coords[0]))
    }
    if (opts?.cursor && coords.length >= 1) {
      // 活动边：最后已放置点 → 游标
      infos.push(this.labelInfo(coords.length - 1, coords[coords.length - 1], opts.cursor))
      if (isPolygon && coords.length >= 2) {
        // 临时闭合边：游标 → 首点
        infos.push(this.labelInfo(coords.length, opts.cursor, coords[0]))
      }
    }
    this.channel.renderLabels(infos, opts?.style)
  }

  clear(): void {
    this.vertices = []
    this.channel.clearVertices()
    this.channel.clearLabels()
  }

  private labelInfo(segmentIndex: number, a: Cartesian3, b: Cartesian3): DistanceLabelInfo {
    const position = surfaceMidpoint(a, b)
    return { position, text: formatDistance(Cartesian3.distance(a, b)) }
  }
}

export default DrawVertexHelper
