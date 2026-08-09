import type { Cartesian2 } from 'cesium'
import type { DrawSubState } from '../../state/types'

/**
 * 绘制策略接口。
 *
 * 不同几何类型（点、线、面）实现自己的绘制交互逻辑。
 * 每个方法返回绘制子状态，供 Drawer 同步状态机。
 */
interface IDrawStrategy {
  /** 左键按下 */
  leftDown(pos: Cartesian2): DrawSubState
  /** 左键抬起 */
  leftUp(pos: Cartesian2): DrawSubState
  /** 鼠标移动 */
  mouseMove(start: Cartesian2, end: Cartesian2): DrawSubState
  /** 右键抬起（结束/取消绘制） */
  rightUp(pos: Cartesian2): DrawSubState
  /** 双击（结束绘制） */
  dblClick(pos: Cartesian2): DrawSubState

  /** 当前已绘制的顶点坐标列表 */
  get coords(): import('cesium').Cartesian3[]

  /** 重置策略状态，清空临时数据，回到就绪态 */
  reset(): void

  /** 取消最后一次操作（ESC 在 drawing 阶段调用） */
  cancelLast(): void

  /** 完成绘制，返回是否已满足最小顶点数要求 */
  canFinish(): boolean

  /** 当前是否存在未落点的拖拽（用于回退到 ready） */
  get hasActiveDrag(): boolean
}

export type { IDrawStrategy }
