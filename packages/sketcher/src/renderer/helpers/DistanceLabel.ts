import { Cartesian3 } from 'cesium'
import type Element from '../../element/Element'
import type { DistanceLabelInfo } from '../types'
import { formatDistance } from './formatDistance'
import type { IAuxElement } from './types'
import surfaceMidpoint from '../../utils/surfaceMidpoint'

/**
 * 距离标签（通用）：interactive 恒 false，绘制/编辑共用。
 * 锚点取线段中点，文本为边长（polygon 末边回绕到 0 由调用方决定）。
 */
class DistanceLabel implements IAuxElement {
  readonly id: string
  interactive = false
  hoverable = false
  selectable = false
  private _position: Cartesian3
  private _text: string

  constructor(readonly segmentIndex: number, position: Cartesian3, text: string) {
    this.id = `distance-label-${segmentIndex}`
    this._position = Cartesian3.clone(position)
    this._text = text
  }

  get position(): Cartesian3 {
    return this._position
  }

  get text(): string {
    return this._text
  }

  attach(element: Element): void {
    this.sync(element)
  }

  sync(element: Element): void {
    const n = element.getVertexCount()
    this.update(element.getVertex(this.segmentIndex), element.getVertex((this.segmentIndex + 1) % n))
  }

  detach(): void {}

  /** 按边端点重算中点与文本。 */
  update(a: Cartesian3, b: Cartesian3): void {
    this._position = surfaceMidpoint(a, b)
    this._text = formatDistance(Cartesian3.distance(a, b))
  }

  /** 设置仅用于渲染的标签位置，不修改几何数据。 */
  setPosition(position: Cartesian3): void {
    this._position = Cartesian3.clone(position)
  }

  toInfo(): DistanceLabelInfo {
    return { position: this._position, text: this._text }
  }
}

export default DistanceLabel
