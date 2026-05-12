<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, shallowRef } from 'vue'
import { Scene, PerspectiveCamera, WebGLRenderer, BufferGeometry, Float32BufferAttribute, MeshBasicMaterial, Mesh, Object3D, AxesHelper } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { QuantizedMeshTile } from '@maanfa/quantized-mesh'

const props = withDefaults(defineProps<{
  tile: QuantizedMeshTile | null
}>(), {
  tile: null,
})

const containerRef = ref<HTMLDivElement>()
const rendererRef = shallowRef<WebGLRenderer>()
const controlsRef = shallowRef<OrbitControls>()
const animationId = ref(0)
const currentMesh = shallowRef<Mesh | null>(null)

// 瓦片可视范围：边长为 TILE_SIZE，中心位于原点
const TILE_SIZE = 10
const HALF = TILE_SIZE / 2

// 将解析后的量化顶点数据构建为 Three.js 几何体
function buildGeometry(tile: QuantizedMeshTile) {
  const { vertexData, indexData } = tile
  const { u, v, height } = vertexData
  const { indices } = indexData

  // u/v/height 各范围 0~32767，映射到 ±HALF 并在 Z 轴隆起
  const positions = new Float32Array(u.length * 3)
  for (let i = 0; i < u.length; ++i) {
    positions[i * 3] = (u[i] / 32767) * TILE_SIZE - HALF
    positions[i * 3 + 1] = (v[i] / 32767) * TILE_SIZE - HALF
    positions[i * 3 + 2] = (height[i] / 32767) * TILE_SIZE - HALF
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(Array.from(indices))
  return geometry
}

// 初始化 Three.js 场景、相机、渲染器、控制器
function initScene() {
  const el = containerRef.value
  if (!el) return

  const w = el.clientWidth
  const h = el.clientHeight

  const scene = new Scene()

  const camera = new PerspectiveCamera(60, w / h, 0.1, 1000)
  camera.position.set(HALF * 1.5, HALF, HALF * 1.5)
  camera.lookAt(0, 0, 0)

  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setClearColor(0x1a1a2e)
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  el.appendChild(renderer.domElement)

  // 鼠标拖拽旋转/缩放/平移
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0, 0)
  controls.update()

  // 坐标轴：红 X / 绿 Y / 蓝 Z
  scene.add(new AxesHelper(HALF * 1.5))

  rendererRef.value = renderer
  controlsRef.value = controls

  function animate() {
    animationId.value = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  return scene
}

// 组件卸载时释放所有 GPU 资源
function disposeScene(scene: Scene) {
  cancelAnimationFrame(animationId.value)
  scene.traverse((child: Object3D) => {
    if (child instanceof Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((m: MeshBasicMaterial) => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  })
  rendererRef.value?.dispose()
  controlsRef.value?.dispose()
}

let scene: Scene | undefined

onMounted(() => {
  scene = initScene()
})

onUnmounted(() => {
  if (scene) disposeScene(scene)
})

// tile 数据到达 → 构建并显示三维网格
watch(() => props.tile, (tile) => {
  if (!scene || !tile) return

  clearMesh()
  const geometry = buildGeometry(tile)
  const material = new MeshBasicMaterial({ color: 0x667eea, wireframe: true })
  const mesh = new Mesh(geometry, material)
  scene.add(mesh)
  currentMesh.value = mesh
})

// 移除并释放当前网格，复用清理逻辑
function clearMesh() {
  if (!currentMesh.value || !scene) return
  currentMesh.value.geometry.dispose()
  ;(currentMesh.value.material as MeshBasicMaterial).dispose()
  scene.remove(currentMesh.value)
  currentMesh.value = null
}

// 外部调用入口：清除三维场景中的网格
function clearScene() {
  clearMesh()
}

defineExpose({ clearScene })
</script>

<template>
  <div ref="containerRef" class="viewer"></div>
</template>

<style scoped>
.viewer {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
