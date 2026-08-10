# Maanfa 技术概览

基于 CesiumJS 的交互式 3D 绘图工具库，在三维地球上绘制点、线、多边形并支持编辑。

## 项目结构

```
maanfa/                        # pnpm monorepo（pnpm@10，Node ^22.10）
├── apps/
│   └── dev-workshop/          # Vue 3 + Vite 绘制库调试应用
├── packages/
│   ├── core/                  # @maanfa/core — 核心工具（规划中）
│   ├── sketcher/              # @maanfa/sketcher — 主绘图库
│   ├── tsconfig/              # @maanfa/tsconfig — 共享 TS 配置（strict + bundler）
│   └── types/                 # @maanfa/types — 共享类型 & Cesium 类型扩展
├── scripts/                   # 构建脚本
├── docs/                      # 设计文档
└── AGENTS.md                  # 仓库级协作规范
```

> `@maanfa/quantized-mesh` 与 `apps/qm-demo` 在独立功能分支开发，不在 main。

## 架构总览

`Sketcher` 为外观类（EventEmitter），聚合全部子模块：

```
Sketcher
├── StateMachine       — idle / draw / edit + 子状态，ESC 分级取消
├── MouseEventManager  — ScreenSpaceEventHandler，按优先级链分发
├── HotkeyManager      — esc / 修饰键
├── CursorManager      — 游标优先级调度（绘制十字标 / 编辑 grab）
├── Drawer             — 绘制调度（策略模式，注入 DrawContext）
├── Modifier           — 编辑调度（注入 EditContext + EditVertexHelper）
├── HoverManager       — 悬停反馈
├── Picker             — 对象拾取
├── ElementStore       — 几何数据真值（存储 / 查询 / bounds）
├── FeedbackStyleStack — hover/select/edit 反馈样式合成
└── RendererManager    — 薄适配层（Element → Primitive + draw/edit 临时通道）
```

核心原则：**存储真值归 ElementStore、渲染只消费 Element、反馈样式由外观层合成、策略自驱渲染**。
内置渲染器常驻内存，`enterDraw` / `enterEdit` 只取引用，会话新建的是策略与辅助元素。

## 依赖

| 类型 | 包 | 用途 |
|---|---|---|
| peer | `cesium >= 1.104.0` | Cesium 引擎 |
| runtime | `eventemitter3` | 事件总线 |
| dev | `tsdown` / `vitest` / `oxlint` | 构建 / 测试 / Lint |

## 源文件索引

```
src/
├── index.ts / Sketcher.ts         # 桶文件 / 外观类
├── styles.ts / types.ts           # ElementStyle 规范 / DrawOption、事件载荷
├── state/                         # StateMachine + 模式/子状态类型
├── interaction/                   # MouseEventManager / HotkeyManager / CursorManager
├── controllers/                   # Drawer / Modifier / HoverManager / Picker
│   ├── DrawContext.ts             #   draw strategy 渲染入口
│   ├── EditContext.ts             #   edit strategy 渲染入口
│   ├── DrawVertexHelper.ts        #   绘制期顶点 + 距离标签
│   └── EditVertexHelper.ts        #   编辑期顶点/中点手柄 + 标签（事件透传）
├── strategies/                    # draw / edit 策略 + 工厂
├── element/                       # Element 基类 + Point / Line / Polygon
├── store/                         # IElementStore + ElementStore
├── renderer/
│   ├── RendererManager.ts         # 薄适配层门面
│   ├── IRendererManager.ts        # 接口（render / remove / 临时通道）
│   ├── elements/                  # 类型级渲染器（常驻）+ 工厂
│   ├── helpers/                   # VertexElement / MidpointElement / DistanceLabel
│   ├── draw/                      # DrawRenderChannel + DrawPreviewRenderer
│   ├── edit/                      # EditRenderChannel
│   ├── feedback/                  # FeedbackStyleStack
│   └── rendering/                 # ElementRendererHub + PrimitiveContainer
└── utils/                         # pickPosition / intersection / geojson / logger
```

## 对外事件

| 事件 | 载荷 |
|---|---|
| `draw-finish` / `element-added` / `element-updated` / `element-removed` | `{ element }` |
| `pick-result` | `PickEventPayload` |
| `mode-change` | `{ prevMode, nextMode }` |
| `select-change` / `hover-change` | `{ id: string \| null }` |

## 数据流

### 绘制

```
leftDown / mouseMove
  → Drawer 路由 → 策略 pick(pos) → 更新 placed / cursor → syncRender
      · 已放置 ≥ 最小顶点数 → renderDraftElement（polygon ≥ 3 草稿含游标，mousemove 销毁重建）
      · 子最小态 → renderPreview
      · vertexHelpers.sync（polygon 含闭合边标签）

leftUp / rightUp / dblClick
  → canFinish() → 创建 Element → 入库 → renderer.render → clearDraft → emit 'draw-finish'
```

### 编辑

```
leftDown → EditVertexHelper.onLeftDown（命中可交互手柄）→ dragging / inserting
mouseMove → dragResolver.resolve → EditMotion → validate → setVertex/insertVertex
         → renderElement → helper.sync
rightUp / ESC → cancelCurrentDrag → 还原坐标 → 重新同步
```

### 反馈样式

`hover / select / edit` 经 `FeedbackStyleStack` 合成有效样式，`renderer.render(element, style)` 传入；
优先级 `edit > select > hover`，renderer 不感知反馈层级。

## 坐标拾取

`pickPosition(viewer, winPos)` 三级降级：

| 层级 | 方法 | 条件 |
|---|---|---|
| 1 | `scene.pickPosition` | 深度缓冲可用 |
| 2 | `globe.pick` | 射线与地形相交 |
| 3 | `camera.pickEllipsoid` | 兜底，WGS84 椭球求交 |

## 策略模式

```ts
interface IDrawStrategy {
  leftDown(pos): DrawSubState
  leftUp(pos): DrawSubState
  mouseMove(start, end): DrawSubState
  rightUp(pos): DrawSubState
  dblClick(pos): DrawSubState
  get coords(): Cartesian3[]
  get hasActiveDrag(): boolean
  cancelLast(): void
  canFinish(): boolean
  reset(): void
}
```

策略经注入的 `IDrawContext` 自驱渲染（`renderDraftElement` / `renderPreview` / `vertexHelpers` / `pick`），
不直接持有 viewer。`Drawer` 只做事件路由、装配与提交。

```ts
sketcher.enterDraw({
  type: 'polygon',
  endingAction: 'right-up',
  style: { line: { color: '#13c2c2', opacity: 0.9, width: 2 }, fill: { color: '#13c2c2', opacity: 0.25 } },
})
```

## 样式规范

颜色用 css hex，透明度用 `opacity`（0~1）：

```ts
type ElementStyle = {
  line?: LineStyle      // color / opacity / width / dash / cap / join / arrow
  fill?: FillStyle      // color / opacity / pattern
  symbol?: SymbolStyle  // icon / iconSize / opacity / rotation
  label?: LabelStyle    // text / color / opacity / fontSize / ...
  customShaders?: Record<string, ShaderSlot>
}
```

- `polyline` = `line`；`polygon` = `line`（轮廓）+ `fill`（填充）；`marker` = `symbol` / `line`。
- 样式是实例级（`element.style` / `hoverStyle` / `selectedStyle` / `editingStyle`）；悬停样式必须关联具体 Element。
- 选择/编辑样式未配置实例值时，可使用外观类 `styles` 的全局兜底。

## 渲染管理

`IRendererManager` 只做三件事：`render(element, style?)`、`remove(id)`、`replaceElementItems(id, items)`，
外加 `draw` / `edit` 临时通道与生命周期。元素增删改查与反馈簿记分别在 `ElementStore` 与外观层。

临时通道内容（预览 / 草稿 / 顶点 / 标签 / 手柄 / 引导）**不进 ElementStore**，退出绘制 / 编辑统一清理。

## 开发命令

```bash
pnpm install                  # 安装依赖
pnpm test                     # vitest 单测
pnpm typecheck                # sketcher tsc --noEmit
pnpm lint                     # oxlint
pnpm --filter @maanfa/sketcher build   # 构建 sketcher
pnpm --filter dev-workshop dev         # 启动调试应用
```

> 详细设计见 `docs/sketcher/RENDERER_DESIGN.md`，扩展方式见 `docs/sketcher/EXTENSION_GUIDE.md`。
