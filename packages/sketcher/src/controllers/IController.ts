import type { Mode } from '../state/types'
import type { DrawSubState, EditSubState } from '../state/types'

/**
 * 任务控制器接口。
 *
 * 所有 Draw/Edit/Hover/Picker 控制器均实现此接口。
 * `onModeEnter` / `onModeExit` 由 StateMachine 在模式切换时调用，
 * 各控制器自行处理激活/休眠逻辑与资源清理。
 *
 * @typeParam TEditSub - 编辑子状态类型，允许包外扩展
 */
interface IController<TEditSub extends string = EditSubState> {
  /**
   * 控制器被激活时调用。
   * @param mode - 新进入的模式
   * @param sub - 当前子状态（Idle 模式下为 `null`）
   */
  onModeEnter(mode: Mode, sub: DrawSubState | TEditSub | null): void
  /**
   * 控制器被休眠时调用，执行资源清理。
   * @param mode - 正在退出的模式
   * @param sub - 退出时的子状态
   */
  onModeExit(mode: Mode, sub: DrawSubState | TEditSub | null): void
}

export type { IController }
