/**
 * Cesium pick 结果对应的业务元素部件。
 */
interface PickTarget {
  /** 业务 Element 的唯一标识。 */
  elementId: string
  /** 被命中的渲染部件名称，如 `polygon-fill` 或 `polygon-outline`。 */
  part: string
}

/**
 * 将 Cesium pick token 映射到业务 Element。
 * ElementStore 仍然持有 Element 真值，此处只维护渲染部件的反查关系。
 */
class PickRegistry {
  private readonly targets = new Map<string, PickTarget>()

  /**
   * 创建一个 Cesium GeometryInstance/Primitive 使用的 pick token。
   *
   * @param elementId - 业务 Element 的唯一标识
   * @param part - 渲染部件名称
   * @param register - 是否登记反查关系；草稿等临时部件应传 `false`
   */
  createPickId(elementId: string, part: string, register = true): string {
    const pickId = `mf-sk:${elementId}:${part}`
    if (register) {
      this.targets.set(pickId, { elementId, part })
    }
    return pickId
  }

  /**
   * 将 Cesium pick 返回的 token 解析为业务元素部件。
   *
   * @param pickId - Cesium pick 结果中的 `id` 值
   * @returns 已登记的部件信息；未命中或类型不符时返回 `undefined`
   */
  resolve(pickId: unknown): PickTarget | undefined {
    if (typeof pickId !== 'string') return undefined
    return this.targets.get(pickId)
  }

  /** 移除指定 Element 的全部渲染部件映射。 */
  removeElement(elementId: string): void {
    for (const [pickId, target] of this.targets) {
      if (target.elementId === elementId) this.targets.delete(pickId)
    }
  }

  /** 清空所有 pick token 映射。 */
  clear(): void {
    this.targets.clear()
  }
}

export type { PickTarget }
export default PickRegistry
