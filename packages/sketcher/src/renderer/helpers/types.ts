import type { Cartesian2, Cartesian3 } from 'cesium'
import type Element from '../../element/Element'

/**
 * 手柄编号：编辑期间稳定不变，作为程序化寻址句柄。
 */
type HandleId =
  | { kind: 'vertex'; index: number }
  | { kind: 'midpoint'; index: number }

/**
 * 拖拽运动量：辅助元素 → Modifier → EditStrategy（skill editing-helpers.md §5）。
 */
type EditMotion =
  | {
      kind: 'vertex'
      elementId: string
      handle: { kind: 'vertex'; index: number }
      from: Cartesian3
      to: Cartesian3
    }
  | {
      kind: 'midpoint'
      elementId: string
      handle: { kind: 'midpoint'; index: number }
      from: Cartesian3
      to: Cartesian3
    }

/**
 * 交互能力标志：构造时注入，绘制期全 false，编辑期开启。
 */
interface InteractionFlags {
  /** 是否参与交互（悬停 / 点击选中 / 拖拽）；绘制期 false，编辑期 true */
  interactive: boolean
  /** 可悬停高亮（interactive 时生效） */
  hoverable?: boolean
  /** 可点击选中（二级精确编辑入口） */
  selectable?: boolean
}

/** 辅助元素公共能力（不含 id 类型差异） */
interface IAuxElementBase {
  /** 是否参与交互（绘制期 false，编辑期 true） */
  interactive: boolean
  /** 可悬停高亮 */
  hoverable: boolean
  /** 可点击选中（精确编辑入口） */
  selectable: boolean
  attach(element: Element): void
  sync(element: Element): void
  detach(): void
}

/**
 * 辅助元素统一契约：attach / sync / detach + 交互字段（skill IHelper + IHandle 合并）。
 */
interface IAuxElement extends IAuxElementBase {
  readonly id: string
}

/**
 * 可交互辅助元素（interactive=true 时由管理器启用命中与事件）。
 */
interface IAuxHandle extends IAuxElementBase {
  readonly id: HandleId
  hitTest(screen: Cartesian2, tolerance: number): boolean
  onHover?(entered: boolean): void
  onSelect?(selected: boolean): void
  onDrag?(motion: EditMotion): void
}

export type { HandleId, EditMotion, InteractionFlags, IAuxElement, IAuxHandle }
