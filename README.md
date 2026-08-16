# Maanfa (萬花)

基于 [CesiumJS](https://cesium.com/platform/cesiumjs/) 的交互式绘图工具库，提供在三维地球上绘制点、线、多边形等几何图形的能力。

## 演示

<video src="https://raw.githubusercontent.com/maanfa/maanfa/main/docs/MaanfaIntro.webm" controls muted loop width="720"></video>

## 架构

本项目采用 **pnpm monorepo** 结构，包含以下几个包：

```
maanfa/
├── packages/
│   ├── core           # @maanfa/core — 核心工具（规划中）
│   ├── sketcher       # @maanfa/sketcher — 主绘图库
│   ├── quantized-mesh # @maanfa/quantized-mesh — QuantizedMesh 地形瓦片解析器
│   ├── types          # @maanfa/types — 共享类型定义 & Cesium 类型扩展
│   └── tsconfig       # @maanfa/tsconfig — 共享 TypeScript 配置
├── apps/
│   ├── dev-workshop   # 基于 Vue 3 + Vite 的绘制库开发调试应用
│   └── qm-demo        # 基于 Vue 3 + Vite + Three.js 的量化网格瓦片可视化 demo
└── scripts/           # 构建脚本
```

### `@maanfa/sketcher` 核心模块

`Sketcher` 是整个绘图系统的入口（外观类），内部组合了多个子模块，采用**状态机 + 策略模式 + 事件驱动**架构：

```
Sketcher (外观类 EventEmitter)
├── StateMachine       — 状态机：idle / draw / edit + 子状态 (ready/drawing/dragging/inserting)
├── MouseEventManager  — 封装 Cesium ScreenSpaceEventHandler，按优先级链分发事件
├── HotkeyManager      — esc → StateMachine.cancel()；修饰键状态跟踪
├── CursorManager      — 游标优先级调度 + 外部锁定
├── Drawer             — 绘制调度（策略模式）
├── Modifier           — 编辑调度（顶点/中点手柄拖拽、顶点增删）
├── HoverManager       — 悬停高亮
├── Picker             — 对象拾取 (scene.pick / drillPick)
├── ElementStore       — 几何数据真值（可替换 IElementStore 实现；findById / count / bounds）
└── RendererManager    — 渲染适配（可替换 IRendererManager；只做 Element → Primitive + draw/edit 临时通道，
                          反馈样式由外观层 FeedbackStyleStack 合成后传入）
```

#### 状态机与事件优先级

- `StateMachine` 管理全局模式（idle / draw / edit）与模式子状态，ESC 按子状态分级取消。
- `MouseEventManager` 按优先级链分发鼠标事件（首个返回 `true` 的处理器消费事件）：
  - **idle** → Picker + HoverManager
  - **draw** → Drawer 独占
  - **edit** → Modifier 高优 + Picker + HoverManager 回退

#### 策略模式（绘图 / 编辑）

`DrawStrategyFactory` 根据绘图选项创建对应策略；`EditStrategyFactory` 根据要素类型创建校验策略：

| 策略 | 说明 |
|---|---|
| `DrawPointStrategy` | 单击放置点 |
| `DrawLineStrategy` | 连续点击添加折线顶点，右键或双击结束，自交拦截 |
| `DrawPolygonStrategy` | 连续点击构成封闭面，右键或双击结束，含闭合边自交检测 |

#### 坐标拾取

`pickPosition` 采用三级降级策略获取世界坐标：

1. `scene.pickPosition()` — 拾取场景中的深度缓冲
2. `globe.pick()` — 射线与地球表面求交
3. `camera.pickEllipsoid()` — 射线与 WGS84 椭球体求交

## 安装

```bash
pnpm add @maanfa/sketcher cesium
```

> **前置条件**：`cesium >= 1.104.0`

## 用法

### 基本示例

```ts
import { Viewer } from 'cesium'
import { Sketcher } from '@maanfa/sketcher'

const viewer = new Viewer('cesium-container')
const sketcher = new Sketcher(viewer)

// 监听绘制完成事件
sketcher.on('draw-finish', (evt) => {
  const { element } = evt
  console.log('元素类型:', element.type)
  console.log('坐标:', element.coords)  // Cartesian3[]
})

// 进入绘制模式
sketcher.enterDraw({ type: 'marker' })
```

### 绘制线段

```ts
sketcher.enterDraw({
  type: 'polyline',
  endingAction: 'right-up' // 'right-up' | 'double-click'
})
```

### 绘制多边形

```ts
sketcher.enterDraw({ type: 'polygon', endingAction: 'double-click' })
```

### 编辑元素

```ts
// 绘制完成后自动进入编辑（autoEdit），或手动指定元素编辑
sketcher.enterDraw({ type: 'polyline', autoEdit: true })
sketcher.enterEdit(element)

// 退出当前编辑
sketcher.exitEdit()
```

编辑模式下可拖拽顶点 / 中点手柄，右键或 ESC 取消拖拽，ESC 退出编辑模式。

### 退出绘制 & 销毁

```ts
// 退出当前绘制
sketcher.exitDraw()

// 销毁实例，释放资源
sketcher.destroy()
```

### DrawOption 类型总览

```ts
type DrawOption =
  | { type: 'marker' }
  | { type: 'polyline'; endingAction?: 'double-click' | 'right-up'; autoEdit?: boolean }
  | { type: 'polygon'; endingAction?: 'double-click' | 'right-up'; autoEdit?: boolean }
```

### 样式（ElementStyle）

颜色用 css hex（如 `'#ff8c00'`），透明度用 `opacity`（0~1）。基础样式与悬停/选中/编辑反馈均为**实例级**，外观类 `styles` 只做全局兜底。

```ts
// 绘制时指定新元素样式
sketcher.enterDraw({
  type: 'polygon',
  style: { line: { color: '#00bfff', opacity: 1, width: 2 }, fill: { color: '#00bfff', opacity: 0.3 } },
})

// 实例反馈样式
element.setStyles({ selectedStyle: { line: { color: '#ffd700', opacity: 1, width: 4 } } })

// 全局兜底
const sketcher = new Sketcher(viewer, {
  styles: { hoverStyle: { line: { color: '#ffff00', opacity: 1, width: 3 } } },
})
```

解析优先级：实例反馈样式 > 外观类默认反馈样式 > 元素自身基础样式。

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发调试应用
cd apps/dev-workshop
pnpm dev

# 构建 sketcher 包
cd packages/sketcher
pnpm build

# 测试 / 类型检查 / Lint（在仓库根目录）
pnpm test
pnpm typecheck
pnpm lint
```

> 单元测试基于 [vitest](https://vitest.dev)，核心纯逻辑（坐标换算、状态转移、自交检测、绘制策略流转）已覆盖。

## 许可证

[MIT](LICENSE)
