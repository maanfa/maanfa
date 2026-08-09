# @maanfa/sketcher

CesiumJS 几何绘图工具包 — 原子化、可插拔、类型安全。

## 安装

```bash
pnpm add @maanfa/sketcher
```

`cesium` 为 peer dependency，需单独安装。

## 快速开始

```typescript
import { Viewer } from 'cesium'
import { Sketcher } from '@maanfa/sketcher'

const viewer = new Viewer(/* ... */)
const sketcher = new Sketcher(viewer)

// 进入点绘制模式
sketcher.enterDraw({ type: 'marker' })

// 监听绘制完成
sketcher.on('draw-finish', ({ element }) => {
  console.log('绘制的点:', element.coords)
})

// 导出全部元素为 GeoJSON
const geojson = sketcher.exportGeoJSON()
```

## 核心概念

| 组件 | 说明 |
|------|------|
| **Sketcher** | 外观类，统一入口 |
| **StateMachine** | 内部状态机，管理模式与子状态 |
| **MouseEventManager** | Cesium 事件的优先级链分发器 |
| **ElementStore** | 几何数据真值容器，默认 Map 实现 |
| **RendererManager** | 渲染管理，默认 GroundPrimitive 贴地实现（元素 + 辅助两通道） |
| **Drawer** | 绘图控制器，策略模式支持点/线/面 |
| **Modifier** | 编辑控制器，支持拖拽顶点/中点 |
| **HoverManager** | 悬停高亮 |
| **Picker** | 场景拾取 |

## 扩展点

全部 17 个扩展点均可通过接口注入或 setter 替换，无需重打包。

- `IElementStore` — 自定义存储（如 LRU）
- `IRendererManager` — 自定义渲染管理（如空间渲染）
- `IDrawStrategy` / `IEditStrategy` — 自定义绘制/编辑策略
- `IDragConstraintResolver` — 拖拽坐标约束（Ctrl/Alt 空间编辑）
- `IEditVisualGuideProvider` — 编辑辅助视觉效果
- `InteractionHandler` — 自定义控制器注入优先级链

详见 [扩展示例文档](../../docs/sketcher/EXTENSION_GUIDE.md)。

## API

| 方法 | 说明 |
|------|------|
| `enterDraw(opt)` | 进入绘图模式 |
| `exitDraw()` | 退出绘图模式 |
| `enterEdit(element)` | 进入编辑模式 |
| `exitEdit()` | 退出编辑模式 |
| `hover(id)` / `unhover()` | 主动悬停 |
| `select(id)` / `deselect()` | 主动选中 |
| `addElement(el)` / `removeElement(id)` / `updateElement(el)` | 数据 CRUD |
| `importGeoJSON(json)` / `exportGeoJSON()` | 导入导出 |
| `destroy()` | 销毁 |

## 样式（ElementStyle）

颜色一律使用 css hex（如 `'#ff8c00'`），透明度一律用 `opacity`（0~1）。

```typescript
import type { ElementStyle } from '@maanfa/sketcher'

// 绘制时指定新元素基础样式
sketcher.enterDraw({
  type: 'polygon',
  style: {
    line: { color: '#00bfff', opacity: 1, width: 2 },
    fill: { color: '#00bfff', opacity: 0.3 },
  },
})

// 实例级反馈样式
element.setStyles({
  style: { line: { color: '#ff0000', opacity: 1, width: 3 } },
  hoverStyle: { line: { color: '#00ff00', opacity: 1, width: 3 } },
  selectedStyle: { line: { color: '#ffd700', opacity: 1, width: 4 } },
})

// 全局兜底：构造时传入
const sketcher = new Sketcher(viewer, {
  styles: {
    hoverStyle: { line: { color: '#ffff00', opacity: 1, width: 3 } },
    selectedStyle: { line: { color: '#ff8c00', opacity: 1, width: 4 } },
    editingStyle: { line: { color: '#00ffff', opacity: 1, width: 4 } },
  },
})
```

解析优先级：实例反馈样式 > 外观类默认反馈样式 > 元素自身基础样式。
