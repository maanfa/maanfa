/** 全局模式 */
type Mode = 'idle' | 'draw' | 'edit'

/** 绘图模式子状态 */
type DrawSubState = 'ready' | 'drawing'

/** 编辑模式子状态（包内默认） */
type EditSubState = 'ready' | 'dragging' | 'inserting'

/** 状态上下文变更事件 */
interface StateChangeEvent<TEditSub extends string = EditSubState> {
  /** 旧模式 */
  prevMode: Mode
  /** 新模式 */
  nextMode: Mode
  /** 旧的子状态 */
  prevSub: DrawSubState | TEditSub | null
  /** 新的子状态 */
  nextSub: DrawSubState | TEditSub | null
}

export type { Mode, DrawSubState, EditSubState, StateChangeEvent }
