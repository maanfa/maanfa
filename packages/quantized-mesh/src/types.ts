export interface QuantizedMeshHeader {
  centerX: number
  centerY: number
  centerZ: number
  minimumHeight: number
  maximumHeight: number
  boundingSphereCenterX: number
  boundingSphereCenterY: number
  boundingSphereCenterZ: number
  boundingSphereRadius: number
  horizonOcclusionPointX: number
  horizonOcclusionPointY: number
  horizonOcclusionPointZ: number
}

export interface QuantizedMeshVertexData {
  vertexCount: number
  u: Uint16Array
  v: Uint16Array
  height: Uint16Array
}

export interface QuantizedMeshIndexData {
  triangleCount: number
  indices: Uint16Array | Uint32Array
}

export interface QuantizedMeshEdgeIndices {
  west: Uint16Array | Uint32Array
  south: Uint16Array | Uint32Array
  east: Uint16Array | Uint32Array
  north: Uint16Array | Uint32Array
}

export interface QuantizedMeshExtension {
  extensionId: number
  length: number
  data: ArrayBuffer
}

export interface QuantizedMeshTile {
  header: QuantizedMeshHeader
  vertexData: QuantizedMeshVertexData
  indexData: QuantizedMeshIndexData
  edgeIndices: QuantizedMeshEdgeIndices
  extensions: QuantizedMeshExtension[]
}

export interface TileReadEvent {
  z: number
  x: number
  y: number
  tile: QuantizedMeshTile
}

export interface QuantizedMeshReaderEvents {
  tile: (event: TileReadEvent) => void
  error: (error: Error) => void
}
