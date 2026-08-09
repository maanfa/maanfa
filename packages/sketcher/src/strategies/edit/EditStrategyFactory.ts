import type { ElementType } from '../../types'
import type { IEditStrategy } from './IEditStrategy'
import type { IEditContext } from '../../controllers/EditContext'
import EditPointStrategy from './EditPointStrategy'
import EditLineStrategy from './EditLineStrategy'
import EditPolygonStrategy from './EditPolygonStrategy'

/**
 * 编辑策略工厂：注入 EditContext（含按元素类型解析的常驻 elementRenderer）。
 */
class EditStrategyFactory {
  static create(type: ElementType, ctx: IEditContext): IEditStrategy {
    switch (type) {
      case 'marker':
        return new EditPointStrategy(ctx)
      case 'polyline':
        return new EditLineStrategy(ctx)
      case 'polygon':
        return new EditPolygonStrategy(ctx)
      default:
        throw new Error(`[EditStrategyFactory] Unsupported element type: ${type}`)
    }
  }
}

export default EditStrategyFactory
