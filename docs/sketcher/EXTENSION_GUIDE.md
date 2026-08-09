# Sketcher 扩展示例

本文档展示包外扩展方式。内置实现可直接使用；仅在需要定制时替换对应接口。

## 1. 自定义 ElementStore

实现 `IElementStore`（add / remove / get / getAll / has / findById / count / bounds / clear /
importGeoJSON / exportGeoJSON），构造时注入：

```ts
import { Sketcher } from '@maanfa/sketcher'
import type { IElementStore, Element } from '@maanfa/sketcher'

class LRUElementStore implements IElementStore {
  // add 时需注入变更回调，保证真值变更驱动渲染
  add(el: Element): string {
    el._onMutation = (element) => this.onMutation?.(element)
    /* ... */
    return el.id
  }
  // 其余方法按接口实现
}

const sketcher = new Sketcher(viewer, { elementStore: new LRUElementStore() })
```

## 2. 扩展渲染器（推荐入口）

内置类型级渲染器常驻，外观定制走 `ElementStyle`；需要新增元素类型或自定义原语时，
经 `ElementRendererHub.register(type, renderer)` 注册：

```ts
import { Color } from 'cesium'
import type { IElementRenderer, Element, ElementStyle, RenderedItem } from '@maanfa/sketcher'

class BillboardRenderer implements IElementRenderer {
  render(element: Element, style?: ElementStyle): RenderedItem[] {
    return [{
      host: 'point',
      point: { position: element.coords[0], color: Color.WHITE, pixelSize: 10 },
    }]
  }
}

sketcher.rendererManager.elementRenderer.register('marker', new BillboardRenderer())
```

## 3. 替换 RendererManager

`IRendererManager` 只做 `render` / `remove` / `replaceElementItems` + `draw` / `edit` 临时通道。
整体替换需要同时提供 `elementRenderer`（含 `get`）、两个通道与生命周期：

```ts
import { RendererManager } from '@maanfa/sketcher'

class MyRendererManager extends RendererManager {
  render(element: Element, style?: ElementStyle): void {
    // 自定义渲染逻辑，或 super.render(element, style)
  }
}

const sketcher = new Sketcher(viewer, { rendererManager: new MyRendererManager(viewer) })
```

> 大多数场景用 §2 注册渲染器即可，无需整体替换。

## 4. 自定义拖拽约束

替换 `Modifier.dragResolver`，控制编辑拖拽的取点逻辑：

```ts
import { pickPosition } from '@maanfa/sketcher'
import type { IDragConstraintResolver, HotkeyState } from '@maanfa/sketcher'

class SpatialDragResolver implements IDragConstraintResolver {
  resolve(position: Cartesian2, keyboard: HotkeyState): Cartesian3 | undefined {
    const ground = pickPosition(sketcher.viewer, position)
    if (!ground) return undefined
    // keyboard.ctrl / keyboard.alt / keyboard.shift 可改变取点平面或轴向
    return ground
  }
}

sketcher.modifier.dragResolver = new SpatialDragResolver()
```

## 5. 自定义编辑视觉引导

实现 `IEditVisualGuideProvider`，渲染对地线、轴向线等辅助线：

```ts
import type { IEditVisualGuideProvider, VisualGuide, Element } from '@maanfa/sketcher'
import { Color } from 'cesium'

class VerticalGuideProvider implements IEditVisualGuideProvider {
  getGuides(element: Element): VisualGuide[] {
    return element.coords.map((coord) => ({
      positions: [coord, surfacePoint(coord)],
      appearance: { color: Color.WHITE.withAlpha(0.4), width: 1 },
    }))
  }
}

sketcher.modifier.guideProvider = new VerticalGuideProvider()
```

## 6. 自定义绘制策略

实现 `IDrawStrategy`，经注入的 `IDrawContext` 自驱渲染（`pick` / `renderPreview` /
`renderDraftElement` / `vertexHelpers`），不持有 viewer：

```ts
import type { IDrawStrategy, IDrawContext, DrawSubState } from '@maanfa/sketcher'

class FreehandDrawStrategy implements IDrawStrategy {
  private points: Cartesian3[] = []

  constructor(private readonly context: IDrawContext) {}

  leftDown(pos: Cartesian2): DrawSubState {
    const p = this.context.pick(pos)
    if (p) {
      this.points.push(p)
      this.context.vertexHelpers.sync(this.points, { type: 'polyline' })
    }
    return 'drawing'
  }
  // 其余接口方法按需实现；自定义类型需同步扩展 ElementType 与策略工厂分支
}
```

> 内置 `ElementType` 是封闭联合（marker / polyline / polygon），新增类型需扩展类型与
> `DrawStrategyFactory` / `EditStrategyFactory` 分支（或整体替换 Drawer / Modifier）。

## 7. 自定义编辑策略

实现 `IEditStrategy`，校验拖拽运动量 `EditMotion`：

```ts
import type { IEditStrategy, EditMotion, Element } from '@maanfa/sketcher'

class NoFlipEditStrategy implements IEditStrategy {
  validate(element: Element, motion: EditMotion): boolean {
    // 检测三角形翻转 / 自交等，返回 false 拒绝本次拖拽
    return true
  }
}
```

## 8. 自定义控制器 / 输入链

实现 `InteractionHandler`，按优先级加入 `MouseEventManager` 链（首个返回 `true` 的处理器消费事件）：

```ts
import type { InteractionHandler } from '@maanfa/sketcher'

class MyController implements InteractionHandler {
  readonly priority = 5
  onLeftDown(e: PositionedEvent): boolean {
    // 特殊处理
    return false // 不消费，继续传递
  }
}

sketcher.mouseEventManager.configure([new MyController(), sketcher.modifier, sketcher.picker])
```

## 9. 热键与修饰键

```ts
sketcher.hotkeys.on('keydown', (key) => {
  if (key === 'z' && sketcher.hotkeys.state.ctrl) {
    // Ctrl+Z 自定义撤销
  }
})
const { ctrl, alt, shift } = sketcher.hotkeys.state
```
