import { Cartesian3 } from 'cesium'
import type { ElementType } from '../types'
import type { ElementStyle } from '../styles'

/**
 * 几何元素抽象基类。
 *
 * 所有可绘制、可编辑、可存储的几何对象均继承自此类。
 * 内部维护一个 `_onMutation` 回调，由 {@link IElementStore} 在添加时注入，
 * 当元素几何或样式发生变更时通知渲染器刷新。
 */
abstract class Element {
  /** 元素唯一标识符，由 ElementStore 在添加时分配 */
  readonly id: string
  /** 元素类型字面量 */
  abstract type: ElementType

  /** 元素自身基础样式（实例级） */
  style?: ElementStyle
  /** 悬停反馈样式（实例级） */
  hoverStyle?: ElementStyle
  /** 选中反馈样式（实例级） */
  selectedStyle?: ElementStyle
  /** 编辑反馈样式（实例级） */
  editingStyle?: ElementStyle

  /**
   * 变更回调。当 `setVertex`、`insertVertex`、`removeVertex`、`setStyles` 被调用后，
   * ElementStore 通过此回调通知 Renderer 刷新。
   */
  _onMutation?: (element: Element) => void

  constructor(id: string) {
    this.id = id
  }

  /**
   * 获取指定状态的样式，按反馈层级回退：
   * - `hover` → hoverStyle ?? style
   * - `selected` → selectedStyle ?? style
   * - `editing` → editingStyle ?? style
   * - 缺省 → 返回基础样式 `style`
   */
  getStyleFor(state?: 'hover' | 'selected' | 'editing'): ElementStyle | undefined {
    if (state === 'hover') return this.hoverStyle ?? this.style
    if (state === 'selected') return this.selectedStyle ?? this.style
    if (state === 'editing') return this.editingStyle ?? this.style
    return this.style
  }

  /** 合并更新实例样式，并通知变更。 */
  setStyles(partial: {
    style?: ElementStyle
    hoverStyle?: ElementStyle
    selectedStyle?: ElementStyle
    editingStyle?: ElementStyle
  }): void {
    if (partial.style !== undefined) this.style = partial.style
    if (partial.hoverStyle !== undefined) this.hoverStyle = partial.hoverStyle
    if (partial.selectedStyle !== undefined) this.selectedStyle = partial.selectedStyle
    if (partial.editingStyle !== undefined) this.editingStyle = partial.editingStyle
    this._onMutation?.(this)
  }

  /** 校验当前几何数据是否合法（如线至少2个顶点） */
  abstract validate(): boolean
  /** 获取顶点数量 */
  abstract getVertexCount(): number
  /** 获取第 `index` 个顶点坐标 */
  abstract getVertex(index: number): Cartesian3
  /** 更新第 `index` 个顶点坐标，编辑拖拽时调用 */
  abstract setVertex(index: number, coord: Cartesian3): void
  /** 在第 `index` 位置插入新顶点，编辑中点拖拽时调用 */
  abstract insertVertex(index: number, coord: Cartesian3): void
  /** 删除第 `index` 个顶点 */
  abstract removeVertex(index: number): void
  /** 获取全部顶点坐标（按绘制顺序） */
  abstract get coords(): Cartesian3[]

  /**
   * 深拷贝克隆当前元素。
   * 默认仅深拷贝坐标数组，样式属性不由 Element 持有（由 Renderer 外部管理）。
   */
  cloneCoords(): Cartesian3[] {
    return this.coords.map((c) => Cartesian3.clone(c))
  }

  /** 导出为可序列化的纯数据对象，供 ElementStore / GeoJSON 导出使用 */
  abstract toPlain(): Record<string, unknown>

  /** 序列化实例样式（供子类 toPlain 复用） */
  protected plainStyles(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    if (this.style !== undefined) out.style = this.style
    if (this.hoverStyle !== undefined) out.hoverStyle = this.hoverStyle
    if (this.selectedStyle !== undefined) out.selectedStyle = this.selectedStyle
    if (this.editingStyle !== undefined) out.editingStyle = this.editingStyle
    return out
  }

  /** 从纯数据恢复实例样式（供子类 fromPlain 复用） */
  protected restoreStyles(plain: Record<string, unknown>): void {
    if (typeof plain.style === 'object' && plain.style !== null) {
      this.style = plain.style as ElementStyle
    }
    if (typeof plain.hoverStyle === 'object' && plain.hoverStyle !== null) {
      this.hoverStyle = plain.hoverStyle as ElementStyle
    }
    if (typeof plain.selectedStyle === 'object' && plain.selectedStyle !== null) {
      this.selectedStyle = plain.selectedStyle as ElementStyle
    }
    if (typeof plain.editingStyle === 'object' && plain.editingStyle !== null) {
      this.editingStyle = plain.editingStyle as ElementStyle
    }
  }
}

export default Element
