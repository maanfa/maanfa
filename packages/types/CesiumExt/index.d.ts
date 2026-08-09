/// <reference types="cesium" />

declare module 'cesium' {
  /**
   * An object that was picked from a Primitive with a string id.
   */
  export interface PrimitiveStringIdPickedObject {
    id: string
    primitive: Primitive
  }

  export interface PrimitiveEntityIdPickedObject {
    id: Entity
    primitive: Primitive
  }

  /** Simple alias for `ScreenSpaceEventHandler.PositionedEvent` */
  export type PositionedEvent = ScreenSpaceEventHandler.PositionedEvent

  /** Simple alias for `ScreenSpaceEventHandler.MotionEvent` */
  export type MotionEvent = ScreenSpaceEventHandler.MotionEvent

  /**
   * The result type of `scene.drillPick` operation.
   */
  export type PickResult =
    | PrimitiveStringIdPickedObject
    | PrimitiveEntityIdPickedObject
    | Cesium3DTileFeature

  export interface PointPrimitiveConstructionOptions {
    id?: any
    show?: boolean
    position: Cartesian3
    pixelSize?: number
    color?: Color
    outlineColor?: Color
    outlineWidth?: number
    disableDepthTestDistance?: number
    distanceDisplayCondition?: DistanceDisplayCondition
    scaleByDistance?: NearFarScalar
    splitDirection?: SplitDirection
    translucencyByDistance?: NearFarScalar
  }

  /**
   * `GroundPrimitive` / `GroundPolylinePrimitive` 内部依赖的地形高度插值器。
   *
   * Cesium 源码中标记为 `@private`，此处按源码类型补充声明以便包内使用。
   * @see https://github.com/CesiumGS/cesium/blob/main/packages/engine/Source/Core/ApproximateTerrainHeights.js
   */
  export const ApproximateTerrainHeights: {
    /** 初始化地形高度插值数据，返回 Promise，resolve 后可同步调用 getMinimumMaximumHeights */
    initialize(): Promise<void>

    /** 计算矩形区域的最小/最大地形高度 */
    getMinimumMaximumHeights(
      rectangle: Rectangle,
      ellipsoid?: Ellipsoid,
    ): { minimumTerrainHeight: number; maximumTerrainHeight: number }

    /** 计算矩形区域的包围球 */
    getBoundingSphere(rectangle: Rectangle, ellipsoid?: Ellipsoid): BoundingSphere

    /** 是否已完成初始化 */
    readonly initialized: boolean

    _initPromise: Promise<void>
  }
}
