import { Cartographic, Math as CesiumMath } from 'cesium'
import type Element from '../element/Element'
import type { Bounds } from '../types'
import type { IElementStore } from './IElementStore'
import { importFromGeoJSON, exportToGeoJSON } from '../utils/geojson'

/**
 * 元素仓库实现，基于 `Map<string, Element>`。
 *
 * - 真值存储与查询（增删改查、findById / count / bounds）
 * - `count()` 为 O(1) 缓存计数；`bounds()` 为记忆化缓存，随增删/突变失效重算
 * - 添加元素时注入 `_onMutation` 回调，几何变更时通知外部（通常为外观层 → renderer.render）
 */
class ElementStore implements IElementStore {
  private store = new Map<string, Element>()
  private _count = 0
  private _bounds: Bounds | null = null
  private boundsDirty = false

  /**
   * 变更通知函数。由外部设置（通常为外观层：store 变更 → renderer.render）。
   */
  onMutation?: (element: Element) => void

  add(el: Element): string {
    el._onMutation = (element: Element) => {
      this.boundsDirty = true
      this.onMutation?.(element)
    }
    const existed = this.store.has(el.id)
    this.store.set(el.id, el)
    if (!existed) {
      this._count += 1
    }
    this.boundsDirty = true
    return el.id
  }

  remove(id: string): boolean {
    const el = this.store.get(id)
    if (!el) return false
    el._onMutation = undefined
    this.store.delete(id)
    this._count -= 1
    this.boundsDirty = true
    return true
  }

  get(id: string): Element | undefined {
    return this.store.get(id)
  }

  findById(id: string): Element | undefined {
    return this.store.get(id)
  }

  getAll(): Element[] {
    return Array.from(this.store.values())
  }

  has(id: string): boolean {
    return this.store.has(id)
  }

  count(): number {
    return this._count
  }

  bounds(): Bounds | null {
    if (this.store.size === 0) return null
    if (this.boundsDirty || !this._bounds) {
      this._bounds = this.computeBounds()
      this.boundsDirty = false
    }
    return this._bounds
  }

  clear(): void {
    for (const el of this.store.values()) {
      el._onMutation = undefined
    }
    this.store.clear()
    this._count = 0
    this._bounds = null
    this.boundsDirty = false
  }

  importGeoJSON(json: string): string[] {
    const elements = importFromGeoJSON(json)
    return elements.map((el) => this.add(el))
  }

  exportGeoJSON(): string {
    return exportToGeoJSON(this.getAll())
  }

  /** 全量重算地理包围盒（仅缓存失效时调用）。 */
  private computeBounds(): Bounds {
    let west = Number.POSITIVE_INFINITY
    let south = Number.POSITIVE_INFINITY
    let east = Number.NEGATIVE_INFINITY
    let north = Number.NEGATIVE_INFINITY
    let minHeight = Number.POSITIVE_INFINITY
    let maxHeight = Number.NEGATIVE_INFINITY

    for (const el of this.store.values()) {
      for (const coord of el.coords) {
        const geo = Cartographic.fromCartesian(coord)
        west = Math.min(west, CesiumMath.toDegrees(geo.longitude))
        east = Math.max(east, CesiumMath.toDegrees(geo.longitude))
        south = Math.min(south, CesiumMath.toDegrees(geo.latitude))
        north = Math.max(north, CesiumMath.toDegrees(geo.latitude))
        minHeight = Math.min(minHeight, geo.height)
        maxHeight = Math.max(maxHeight, geo.height)
      }
    }

    return { west, south, east, north, minHeight, maxHeight }
  }
}

export default ElementStore
