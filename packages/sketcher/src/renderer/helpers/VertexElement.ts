import { Cartesian2, Cartesian3 } from 'cesium'
import type Element from '../../element/Element'
import type { EditMotion, HandleId, IAuxHandle, InteractionFlags } from './types'

/**
 * 顶点辅助元素（通用）：绘制/编辑共用同一类。
 *
 * - 绘制期：`interactive=false`，仅展示落点（setPosition 直接定位）；
 * - 编辑期：`interactive=true`，可命中、悬停、选中、拖拽（sync 从元素取坐标）。
 */
class VertexElement implements IAuxHandle {
  readonly id: HandleId
  interactive: boolean
  hoverable: boolean
  selectable: boolean
  private _position: Cartesian3

  constructor(
    readonly index: number,
    position: Cartesian3,
    flags: InteractionFlags,
    private readonly project?: (pos: Cartesian3) => Cartesian2 | undefined,
  ) {
    this.id = { kind: 'vertex', index }
    this.interactive = flags.interactive
    this.hoverable = flags.hoverable ?? flags.interactive
    this.selectable = flags.selectable ?? flags.interactive
    this._position = Cartesian3.clone(position)
  }

  get position(): Cartesian3 {
    return this._position
  }

  /** 绘制期：直接设置坐标（无 Element 场景）。 */
  setPosition(position: Cartesian3): void {
    this._position = Cartesian3.clone(position)
  }

  attach(element: Element): void {
    this.sync(element)
  }

  /** 编辑期：从元素同步坐标。 */
  sync(element: Element): void {
    this._position = Cartesian3.clone(element.getVertex(this.index))
  }

  detach(): void {}

  /** 命中测试（仅 interactive 时由管理器调用）。 */
  hitTest(screen: Cartesian2, tolerance: number): boolean {
    if (!this.interactive || !this.project) return false
    const p = this.project(this.position)
    return p ? Cartesian2.distance(p, screen) <= tolerance : false
  }

  onHover(_entered: boolean): void {}

  onSelect(_selected: boolean): void {}

  onDrag(_motion: EditMotion): void {}
}

export default VertexElement
