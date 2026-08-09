import EventEmitter from 'eventemitter3'

/**
 * 键盘修饰键实时状态快照。
 */
interface HotkeyState {
  /** Ctrl 键是否按下 */
  ctrl: boolean
  /** Alt 键是否按下 */
  alt: boolean
  /** Shift 键是否按下 */
  shift: boolean
}

type HotkeyEvents = {
  /** ESC 取消事件 */
  cancel: () => void
  /** 任意键按下，携带键名 */
  keydown: (key: string) => void
  /** 任意键抬起，携带键名 */
  keyup: (key: string) => void
}

/**
 * 键盘管理器。
 *
 * 监听 document 键盘事件，提供按键状态追踪与事件分发。
 * - `esc` 触发 `'cancel'` 事件，由 `StateMachine.cancel()` 消费
 * - `state` 属性暴露实时修饰键状态，供外部策略读取
 */
class HotkeyManager extends EventEmitter<HotkeyEvents> {
  private _ctrl = false
  private _alt = false
  private _shift = false

  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null

  constructor() {
    super()

    this.boundKeyDown = this.onKeyDown.bind(this)
    this.boundKeyUp = this.onKeyUp.bind(this)

    document.addEventListener('keydown', this.boundKeyDown)
    document.addEventListener('keyup', this.boundKeyUp)
  }

  /** 实时修饰键状态 */
  get state(): HotkeyState {
    return {
      ctrl: this._ctrl,
      alt: this._alt,
      shift: this._shift,
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    this._ctrl = e.ctrlKey
    this._alt = e.altKey
    this._shift = e.shiftKey

    this.emit('keydown', e.key)

    if (e.key === 'Escape') {
      this.emit('cancel')
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this._ctrl = e.ctrlKey
    this._alt = e.altKey
    this._shift = e.shiftKey

    this.emit('keyup', e.key)
  }

  /** 销毁键盘监听 */
  destroy(): void {
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown)
    }
    if (this.boundKeyUp) {
      document.removeEventListener('keyup', this.boundKeyUp)
    }
    this.removeAllListeners()
  }
}

export type { HotkeyState }
export default HotkeyManager
