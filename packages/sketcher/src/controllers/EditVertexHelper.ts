import { Cartesian3 } from 'cesium'
import type { Cartesian2 } from 'cesium'
import type Element from '../element/Element'
import type EditRenderChannel from '../renderer/edit/EditRenderChannel'
import type { HandleInfo } from '../renderer/types'
import type { EditMotion, InteractionFlags } from '../renderer/helpers/types'
import VertexElement from '../renderer/helpers/VertexElement'
import MidpointElement from '../renderer/helpers/MidpointElement'
import DistanceLabel from '../renderer/helpers/DistanceLabel'

/** 编辑期交互能力（绘制期则传 { interactive: false }） */
const EDIT_INTERACTION: InteractionFlags = { interactive: true, hoverable: true, selectable: true }

/**
 * 编辑期辅助管理器（短角色名，同 Drawer / Modifier 风格）：
 * 替代 EditHelperManager；统一创建/回收 VertexElement / MidpointElement / DistanceLabel，
 * 接收 Modifier 的鼠标事件透传：命中 → 选中可交互辅助元素 → 拖拽 → 上行 EditMotion。
 */
class EditVertexHelper {
  private static readonly POSITION_CACHE_LIMIT = 512
  private vertices: VertexElement[] = []
  private midpoints: MidpointElement[] = []
  private labels: DistanceLabel[] = []
  private _picked: VertexElement | MidpointElement | null = null
  private hovered: VertexElement | MidpointElement | null = null
  private dragFrom: Cartesian3 | null = null
  /** 贴地解析缓存：相机移动/悬停同步时复用未变化的辅助坐标。 */
  private positionCache = new Map<string, Cartesian3>()

  constructor(
    private readonly channel: EditRenderChannel,
    private readonly project: (pos: Cartesian3) => Cartesian2 | undefined,
    private readonly resolvePosition: (pos: Cartesian3) => Cartesian3 = (pos) => pos,
  ) {}

  /** 当前选中的辅助元素（onLeftDown 后非空；Modifier 据此判定 dragging/inserting）。 */
  get picked(): VertexElement | MidpointElement | null {
    return this._picked
  }

  /** 进入编辑：绑定元素并重建辅助元素。 */
  bind(element: Element): void {
    this.positionCache.clear()
    this.vertices = []
    this.midpoints = []
    this.labels = []
    this.sync(element)
  }

  /** Modifier 透传：leftDown → 命中并选中可交互辅助元素；未命中/不可交互返回 false（让位 Picker）。 */
  onLeftDown(screen: Cartesian2): boolean {
    const hit = this.hitTest(screen)
    if (!hit?.interactive) return false
    this._picked = hit
    this.dragFrom = Cartesian3.clone(hit.position)
    return true
  }

  /** Modifier 透传：拖动中 → 生成 EditMotion（并调用 picked.onDrag 上行，由 Modifier 应用）。 */
  onMouseMove(element: Element, to: Cartesian3): EditMotion | null {
    const picked = this._picked
    if (!picked || !this.dragFrom) return null
    const base = { elementId: element.id, from: this.dragFrom, to }
    const motion: EditMotion = picked.id.kind === 'vertex'
      ? { kind: 'vertex', handle: picked.id, ...base }
      : { kind: 'midpoint', handle: picked.id, ...base }
    picked.onDrag(motion)
    return motion
  }

  /** Modifier 透传：leftUp → 结束拖拽。 */
  onLeftUp(): void {
    this._picked = null
    this.dragFrom = null
  }

  /** Modifier 透传：ready 态悬停 → 返回悬停的辅助元素（驱动高亮与光标）。 */
  hover(screen: Cartesian2): VertexElement | MidpointElement | null {
    this.hovered = this.hitTest(screen)
    return this.hovered
  }

  /** 命中测试：仅 interactive 的辅助元素参与。 */
  hitTest(screen: Cartesian2, tolerance = 10): VertexElement | MidpointElement | null {
    for (const v of this.vertices) {
      if (v.interactive && v.hitTest(screen, tolerance)) return v
    }
    for (const m of this.midpoints) {
      if (m.interactive && m.hitTest(screen, tolerance)) return m
    }
    return null
  }

  /** 元素变更后同步：手柄位置 + 距离标签（含中点、polygon 闭合边）。 */
  sync(element: Element): void {
    const n = element.getVertexCount()
    const isPolygon = element.type === 'polygon'
    const midCount = isPolygon ? n : Math.max(0, n - 1) // line: n-1；polygon: n（含闭合边）

    this.vertices = rebuild(
      this.vertices,
      n,
      (i) => new VertexElement(i, element.getVertex(i), EDIT_INTERACTION, this.project),
    )
    this.midpoints = rebuild(
      this.midpoints,
      midCount,
      (i) => new MidpointElement(i, new Cartesian3(), EDIT_INTERACTION, this.project),
    )
    this.labels = rebuild(
      this.labels,
      midCount,
      (i) => new DistanceLabel(i, new Cartesian3(), ''),
    )

    for (const v of this.vertices) {
      v.sync(element)
      v.setPosition(this.resolveCached(v.position))
    }
    for (const m of this.midpoints) {
      m.sync(element)
      m.setPosition(this.resolveCached(m.position))
    }
    for (const l of this.labels) {
      l.sync(element)
      l.setPosition(this.resolveCached(l.position))
    }

    const handleInfos = this.toHandleInfos()
    this.channel.renderHandles(
      handleInfos,
      this.indexOf(handleInfos, this.hovered),
      this.indexOf(handleInfos, this._picked),
    )
    this.channel.renderLabels(this.labels.map((l) => l.toInfo()))
  }

  detach(): void {
    this.vertices = []
    this.midpoints = []
    this.labels = []
    this._picked = null
    this.hovered = null
    this.dragFrom = null
    this.positionCache.clear()
    this.channel.clearHandles()
    this.channel.clearLabels()
  }

  private toHandleInfos(): HandleInfo[] {
    const infos: HandleInfo[] = []
    for (const v of this.vertices) {
      infos.push({ type: 'vertex', index: v.index, position: v.position })
    }
    for (const m of this.midpoints) {
      infos.push({ type: 'midpoint', index: m.index, position: m.position })
    }
    return infos
  }

  private indexOf(
    infos: HandleInfo[],
    target: VertexElement | MidpointElement | null,
  ): number | null {
    if (!target) return null
    const idx = infos.findIndex((h) => h.type === target.id.kind && h.index === target.id.index)
    return idx === -1 ? null : idx
  }

  /** 按 ECEF 坐标缓存贴地解析结果，并限制缓存规模。 */
  private resolveCached(position: Cartesian3): Cartesian3 {
    const key = `${position.x},${position.y},${position.z}`
    const cached = this.positionCache.get(key)
    if (cached) return cached

    const resolved = Cartesian3.clone(this.resolvePosition(position))
    if (this.positionCache.size >= EditVertexHelper.POSITION_CACHE_LIMIT) {
      const oldest = this.positionCache.keys().next().value
      if (oldest !== undefined) this.positionCache.delete(oldest)
    }
    this.positionCache.set(key, resolved)
    return resolved
  }
}

function rebuild<T>(existing: T[], length: number, factory: (i: number) => T): T[] {
  const out: T[] = []
  for (let i = 0; i < length; i++) {
    out.push(existing[i] ?? factory(i))
  }
  return out
}

export default EditVertexHelper
