# AGENTS — @maanfa/quantized-mesh

面向 AI 编码助手的项目说明。

## 文件结构

```
src/
├── index.ts               # 导出入口
├── types.ts               # 全部 TypeScript 类型定义
├── decoder.ts             # zig-zag delta + high-water-mark 解码器
└── QuantizedMeshReader.ts # 核心类，EventEmitter 子类
```

## 解析算法

### Header（88 字节）

| 偏移 | 字段 | 类型 |
|------|------|------|
| 0 | CenterX/Y/Z | float64 × 3 |
| 24 | MinimumHeight | float32 |
| 28 | MaximumHeight | float32 |
| 32 | BoundingSphereCenter/Radius | float64 × 4 |
| 64 | HorizonOcclusionPointX/Y/Z | float64 × 3 |

### Vertex Data

- `vertexCount`（uint32）
- 紧接 `uint16 × vertexCount × 3`（u, v, height 交替）
- 使用 `zigZagDeltaDecode()` 原地解码：
  - `zigZagDecode(x) = (x >> 1) ^ -(x & 1)`
  - 累加解码：`u += zigZagDecode(encoded[i])`

### Index Data

- 字节对齐 padding（`vertexCount > 65536` 按 4 字节，否则 2 字节）
- `triangleCount`（uint32）
- indices：`vertexCount > 65536` 用 `Uint32Array`，否则 `Uint16Array`
- high-water-mark 解码：
  ```
  highest = 0
  for each code:
    index = highest - code
    if code === 0: highest++
  ```

### Edge Indices

四组 `count（uint32）+ indices[]`，位宽同 index data。顺序：west → south → east → north。

### Extensions

`while (pos < byteLength)`：
- `extensionId`（uint8）
- `extensionLength`（uint32）
- `data`（extensionLength 字节）

已知 ID：1=法线(OCT), 2=水掩码, 4=元数据(JSON)。

## 约定

- 所有数值均为 **Little Endian**
- `DataView` 读取时 `littleEndian = true`
- 解码器函数原地修改输入 `TypedArray`，不产生新分配
- `readTile()` 是 `async` 方法，内部用 `try/catch` 捕获错误并通过 `error` 事件抛出
