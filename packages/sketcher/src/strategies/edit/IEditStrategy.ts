import type Element from '../../element/Element'
import type { EditMotion } from '../../renderer/helpers/types'
import type { IElementRenderer } from '../../renderer/elements/ElementRenderer'

/**
 * 编辑策略接口。
 *
 * 负责编辑操作合法性校验；经 `EditContext` 注入常驻 elementRenderer 供按需渲染。
 */
interface IEditStrategy {
  /** 经 EditContext 注入的类型级渲染器（常驻实例，getter 转发） */
  readonly elementRenderer: IElementRenderer
  /**
   * 校验一次顶点变更是否合法。
   *
   * @param element - 被编辑的 Element
   * @param motion - 即将应用的拖拽运动量
   * @returns 合法性判定
   */
  validate(element: Element, motion: EditMotion): boolean
}

export type { IEditStrategy }
