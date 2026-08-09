import EventEmitter from 'eventemitter3'
import type { Mode, DrawSubState, EditSubState, StateChangeEvent } from './types'

type StateMachineEvents<TEditSub extends string = EditSubState> = {
  'mode-change': (evt: StateChangeEvent<TEditSub>) => void
  'state-change': (evt: StateChangeEvent<TEditSub>) => void
  /** esc 触发取消 */
  cancel: () => void
}

/**
 * 状态上下文 — 内部状态机。
 *
 * 管理 Sketcher 的全局模式与模式子状态。
 * 支持泛型扩展编辑子状态，允许包外自定义编辑阶段。
 *
 * @typeParam TEditSub - 编辑模式的子状态联合类型，默认 {@link EditSubState}
 */
class StateMachine<TEditSub extends string = EditSubState> extends EventEmitter<
  StateMachineEvents<TEditSub>
> {
  private _mode: Mode = 'idle'
  private _drawSubState: DrawSubState = 'ready'
  private _editSubState: TEditSub = 'ready' as TEditSub

  /** 当前全局模式 */
  get mode(): Mode {
    return this._mode
  }

  /** 绘图子状态 */
  get drawSubState(): DrawSubState {
    return this._drawSubState
  }

  /** 编辑子状态 */
  get editSubState(): TEditSub {
    return this._editSubState
  }

  /** 当前有效的子状态（按当前模式返回对应子状态） */
  get currentSub(): DrawSubState | TEditSub | null {
    if (this._mode === 'draw') return this._drawSubState
    if (this._mode === 'edit') return this._editSubState
    return null
  }

  /**
   * 切换全局模式。
   * 若目标模式与当前相同则忽略。
   */
  transition(mode: Mode): void {
    if (this._mode === mode) return

    const prevMode = this._mode
    const prevSub = this.currentSub

    this._mode = mode
    this._drawSubState = 'ready'
    this._editSubState = 'ready' as TEditSub

    const evt: StateChangeEvent<TEditSub> = {
      prevMode,
      nextMode: mode,
      prevSub,
      nextSub: this.currentSub,
    }

    this.emit('mode-change', evt)
    this.emit('state-change', evt)
  }

  /**
   * 设置绘图子状态。
   * 仅在当前模式为 `'draw'` 时生效。
   */
  setDrawSubState(sub: DrawSubState): void {
    if (this._mode !== 'draw') return
    if (this._drawSubState === sub) return

    const prevSub = this._drawSubState
    this._drawSubState = sub

    this.emit('state-change', {
      prevMode: this._mode,
      nextMode: this._mode,
      prevSub,
      nextSub: sub,
    })
  }

  /**
   * 设置编辑子状态。
   * 仅在当前模式为 `'edit'` 时生效。
   */
  setEditSubState(sub: TEditSub): void {
    if (this._mode !== 'edit') return
    if (this._editSubState === sub) return

    const prevSub = this._editSubState
    this._editSubState = sub

    this.emit('state-change', {
      prevMode: this._mode,
      nextMode: this._mode,
      prevSub,
      nextSub: sub,
    })
  }

  /**
   * ESC 取消处理。
   *
   * - Draw.Drawing → 恢复到 Ready（回退拖拽起始形状）
   * - Draw.Ready   → 退出绘制模式（回到 Idle）
   * - Edit.Dragging / Inserting → 恢复到 Ready（取消编辑拖拽）
   * - Edit.Ready   → 退出编辑模式（回到 Idle）
   */
  cancel(): void {
    if (this._mode === 'draw') {
      if (this._drawSubState === 'drawing') {
        this.emit('cancel')
        this.setDrawSubState('ready')
      } else {
        this.emit('cancel')
        this.transition('idle')
      }
    } else if (this._mode === 'edit') {
      const sub = this._editSubState as string
      if (sub === 'dragging' || sub === 'inserting') {
        this.emit('cancel')
        this.setEditSubState('ready' as TEditSub)
      } else {
        this.emit('cancel')
        this.transition('idle')
      }
    }
  }
}

export default StateMachine
