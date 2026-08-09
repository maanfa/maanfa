import type { Cartesian2, PickResult, PositionedEvent } from 'cesium'
import type { Mode } from '../state/types'
import type { IController } from './IController'
import type { InteractionHandler } from '../interaction/MouseEventManager'
import type { IElementStore } from '../store/IElementStore'

interface PickEventPayload {
  action: 'left-click'
  position: Cartesian2
  picks: PickResult[]
}

type PickResultCallback = (evt: PickEventPayload) => void

class Picker implements IController, InteractionHandler {
  readonly priority = 10

  elementStore!: IElementStore
  viewer!: import('cesium').Viewer

  private leftDownPos: Cartesian2 | null = null
  private _drillPickLimit = 3
  private _enabled = true
  onPickResult?: PickResultCallback

  useDrillPick = true

  get drillPickLimit(): number {
    return this._drillPickLimit
  }
  set drillPickLimit(v: number) {
    this._drillPickLimit = v
  }

  get enabled(): boolean {
    return this._enabled
  }
  set enabled(v: boolean) {
    this._enabled = v
  }

  onModeEnter(_mode: Mode, _sub: any): void {}
  onModeExit(_mode: Mode, _sub: any): void {}

  onLeftDown(e: PositionedEvent): boolean {
    if (!this._enabled) return false
    this.leftDownPos = e.position.clone()
    return false
  }

  onLeftUp(e: PositionedEvent): boolean {
    if (!this._enabled || !this.leftDownPos) return false

    const isSamePosition = this.leftDownPos.equals(e.position)
    this.leftDownPos = null

    if (!isSamePosition) return false

    const scene = this.viewer.scene
    const picks: PickResult[] = []

    if (this.useDrillPick) {
      picks.push(...(scene.drillPick(e.position, this._drillPickLimit) as unknown as PickResult[]))
    } else {
      const singleResult = scene.pick(e.position) as PickResult | undefined
      if (singleResult) {
        picks.push(singleResult)
      }
    }

    this.onPickResult?.({
      action: 'left-click',
      position: e.position.clone(),
      picks,
    })

    return false
  }
}

export type { PickEventPayload, PickResultCallback }
export default Picker
