import type { IDrawStrategy } from './IDrawStrategy'
import DrawPointStrategy from './DrawPointStrategy'
import DrawLineStrategy from './DrawLineStrategy'
import DrawPolygonStrategy from './DrawPolygonStrategy'
import type { ElementStyle } from '../../styles'
import type { IDrawContext } from '../../controllers/DrawContext'

/** 绘制选项 */
type DrawOption = {
  /** 几何类型 */
  type: 'marker' | 'polyline' | 'polygon'
  /** 绘制完成后的结束动作（线/面可用） */
  endingAction?: 'right-up' | 'double-click'
  /** 是否在完成绘制后自动进入编辑模式，默认 `true` */
  autoEdit?: boolean
  /** 新元素的基础样式（实例级） */
  style?: ElementStyle
}

/**
 * 绘制策略工厂：注入 DrawContext（含按类型解析的常驻 elementRenderer）。
 */
class DrawStrategyFactory {
  static create(opt: DrawOption, context: IDrawContext): IDrawStrategy {
    switch (opt.type) {
      case 'marker':
        return new DrawPointStrategy(context)
      case 'polyline':
        return new DrawLineStrategy(context, opt.endingAction)
      case 'polygon':
        return new DrawPolygonStrategy(context, opt.endingAction)
      default:
        throw new Error(`[DrawStrategyFactory] Unsupported draw type: ${(opt as { type: string }).type}`)
    }
  }
}

export type { DrawOption }
export default DrawStrategyFactory
