import { Cartesian3 } from 'cesium'
import Element from './Element'

/**
 * 线元素，最少 2 个顶点，按顺序构成折线段。
 */
class Line extends Element {
  type: 'marker' | 'polyline' | 'polygon' = 'polyline'
  private _coords: Cartesian3[]

  constructor(id: string, coords: Cartesian3[]) {
    super(id)
    this._coords = coords.map((c) => Cartesian3.clone(c))
  }

  get coords(): Cartesian3[] {
    return this._coords
  }

  validate(): boolean {
    return this._coords.length >= 2
  }

  getVertexCount(): number {
    return this._coords.length
  }

  getVertex(index: number): Cartesian3 {
    if (index < 0 || index >= this._coords.length) {
      throw new RangeError(`[Line] index out of range: ${index}`)
    }
    return this._coords[index]
  }

  setVertex(index: number, coord: Cartesian3): void {
    if (index < 0 || index >= this._coords.length) {
      throw new RangeError(`[Line] index out of range: ${index}`)
    }
    this._coords[index] = Cartesian3.clone(coord)
    this._onMutation?.(this)
  }

  insertVertex(index: number, coord: Cartesian3): void {
    this._coords.splice(index, 0, Cartesian3.clone(coord))
    this._onMutation?.(this)
  }

  removeVertex(index: number): void {
    if (this._coords.length <= 2) return
    this._coords.splice(index, 1)
    this._onMutation?.(this)
  }

  /**
   * 获取所有相邻顶点之间的中点列表。
   * @returns 中点坐标数组，长度为 `vertexCount - 1`
   */
  getMidpoints(): Cartesian3[] {
    const mids: Cartesian3[] = []
    for (let i = 0; i < this._coords.length - 1; i++) {
      mids.push(Cartesian3.midpoint(this._coords[i], this._coords[i + 1], new Cartesian3()))
    }
    return mids
  }

  toPlain(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      coords: this._coords.map((c) => [c.x, c.y, c.z]),
      ...this.plainStyles(),
    }
  }

  static fromPlain(plain: Record<string, unknown>): Line {
    const coords = plain.coords as number[][]
    const el = new Line(
      plain.id as string,
      coords.map((c) => new Cartesian3(c[0], c[1], c[2])),
    )
    el.restoreStyles(plain)
    return el
  }
}

export default Line
