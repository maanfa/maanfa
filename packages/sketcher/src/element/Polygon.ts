import { Cartesian3 } from 'cesium'
import Line from './Line'

/**
 * 面元素，继承自 {@link Line}，最少 3 个顶点，首尾自动闭合。
 *
 * 中点列表在 `getMidpoints()` 中增加了最后一条边（从最后一个顶点回到第一个顶点）的中点。
 */
class Polygon extends Line {
  override type: 'marker' | 'polyline' | 'polygon' = 'polygon'

  validate(): boolean {
    return this.coords.length >= 3
  }

  removeVertex(index: number): void {
    if (this.coords.length <= 3) return
    const { coords } = this as { coords: Cartesian3[] }
    coords.splice(index, 1)
    this._onMutation?.(this)
  }

  /**
   * 获取所有相邻顶点之间的中点，包括首尾闭合边的中点。
   * @returns 中点坐标数组，长度为 `vertexCount`
   */
  getMidpoints(): Cartesian3[] {
    const mids = super.getMidpoints()
    const { coords } = this
    if (coords.length >= 3) {
      mids.push(Cartesian3.midpoint(coords[coords.length - 1], coords[0], new Cartesian3()))
    }
    return mids
  }

  toPlain(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      coords: this.coords.map((c) => [c.x, c.y, c.z]),
      ...this.plainStyles(),
    }
  }

  static fromPlain(plain: Record<string, unknown>): Polygon {
    const coords = plain.coords as number[][]
    const el = new Polygon(
      plain.id as string,
      coords.map((c) => new Cartesian3(c[0], c[1], c[2])),
    )
    el.restoreStyles(plain)
    return el
  }
}

export default Polygon
