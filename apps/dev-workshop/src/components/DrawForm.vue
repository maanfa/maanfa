<script setup lang="ts">
import type { Sketcher } from '@maanfa/sketcher'
import DRAW_TYPE_PRESETS from '../drawPresets'

const props = defineProps<{
  sketcher: Sketcher | null
  drawType: 'marker' | 'polyline' | 'polygon'
}>()

const emit = defineEmits<{
  'update:drawType': [value: 'marker' | 'polyline' | 'polygon']
  'enter-draw': []
  'exit-draw': []
  'export-geojson': []
}>()

const drawTypeOptions = (Object.keys(DRAW_TYPE_PRESETS) as Array<'marker' | 'polyline' | 'polygon'>).map(
  (type) => ({ value: type, label: DRAW_TYPE_PRESETS[type].label }),
)

function onEnterDraw(): void {
  if (!props.sketcher) return
  emit('enter-draw')
  props.sketcher.enterDraw({
    type: props.drawType,
    style: DRAW_TYPE_PRESETS[props.drawType].style,
  })
}

function onExitDraw(): void {
  if (!props.sketcher) return
  emit('exit-draw')
  props.sketcher.exitDraw()
}

function onExportGeoJSON(): void {
  if (!props.sketcher) return
  emit('export-geojson')
  const json = props.sketcher.exportGeoJSON()
  console.log('GeoJSON:', json)
}
</script>

<template>
  <div class="draw-form">
    <n-radio-group
      :value="drawType"
      size="small"
      @update:value="(v: 'marker' | 'polyline' | 'polygon') => emit('update:drawType', v)"
    >
      <n-radio-button
        v-for="option in drawTypeOptions"
        :key="option.value"
        :value="option.value"
        :label="option.label"
      />
    </n-radio-group>

    <n-space :size="6">
      <n-button size="small" type="primary" @click="onEnterDraw">
        开始绘制
      </n-button>
      <n-button size="small" @click="onExitDraw">
        结束
      </n-button>
    </n-space>

    <n-button size="small" quaternary @click="onExportGeoJSON">
      导出 GeoJSON
    </n-button>
  </div>
</template>

<style scoped>
.draw-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
