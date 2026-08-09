import type { ElementStyle } from '../../styles'
import type { FeedbackLayer } from '../types'

interface FeedbackState {
  hover: ElementStyle | undefined
  select: ElementStyle | undefined
  edit: ElementStyle | undefined
}

/**
 * hover / select / edit 三层反馈样式叠加（visual: edit > select > hover）。
 *
 * 纯数据簿记，不含任何 Cesium 依赖，便于单测。
 * 由**外观层（Sketcher）持有**：合成有效样式后经 `renderer.render(element, style)` 传入，
 * RendererManager 不再参与反馈簿记。
 */
class FeedbackStyleStack {
  private layers = new Map<string, FeedbackState>()

  apply(id: string, style: ElementStyle | undefined, layer: FeedbackLayer): void {
    let state = this.layers.get(id)
    if (!state) {
      state = { hover: undefined, select: undefined, edit: undefined }
      this.layers.set(id, state)
    }
    state[layer] = style
  }

  clear(id: string, layer: FeedbackLayer): void {
    const state = this.layers.get(id)
    if (!state) return
    state[layer] = undefined
  }

  clearAll(layer: FeedbackLayer): void {
    for (const state of this.layers.values()) {
      state[layer] = undefined
    }
  }

  clearEntry(id: string): void {
    this.layers.delete(id)
  }

  /** 计算有效样式：基础样式 + 最高反馈层（edit > select > hover）。 */
  effective(base: ElementStyle | undefined, id: string): ElementStyle | undefined {
    const state = this.layers.get(id)
    if (!state) return base
    const feedback = state.edit ?? state.select ?? state.hover
    if (!feedback) return base
    if (!base) return feedback
    return {
      line: feedback.line ?? base.line,
      fill: feedback.fill ?? base.fill,
      symbol: feedback.symbol ?? base.symbol,
      label: feedback.label ?? base.label,
      customShaders: feedback.customShaders ?? base.customShaders,
    }
  }
}

export default FeedbackStyleStack
