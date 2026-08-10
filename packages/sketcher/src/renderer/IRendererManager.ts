import type { Viewer } from 'cesium'
import type Element from '../element/Element'
import type { ElementStyle } from '../styles'
import type ElementRendererHub from './rendering/ElementRendererHub'
import type DrawRenderChannel from './draw/DrawRenderChannel'
import type EditRenderChannel from './edit/EditRenderChannel'
import type { RenderedItem } from './rendering/PrimitiveContainer'
import type { PickTarget } from './rendering/PickRegistry'

/**
 * CesiumJS Primitive + Appearance 适配层门面。
 *
 * 职责收敛为三件事：
 * 1. 接收 Element → 产出/更新对应 Primitive（render，按 element.id 去重）
 * 2. 绘制期临时通道：预览 / 草稿 / 顶点 / 距离标签（`draw`，不进 ElementStore）
 * 3. 编辑期临时通道：手柄 / 距离标签 / 引导线（`edit`，不进 ElementStore）
 *
 * 元素存储与查询归 ElementStore（增删改查、统计、空间查询）；renderer 不提供增删改，
 * 内部仅为重渲染保留“最近一次渲染的元素引用”（render cache），不做真值簿记。
 */
interface IRendererManager {
  readonly viewer: Viewer

  /** 元素渲染注册表（类型级适配器常驻于此，get 只取引用） */
  readonly elementRenderer: ElementRendererHub
  /** 绘制期临时通道 */
  readonly draw: DrawRenderChannel
  /** 编辑期临时通道 */
  readonly edit: EditRenderChannel

  // ── Element → Primitive ──

  /** 接收 Element → 产出/更新该元素的 Primitive（按 element.id 去重） */
  render(element: Element, style?: ElementStyle): void
  /** 移除某元素的渲染原语（从 ElementStore 删除记录由外观层负责） */
  remove(id: string): void

  /** 将 Cesium pick token 解析为业务 Element 部件；自定义 renderer 可不提供。 */
  resolvePickTarget?(pickId: unknown): PickTarget | undefined

  /**
   * 低层：用给定 RenderedItem[] 替换某元素产物。
   * 供策略/扩展按需渲染（如 EditContext.renderElementWith）；正式路径走 render。
   */
  replaceElementItems(id: string, items: RenderedItem[]): void

  // ── 生命周期 ──
  clear(): void
  destroy(): void
}

export type { IRendererManager }
