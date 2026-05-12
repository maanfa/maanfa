<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { NForm, NFormItem, NInputNumber, NButton, useMessage } from 'naive-ui'

// 向上通知父组件：选择文件 / 清空
const emit = defineEmits<{
  'select-file': [payload: { file: File; z: number; x: number; y: number }]
  clear: []
}>()

// 默认参数对应 sample.terrain（z=13, 东京山区）
const z = ref(13)
const x = ref(12137)
const y = ref(5343)
const fileName = ref('')

const message = useMessage()
const fileInputRef = useTemplateRef<HTMLInputElement>('file-input')

// 文件选取后，连同目前 z/x/y 一并发射给父组件
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  message.info(`正在读取: ${file.name}`)
  emit('select-file', { file, z: z.value, x: x.value, y: y.value })
}

function triggerFilePicker() {
  fileInputRef.value?.click()
}

// 重置表单值并通知父组件清空视图
function onClear() {
  z.value = 13
  x.value = 12137
  y.value = 5343
  fileName.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  emit('clear')
}
</script>

<template>
  <div class="form-card">
    <NForm label-placement="left" :label-width="72">
      <NFormItem label="Z 层级">
        <NInputNumber v-model:value="z" :min="0" style="width: 100%;" />
      </NFormItem>
      <NFormItem label="X 列号">
        <NInputNumber v-model:value="x" :min="0" style="width: 100%;" />
      </NFormItem>
      <NFormItem label="Y 行号">
        <NInputNumber v-model:value="y" :min="0" style="width: 100%;" />
      </NFormItem>
    </NForm>

    <div class="file-zone">
      <input
        ref="file-input"
        type="file"
        accept=".terrain"
        style="display: none;"
        @change="onFileChange"
      />
      <div class="file-actions">
        <NButton
          size="large"
          type="primary"
          :style="{ flex: 1 }"
          @click="triggerFilePicker"
        >
          {{ fileName || '选择 .terrain 文件' }}
        </NButton>
        <NButton
          size="large"
          :style="{ width: 54, justifyContent: 'center', fontSize: 20 }"
          @click="onClear"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-card {
  padding: 24px 28px 28px;
}

.form-card :deep(.n-form) {
  margin-bottom: 20px;
}

.file-zone {
  padding-top: 8px;
  border-top: 1px solid #f0f0f5;
}

.file-actions {
  display: flex;
  gap: 10px;
}
</style>
