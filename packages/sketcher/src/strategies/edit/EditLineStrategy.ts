import type Element from '../../element/Element'
import type { IEditStrategy } from './IEditStrategy'
import type { EditMotion } from '../../renderer/helpers/types'
import type { IElementRenderer } from '../../renderer/elements/ElementRenderer'
import type { IEditContext } from '../../controllers/EditContext'
import { checkEditSelfIntersection } from '../../utils/intersection'

/**
 * 线编辑策略 — 校验移动顶点不得导致自交叉。
 */
class EditLineStrategy implements IEditStrategy {
  constructor(private readonly context: IEditContext) {}

  get elementRenderer(): IElementRenderer {
    return this.context.elementRenderer
  }

  validate(element: Element, motion: EditMotion): boolean {
    if (motion.kind === 'midpoint') {
      // 中点拖拽 = 插入新顶点：始终允许（插入后由下次移动做自交叉检测）
      return true
    }
    return !checkEditSelfIntersection(element, motion.handle.index, motion.to)
  }
}

export default EditLineStrategy
