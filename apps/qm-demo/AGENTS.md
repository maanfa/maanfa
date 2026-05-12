# AGENTS — qm-demo

面向 AI 编码助手的项目说明。

## 组件树

```
App.vue
├── TileForm.vue        — emits: select-file, clear
│   ├── NForm
│   │   ├── NInputNumber (z)
│   │   ├── NInputNumber (x)
│   │   └── NInputNumber (y)
│   └── file input + NButton (选择/清空)
└── TerrainViewer.vue   — props: tile | null; expose: clearScene
    └── Three.js Scene
        ├── PerspectiveCamera
        ├── WebGLRenderer
        ├── OrbitControls
        ├── AxesHelper
        └── Mesh (wireframe, 由 tile 数据动态生成)
```

## 数据流

```
TileForm.emit('select-file')
  → App.onSelectFile()
    → FileReader.readAsArrayBuffer(file)
      → reader.readTile(arrayBuffer, z, x, y)
        → reader.emit('tile', { z, x, y, tile })
          → tile.value = evt.tile (shallowRef)
            → TerrainViewer :tile prop update
              → watch → buildGeometry → scene.add(mesh)

TileForm.emit('clear')
  → App.onClear()
    → viewerRef.clearScene()  // 移除 mesh, 释放 GPU 资源
    → tile.value = null
```

## 关键约定

- **reader 实例** 用 `markRaw()` 包装，避免 Vue 响应式代理
- **tile 数据** 用 `shallowRef` 存储，仅跟踪引用变化
- **Three.js 场景** 通过 `defineExpose({ clearScene })` 暴露清理方法
- 顶点坐标从量化值（0~32767）映射到 `±HALF`（5），中心在原点
- 所有 GPU 资源（geometry, material, renderer, controls）在组件卸载时 `dispose`
- Naive UI 组件使用 barrel import (`import { NButton } from 'naive-ui'`)，Vite tree-shaking 自动优化

## 文件结构

```
src/
├── main.ts                     # 入口，NMessageProvider 根级包裹
├── App.vue                     # 编排层：reader 生命周期 + 数据桥接
├── style.css                   # 全局基础样式
├── global.d.ts                 # 类型声明
└── components/
    ├── TileForm.vue            # 表单组件
    └── TerrainViewer.vue       # Three.js 三维视图组件
```
