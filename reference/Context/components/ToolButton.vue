<template>
  <button
    class="tool-button"
    :class="{ active: active }"
    @click="$emit('click')"
  >
    <v-icon v-if="tool.icon" :icon="tool.icon" size="small" class="me-1" />
    <span v-if="tool.label" class="button-text">{{ tool.label }}</span>
  </button>
</template>

<script setup>
defineProps({
  tool: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<style scoped>
.tool-button {
  min-width: 100px;
  padding: 8px 16px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-color);
  font-size: 0.8571428571rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tool-button:hover {
  background-color: #f3f5f9;
  border-color: var(--primary-color);
}

.tool-button.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.tool-button :deep(.v-icon) {
  font-size: 16px;
}

.button-text {
  margin-left: 4px;
  font-size: 14px;
}
</style> 