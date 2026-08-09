import type Element from '../../element/Element'
import type { IEditStrategy } from './IEditStrategy'
import type { EditMotion } from '../../renderer/helpers/types'
import type { IElementRenderer } from '../../renderer/elements/ElementRenderer'
import type { IEditContext } from '../../controllers/EditContext'
import { checkEditSelfIntersection } from '../../utils/intersection'

/**
 * 面编辑策略 — 校验移动顶点不得导致自交叉，且顶点数不小于 3。
 */
class EditPolygonStrategy implements IEditStrategy {
  constructor(private readonly context: IEditContext) {}

  get elementRenderer(): IElementRenderer {
    return this.context.elementRenderer
  }

  validate(element: Element, motion: EditMotion): boolean {
    if (motion.kind === 'midpoint') {
      return true
    }
    // 移动不改变顶点数，只需检测自交叉
    return !checkEditSelfIntersection(element, motion.handle.index, motion.to)
  }
}

export default EditPolygonStrategy
