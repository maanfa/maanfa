import type { PickResult } from 'cesium'
import type Element from '../element/Element'
import type { Mode } from '../state/types'

/**
 * Sketcher 的跨控制器交互策略。
 *
 * 绘制与编辑始终互斥，不提供关闭该约束的开关。
 */
interface InteractionPolicy {
  /** 绘制完成后是否自动进入编辑，默认 `true`。 */
  enableAutoEdit: boolean
  /** 空闲态点击元素后是否进入编辑，默认 `false`。 */
  enablePickToEdit: boolean
  /** 编辑态点击空白处是否退出编辑，默认 `true`。 */
  enableBlankClickExitEdit: boolean
}

interface InteractionArbiterHost {
  readonly mode: Mode
  readonly editingElement: Element | null
  resolvePickedElement(picks: PickResult[]): Element | null
  enterEdit(element: Element): boolean
  exitEdit(): void
}

/**
 * 行为仲裁器：把 Picker 产生的意图转换为 Sketcher 的模式操作。
 *
 * Picker 只负责拾取，Drawer / Modifier 只负责各自交互；本类集中维护
 * “点选进入编辑、空白退出编辑、绘制打断编辑”等跨控制器规则。
 */
class InteractionArbiter {
  constructor(
    private readonly host: InteractionArbiterHost,
    readonly policy: InteractionPolicy,
  ) {}

  /** 处理一次画布点击结果。 */
  handlePick(picks: PickResult[]): void {
    const element = this.host.resolvePickedElement(picks)
    if (element) {
      if (this.host.mode === 'edit' || (this.host.mode === 'idle' && this.policy.enablePickToEdit)) {
        this.host.enterEdit(element)
      }
      return
    }

    if (this.host.mode === 'edit' && this.policy.enableBlankClickExitEdit) {
      this.host.exitEdit()
    }
  }

  /** 进入绘制前固定退出编辑，保证两种交互上下文不并存。 */
  beforeEnterDraw(): void {
    if (this.host.mode === 'edit' || this.host.editingElement) {
      this.host.exitEdit()
    }
  }
}

export type { InteractionPolicy, InteractionArbiterHost }
export default InteractionArbiter
