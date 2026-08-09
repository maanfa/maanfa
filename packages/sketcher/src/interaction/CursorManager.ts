import type { Viewer } from 'cesium'

type CursorEntry = {
  cursor: string
  priority: number
}

/**
 * 游标管理器 — 优先级调度。
 *
 * 多个控制器可能同时想修改画布游标（如 Editor 的 handle 命中与 Hover 的 element 命中）。
 * 取当前所有已注册游标中优先级最高者应用到 `viewer.canvas.style.cursor`。
 *
 * 支持外部锁定：`cursorOverride` 非空时忽略所有内部注册，直接使用覆盖值。
 */
class CursorManager {
  private entries = new Map<string, CursorEntry>()
  private _canvas: HTMLCanvasElement | null = null
  private _cursorOverride: string | null = null

  /**
   * 绑定 Viewer 画布。
   */
  bind(viewer: Viewer): void {
    this._canvas = viewer.canvas
  }

  /** 外部游标覆盖（非空时锁定） */
  get cursorOverride(): string | null {
    return this._cursorOverride
  }
  set cursorOverride(v: string | null) {
    this._cursorOverride = v
    this.flush()
  }

  /**
   * 注册游标设置。
   * @param id - 注册者标识符，用于后续 release
   * @param cursor - CSS cursor 值，传递 `'default'` 表示释放
   * @param priority - 优先级，数字越大越优先显示
   */
  register(id: string, cursor: string, priority: number): void {
    this.entries.set(id, { cursor, priority })
    this.flush()
  }

  /**
   * 释放指定注册者的游标设置。
   */
  release(id: string): void {
    this.entries.delete(id)
    this.flush()
  }

  /**
   * 将当前最高优先级游标应用到画布。
   */
  private flush(): void {
    if (!this._canvas) return

    if (this._cursorOverride) {
      this._canvas.style.cursor = this._cursorOverride
      return
    }

    if (this.entries.size === 0) {
      this._canvas.style.cursor = 'auto'
      return
    }

    let best: CursorEntry | undefined
    for (const entry of this.entries.values()) {
      if (!best || entry.priority > best.priority) {
        best = entry
      }
    }

    this._canvas.style.cursor = best!.cursor
  }

  /** 销毁，恢复默认游标 */
  destroy(): void {
    this.entries.clear()
    if (this._canvas) {
      this._canvas.style.cursor = 'auto'
    }
    this._canvas = null
  }
}

export default CursorManager
