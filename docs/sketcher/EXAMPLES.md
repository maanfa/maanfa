# Sketcher 代码示例

## 1. 基础初始化

```typescript
import { Viewer } from 'cesium'
import { Sketcher } from '@maanfa/sketcher'

const viewer = new Viewer('cesiumContainer')
const sketcher = new Sketcher(viewer)

// 开启调试日志
sketcher.debug = true
```

## 2. 绘制点

```typescript
sketcher.enterDraw({ type: 'marker' })

sketcher.on('draw-finish', ({ element }) => {
  console.log('点坐标:', element.coords)
})
```

## 3. 绘制线（右键结束）

```typescript
sketcher.enterDraw({
  type: 'polyline',
  endingAction: 'right-up',
  autoEdit: true, // 完成自动进入编辑
})

sketcher.on('draw-finish', ({ element }) => {
  console.log(`线顶点数: ${element.coords.length}`)
})
```

## 4. 绘制面（双击结束）

```typescript
sketcher.enterDraw({
  type: 'polygon',
  endingAction: 'double-click',
})
```

## 5. 编辑元素

```typescript
sketcher.on('draw-finish', ({ element }) => {
  // 绘制完成后进入编辑
  sketcher.enterEdit(element)
})

// 监听编辑变更
sketcher.on('element-updated', ({ element }) => {
  console.log('Element updated:', element.id)
})

// ESC 退出编辑
// 自动处理，无需手动绑定
```

## 6. 悬停与选中

```typescript
// 启用悬停（默认启用）
sketcher.hoverEnabled = true

// 监听拾取结果（不自动选中）
sketcher.on('pick-result', ({ picks }) => {
  console.log('拾取到', picks.length, '个对象')
  // 外部决定是否选中
})

// 主动选中
sketcher.select('some-element-id')

// 取消选中
sketcher.deselect()
```

## 7. 自定义渲染样式

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

// 实例级样式（基础 + 悬停/选中/编辑反馈）
element.setStyles({
  style: { line: { color: '#ff0000', opacity: 1, width: 3 } },
  hoverStyle: { line: { color: '#00ff00', opacity: 1, width: 3 } },
  selectedStyle: { line: { color: '#ffd700', opacity: 1, width: 4 } },
})

// 全局兜底样式（元素未配置时生效）
const sketcher = new Sketcher(viewer, {
  styles: {
    hoverStyle: { line: { color: '#ffff00', opacity: 1, width: 3 } },
    selectedStyle: { line: { color: '#ff8c00', opacity: 1, width: 4 } },
    editingStyle: { line: { color: '#00ffff', opacity: 1, width: 4 } },
  },
})
```

## 8. GeoJSON 导入导出

```typescript
// 导出
const geojson = sketcher.exportGeoJSON()
console.log(geojson)

// 导入
const ids = sketcher.importGeoJSON(geojson)
console.log('导入要素数:', ids.length)
```

## 9. 模式切换与控制

```typescript
// 手动退出当前绘制/编辑
sketcher.exitDraw()
sketcher.exitEdit()

// 监听模式变化
sketcher.on('mode-change', ({ prevMode, nextMode }) => {
  console.log(`Mode: ${prevMode} → ${nextMode}`)
})
```

## 10. 调试

```typescript
// 开启调试
sketcher.debug = true

// 关闭
sketcher.debug = false

// 查看当前状态
console.log(sketcher.stateMachine.mode)
console.log(sketcher.elementStore.getAll())
```
