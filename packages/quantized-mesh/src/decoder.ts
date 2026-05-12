function zigZagDecode(value: number): number {
  return (value >> 1) ^ -(value & 1)
}

export function zigZagDeltaDecode(
  uBuffer: Uint16Array,
  vBuffer: Uint16Array,
  heightBuffer: Uint16Array,
): void {
  let u = 0
  let v = 0
  let height = 0
  const count = uBuffer.length
  for (let i = 0; i < count; ++i) {
    u += zigZagDecode(uBuffer[i])
    v += zigZagDecode(vBuffer[i])
    height += zigZagDecode(heightBuffer[i])
    uBuffer[i] = u
    vBuffer[i] = v
    heightBuffer[i] = height
  }
}

export function decodeIndices(indices: Uint16Array | Uint32Array): void {
  let highest = 0
  const length = indices.length
  for (let i = 0; i < length; ++i) {
    const code = indices[i]
    indices[i] = highest - code
    if (code === 0) {
      ++highest
    }
  }
}
