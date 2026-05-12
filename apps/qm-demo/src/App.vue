<script setup lang="ts">
import { markRaw, onMounted, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import { QuantizedMeshReader } from '@maanfa/quantized-mesh'
import type { QuantizedMeshTile } from '@maanfa/quantized-mesh'
import { NConfigProvider } from 'naive-ui'
import TileForm from './components/TileForm.vue'
import TerrainViewer from './components/TerrainViewer.vue'

// TileForm emits→FileReader→reader→tile event→TerrainViewer
const tile = shallowRef<QuantizedMeshTile | null>(null)
const reader = markRaw(new QuantizedMeshReader())
const viewerRef = useTemplateRef<InstanceType<typeof TerrainViewer>>('viewer')

onMounted(() => {
  // 注册 reader 事件：成功更新 tile，失败打印错误
  reader.on('tile', (evt) => {
    console.log('[qm-demo] tile:', evt)
    tile.value = evt.tile
  })
  reader.on('error', (err) => {
    console.error('[qm-demo] error:', err)
  })
})

onBeforeUnmount(() => {
  reader.removeAllListeners()
})

// 文件选择后，用 FileReader 读成 ArrayBuffer 交给 reader 解析
function onSelectFile(payload: { file: File; z: number; x: number; y: number }) {
  const { file, z, x, y } = payload
  const fileReader = new FileReader()
  fileReader.onload = () => {
    reader.readTile(fileReader.result as ArrayBuffer, z, x, y)
  }
  fileReader.readAsArrayBuffer(file)
}

// 清空：同时重置 tile 数据和 Three 场景
function onClear() {
  viewerRef.value?.clearScene()
  tile.value = null
}
</script>

<template>
  <NConfigProvider>
    <!-- 左右分栏布局：左侧表单 + 右侧三维视图 -->
    <div class="app-layout">
      <div class="app-sidebar">
        <div class="app-header">
          <h1 class="app-title">QuantizedMesh 解析器</h1>
          <p class="app-desc">上传 <code>.terrain</code> 文件进行瓦片几何数据解析</p>
        </div>
        <TileForm
          @select-file="onSelectFile"
          @clear="onClear"
        />
        <div class="app-footer">
          <p>解析结果已输出到控制台</p>
        </div>
      </div>
      <div class="app-main">
        <TerrainViewer ref="viewer" :tile="tile" />
      </div>
    </div>
  </NConfigProvider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  background: #f5f6fa;
}

#app {
  height: 100vh;
}

.app-layout {
  display: flex;
  height: 100vh;
}

.app-sidebar {
  width: 380px;
  min-width: 380px;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #eef0f6;
}

.app-header {
  padding: 24px 28px 0;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.3;
}

.app-desc {
  font-size: 13px;
  color: #888;
  line-height: 1.4;
  margin-top: 4px;
}

.app-desc code {
  font-size: 12px;
  background: #f0f0f5;
  padding: 1px 6px;
  border-radius: 4px;
  color: #667eea;
}

.app-footer {
  padding: 16px 28px;
  border-top: 1px solid #f0f0f5;
  margin-top: auto;
}

.app-footer p {
  font-size: 12px;
  color: #aaa;
}

.app-main {
  flex: 1;
  min-width: 0;
}
</style>
