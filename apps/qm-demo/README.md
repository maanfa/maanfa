# QuantizedMesh 解析器 — 演示应用

基于 Vue 3 + Vite 8 + Three.js 的交互式演示，用于测试 `@maanfa/quantized-mesh` 包的瓦片解析与三维可视化。

## 快速开始

```bash
pnpm dev       # 启动开发服务器
pnpm build     # 生产构建
pnpm preview   # 预览构建产物
```

## 功能

- 上传 `.terrain` 文件，解析 QuantizedMesh 地形瓦片
- 左侧表单输入 z/x/y 坐标参数
- 右侧 Three.js 场景以线框模式显示地形顶点网格
- 坐标轴辅助线（红 X / 绿 Y / 蓝 Z），中心位于原点
- OrbitControls 拖拽旋转/缩放

## 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 + Vite 8 | 应用框架 |
| Naive UI | 表单 UI 组件 |
| Three.js | 三维渲染（线框模型） |
| @maanfa/quantized-mesh | 瓦片解析核心库 |

## 组件结构

```
App.vue — 数据编排
├── TileForm.vue — 参数输入 + 文件选择
└── TerrainViewer.vue — Three.js 场景渲染
```

## 测试文件

`public/sample.terrain` — 日本东京山区的瓦片数据（z=13, x=12137, y=5343），可直接点击选择。
