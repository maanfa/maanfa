import type Element from '../../element/Element'
import type { IEditStrategy } from './IEditStrategy'
import type { EditMotion } from '../../renderer/helpers/types'
import type { IElementRenderer } from '../../renderer/elements/ElementRenderer'
import type { IEditContext } from '../../controllers/EditContext'

/**
 * 点编辑策略 — 点只有一个顶点，无自交叉问题，始终合法。
 */
class EditPointStrategy implements IEditStrategy {
  constructor(private readonly context: IEditContext) {}

  get elementRenderer(): IElementRenderer {
    return this.context.elementRenderer
  }

  validate(_element: Element, _motion: EditMotion): boolean {
    return true
  }
}

export default EditPointStrategy
