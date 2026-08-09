import type Element from '../element/Element'
import type { Bounds } from '../types'

/**
 * 元素仓库接口。
 *
 * 定义几何数据真值的 CRUD 操作与 GeoJSON 导入导出。
 * 默认实现为基于 `Map` 的 {@link ElementStore}，
 * 包外可替换为支持 LRU、持久化等高级存储的第三方实现。
 */
interface IElementStore {
  /**
   * 添加一个元素。
   * 分配唯一 `id`（若已有则保留），注入 `_onMutation` 回调。
   * @returns 元素的 `id`
   */
  add(el: Element): string

  /** 根据 `id` 移除元素，返回是否成功 */
  remove(id: string): boolean

  /** 根据 `id` 获取元素 */
  get(id: string): Element | undefined

  /** 获取全部元素 */
  getAll(): Element[]

  /** 判断 `id` 是否存在 */
  has(id: string): boolean

  /** 按 id 查找（skill 命名；`get` 保留作兼容别名） */
  findById(id: string): Element | undefined

  /** 元素总数（缓存计数，O(1)） */
  count(): number

  /** 全部元素地理包围盒（缓存，随变更失效重算；无元素返回 null） */
  bounds(): Bounds | null

  /** 清空全部元素 */
  clear(): void

  /**
   * 从 GeoJSON FeatureCollection 字符串导入元素。
   * @returns 导入后元素的 `id` 数组
   */
  importGeoJSON(json: string): string[]

  /** 导出全部元素为 GeoJSON FeatureCollection 字符串 */
  exportGeoJSON(): string
}

export type { IElementStore }
