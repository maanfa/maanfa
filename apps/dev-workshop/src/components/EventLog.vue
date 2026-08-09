<script setup lang="ts">
defineProps<{
  logs: string[]
}>()
</script>

<template>
  <div class="log-scroll">
    <div v-if="logs.length === 0" class="log-empty">
      暂无事件
    </div>
    <div
      v-for="(line, idx) in logs"
      :key="idx"
      class="log-item"
    >
      {{ line }}
    </div>
  </div>
</template>

<style scoped>
.log-scroll {
  max-height: 320px;
  overflow-y: auto;
  padding: 6px 0;
}
.log-empty {
  padding: 10px;
  text-align: center;
  color: #777;
  font-size: 12px;
}
.log-item {
  padding: 1px 10px;
  font-size: 11px;
  font-family: monospace;
  line-height: 1.7;
  color: #0f0;
}
</style>
