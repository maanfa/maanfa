# @maanfa/quantized-mesh

解析 Cesium QuantizedMesh Terrain（`.terrain`）文件的 TypeScript 库，支持 Browser 和 Node.js 双端运行。

## 安装

```bash
pnpm add @maanfa/quantized-mesh
```

## 用法

```ts
import { QuantizedMeshReader } from '@maanfa/quantized-mesh'

const reader = new QuantizedMeshReader()

reader.on('tile', (evt) => {
  console.log('解析完成:', evt.z, evt.x, evt.y)
  console.log('Header:', evt.tile.header)
  console.log('顶点数:', evt.tile.vertexData.vertexCount)
  console.log('三角形数:', evt.tile.indexData.triangleCount)
})

reader.on('error', (err) => {
  console.error('解析失败:', err)
})

// 从 ArrayBuffer 读取
const response = await fetch('/path/to/tile.terrain')
const buffer = await response.arrayBuffer()
reader.readTile(buffer, 13, 12137, 5343)
```

## API

### `QuantizedMeshReader`

继承 `EventEmitter`，解析二进制 `.terrain` 文件。

**方法**

| 方法 | 说明 |
|------|------|
| `readTile(arrayBuffer, z, x, y)` | 异步解析瓦片，结果通过 `tile` 事件输出 |

**事件**

| 事件 | 载荷 | 说明 |
|------|------|------|
| `tile` | `TileReadEvent` | 解析成功，携带 `QuantizedMeshTile` |
| `error` | `Error` | 解析失败 |

### `QuantizedMeshTile`

完整解码后的瓦片结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `header` | `QuantizedMeshHeader` | 88 字节头部（Center、BoundingSphere 等） |
| `vertexData` | `QuantizedMeshVertexData` | 顶点数据（u/v/height，已解码） |
| `indexData` | `QuantizedMeshIndexData` | 索引数据（已解码 high-water-mark） |
| `edgeIndices` | `QuantizedMeshEdgeIndices` | 四个方向的边缘顶点索引 |
| `extensions` | `QuantizedMeshExtension[]` | 扩展数据（法线、水掩码、元数据等） |

## 格式参考

遵循 [quantized-mesh-1.0 规范](https://github.com/CesiumGS/quantized-mesh/tree/layer-json-specification)。

## 开发

```bash
pnpm dev        # 监听模式构建
pnpm build      # 构建
pnpm lint       # 代码检查
```
