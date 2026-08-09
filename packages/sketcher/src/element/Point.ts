import { Cartesian3 } from 'cesium'
import Element from './Element'

/**
 * 点元素，仅包含一个顶点。
 */
class Point extends Element {
  type: 'marker' | 'polyline' | 'polygon' = 'marker'
  private _coord: Cartesian3

  constructor(id: string, coord: Cartesian3) {
    super(id)
    this._coord = Cartesian3.clone(coord)
  }

  get coord(): Cartesian3 {
    return this._coord
  }

  get coords(): Cartesian3[] {
    return [this._coord]
  }

  validate(): boolean {
    return Cartesian3.magnitude(this._coord) > 0
  }

  getVertexCount(): number {
    return 1
  }

  getVertex(index: number): Cartesian3 {
    if (index !== 0) {
      throw new RangeError(`[Point] index out of range: ${index}`)
    }
    return this._coord
  }

  setVertex(index: number, coord: Cartesian3): void {
    if (index !== 0) {
      throw new RangeError(`[Point] index out of range: ${index}`)
    }
    this._coord = Cartesian3.clone(coord)
    this._onMutation?.(this)
  }

  insertVertex(_index: number, _coord: Cartesian3): void {
    /** 点元素不支持插入顶点，静默忽略 */
  }

  removeVertex(_index: number): void {
    /** 点元素不支持删除顶点，静默忽略 */
  }

  toPlain(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      coord: [this._coord.x, this._coord.y, this._coord.z],
      ...this.plainStyles(),
    }
  }

  static fromPlain(plain: Record<string, unknown>): Point {
    const [x, y, z] = plain.coord as number[]
    const el = new Point(plain.id as string, new Cartesian3(x, y, z))
    el.restoreStyles(plain)
    return el
  }
}

export default Point
