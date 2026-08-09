import { Cartesian2, Cartesian3 } from 'cesium'
import type Element from '../../element/Element'
import type { EditMotion, HandleId, IAuxHandle, InteractionFlags } from './types'

/**
 * 中点辅助元素（通用）：
 * 编辑期 `interactive=true`，拖拽 = 在 `index→index+1` 处插入新顶点；
 * polygon 末边回绕到 0。
 */
class MidpointElement implements IAuxHandle {
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
    this.id = { kind: 'midpoint', index }
    this.interactive = flags.interactive
    this.hoverable = flags.hoverable ?? flags.interactive
    this.selectable = flags.selectable ?? flags.interactive
    this._position = Cartesian3.clone(position)
  }

  get position(): Cartesian3 {
    return this._position
  }

  attach(element: Element): void {
    this.sync(element)
  }

  /** 编辑期：位置 = 边中点（polygon 末边回绕到 0）。 */
  sync(element: Element): void {
    const n = element.getVertexCount()
    const a = element.getVertex(this.index)
    const b = element.getVertex((this.index + 1) % n)
    this._position = Cartesian3.midpoint(a, b, new Cartesian3())
  }

  detach(): void {}

  hitTest(screen: Cartesian2, tolerance: number): boolean {
    if (!this.interactive || !this.project) return false
    const p = this.project(this.position)
    return p ? Cartesian2.distance(p, screen) <= tolerance : false
  }

  onHover(_entered: boolean): void {}

  onSelect(_selected: boolean): void {}

  onDrag(_motion: EditMotion): void {}
}

export default MidpointElement
