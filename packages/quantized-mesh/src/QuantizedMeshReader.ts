import EventEmitter from 'eventemitter3'
import { zigZagDeltaDecode, decodeIndices } from './decoder'
import type {
  QuantizedMeshHeader,
  QuantizedMeshVertexData,
  QuantizedMeshIndexData,
  QuantizedMeshEdgeIndices,
  QuantizedMeshExtension,
  QuantizedMeshTile,
  QuantizedMeshReaderEvents,
} from './types'

const HEADER_SIZE = 88

function readEdgeIndices(
  view: DataView,
  pos: number,
  vertexCount: number,
  bytesPerIndex: 2 | 4,
) {
  const count = view.getUint32(pos, true)
  pos += 4

  const TypedArray = bytesPerIndex === 2 ? Uint16Array : Uint32Array
  const indices = new TypedArray(view.buffer, pos, count)
  return { indices, pos: pos + count * bytesPerIndex }
}

export class QuantizedMeshReader extends EventEmitter<QuantizedMeshReaderEvents> {
  async readTile(
    arrayBuffer: ArrayBuffer,
    z: number,
    x: number,
    y: number,
  ): Promise<void> {
    try {
      const view = new DataView(arrayBuffer)
      let pos = 0

      const header: QuantizedMeshHeader = {
        centerX: view.getFloat64(pos, true),
        centerY: view.getFloat64(pos + 8, true),
        centerZ: view.getFloat64(pos + 16, true),
        minimumHeight: view.getFloat32(pos + 24, true),
        maximumHeight: view.getFloat32(pos + 28, true),
        boundingSphereCenterX: view.getFloat64(pos + 32, true),
        boundingSphereCenterY: view.getFloat64(pos + 40, true),
        boundingSphereCenterZ: view.getFloat64(pos + 48, true),
        boundingSphereRadius: view.getFloat64(pos + 56, true),
        horizonOcclusionPointX: view.getFloat64(pos + 64, true),
        horizonOcclusionPointY: view.getFloat64(pos + 72, true),
        horizonOcclusionPointZ: view.getFloat64(pos + 80, true),
      }
      pos = HEADER_SIZE

      const vertexCount = view.getUint32(pos, true)
      pos += 4

      const encodedVertexBuffer = new Uint16Array(arrayBuffer, pos, vertexCount * 3)
      pos += vertexCount * 6

      const uBuffer = encodedVertexBuffer.subarray(0, vertexCount)
      const vBuffer = encodedVertexBuffer.subarray(vertexCount, vertexCount * 2)
      const heightBuffer = encodedVertexBuffer.subarray(vertexCount * 2, vertexCount * 3)

      zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer)

      const vertexData: QuantizedMeshVertexData = {
        vertexCount,
        u: uBuffer,
        v: vBuffer,
        height: heightBuffer,
      }

      const is32BitIndices = vertexCount > 65536
      const bytesPerIndex: 2 | 4 = is32BitIndices ? 4 : 2

      if (pos % bytesPerIndex !== 0) {
        pos += bytesPerIndex - (pos % bytesPerIndex)
      }

      const triangleCount = view.getUint32(pos, true)
      pos += 4

      const TypedArray = is32BitIndices ? Uint32Array : Uint16Array
      const indices = new TypedArray(arrayBuffer, pos, triangleCount * 3)
      pos += triangleCount * 3 * bytesPerIndex

      decodeIndices(indices)

      const indexData: QuantizedMeshIndexData = {
        triangleCount,
        indices,
      }

      function readEdge() {
        const result = readEdgeIndices(view, pos, vertexCount, bytesPerIndex)
        pos = result.pos
        return result.indices
      }

      const edgeIndices: QuantizedMeshEdgeIndices = {
        west: readEdge(),
        south: readEdge(),
        east: readEdge(),
        north: readEdge(),
      }

      const extensions: QuantizedMeshExtension[] = []
      while (pos < view.byteLength) {
        const extensionId = view.getUint8(pos)
        pos += 1
        const extensionLength = view.getUint32(pos, true)
        pos += 4
        const extensionData = arrayBuffer.slice(pos, pos + extensionLength)
        pos += extensionLength
        extensions.push({ extensionId, length: extensionLength, data: extensionData })
      }

      const tile: QuantizedMeshTile = {
        header,
        vertexData,
        indexData,
        edgeIndices,
        extensions,
      }

      this.emit('tile', { z, x, y, tile })
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)))
    }
  }
}
