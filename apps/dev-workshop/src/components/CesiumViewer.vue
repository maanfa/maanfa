<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import {
  Camera,
  Viewer,
  Rectangle,
  EllipsoidTerrainProvider,
  TileCoordinatesImageryProvider,
  Color,
} from 'cesium'
import type { Viewer as ViewerType } from 'cesium'
import 'cesium/Build/CesiumUnminified/Widgets/widgets.css'

const emit = defineEmits<{
  ready: [viewer: ViewerType]
}>()

const containerRef = useTemplateRef('cesiumContainer')

const viewer = shallowRef<ViewerType | null>(null)

defineExpose({ viewer })

onMounted(() => {
  Camera.DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(110, 20, 111, 21)
  globalThis.CESIUM_BASE_URL = 'node_modules/cesium/Build/CesiumUnminified/'

  const v = new Viewer(containerRef.value as Element, {
    animation: false,
    timeline: false,
    targetFrameRate: 60,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    shadows: false,
    terrainProvider: new EllipsoidTerrainProvider(),
    vrButton: false,
    scene3DOnly: true,
    skyBox: false,
    baseLayerPicker: false,
    baseLayer: false,
  })
  v.scene.globe.depthTestAgainstTerrain = true
  v.scene.globe.baseColor = Color.fromCssColorString('#000000')
  v.imageryLayers.removeAll()
  v.imageryLayers.addImageryProvider(
    new TileCoordinatesImageryProvider({ color: Color.MEDIUMSLATEBLUE }),
  )

  viewer.value = v
  emit('ready', v)
})

onBeforeUnmount(() => {
  viewer.value?.destroy()
  viewer.value = null
})
</script>

<template>
  <div class="cesium-container" ref="cesiumContainer" />
</template>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
}
</style>
