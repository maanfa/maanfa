<script setup lang="ts">
import { shallowRef, ref, markRaw, onBeforeUnmount } from 'vue'
import { Sketcher, version as SketcherVersion } from '@maanfa/sketcher'
import type { Viewer } from 'cesium'
import DRAW_TYPE_PRESETS from './drawPresets'
import CesiumViewer from './components/CesiumViewer.vue'
import DrawForm from './components/DrawForm.vue'
import EventLog from './components/EventLog.vue'

const sketcherRef = shallowRef<Sketcher | null>(null)
const drawType = ref<'marker' | 'polyline' | 'polygon'>('marker')
const eventLog = ref<string[]>([])

function log(msg: string): void {
  eventLog.value.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
  if (eventLog.value.length > 50) eventLog.value.shift()
}

function handleViewerReady(viewer: Viewer): void {
  const sk = new Sketcher(viewer)
  sk.debug = true

  sk.on('draw-finish', (evt) => {
    evt.element.setStyles({ hoverStyle: DRAW_TYPE_PRESETS[evt.element.type].hoverStyle })
    log(`Draw finish: ${evt.element.type} ${evt.element.id.slice(0, 8)}...`)
    console.log('Element coords:', evt.element.coords.length)
  })
  sk.on('mode-change', (evt) => {
    log(`Mode: ${evt.nextMode}`)
  })
  sk.on('element-added', (evt) => {
    log(`Element added: ${evt.element.id.slice(0, 8)}...`)
  })
  sk.on('pick-result', (evt) => {
    log(`Pick: ${evt.picks.length} objects`)
  })

  sketcherRef.value = markRaw(sk)
  log(`Sketcher v${SketcherVersion} initialized`)
}

function onEnterDraw(): void {
  log(`Enter draw mode: ${drawType.value}`)
}

function onExitDraw(): void {
  log('Exit draw mode')
}

function onExportGeoJSON(): void {
  const sk = sketcherRef.value
  if (!sk) return
  log(`Exported ${sk.elementStore.getAll().length} elements to console`)
}

onBeforeUnmount(() => {
  sketcherRef.value?.destroy()
})
</script>

<template>
  <div class="app-root">
    <CesiumViewer class="cesium-pane" @ready="handleViewerReady" />

    <div class="draw-panel">
      <div class="draw-panel-header">绘制工具</div>
      <div class="draw-panel-body">
        <DrawForm
          :sketcher="sketcherRef"
          :draw-type="drawType"
          @update:draw-type="drawType = $event"
          @enter-draw="onEnterDraw"
          @exit-draw="onExitDraw"
          @export-geojson="onExportGeoJSON"
        />
      </div>
    </div>

    <div class="event-panel">
      <EventLog :logs="eventLog" />
    </div>
  </div>
</template>

<style scoped>
.app-root {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #000;
}
.cesium-pane {
  width: 100%;
  height: 100%;
}
.draw-panel {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  width: 220px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}
.draw-panel-header {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #eee;
}
.draw-panel-body {
  padding: 10px 12px;
}
.event-panel {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 10;
  width: 400px;
  max-height: 320px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  overflow: hidden;
}
</style>
