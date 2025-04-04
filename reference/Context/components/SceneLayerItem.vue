<template>
  <div class="scene-layer-item" :style="{ paddingLeft: `${depth * 8}px` }">
    <div class="layer-item-header" @click="toggleExpanded">
      <v-icon v-if="hasChildren" size="small" class="mr-2">
        {{ isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
      </v-icon>
      <v-icon v-else size="small" class="mr-2 visibility-hidden">mdi-chevron-right</v-icon>
      
      <v-icon :color="item.color || 'primary'" size="small" class="mr-2">
        {{ item.icon || getDefaultIcon(item) }}
      </v-icon>
      
      <span class="item-name" :class="{ 'inactive-item': !item.active }">
        {{ item.name }}
      </span>
      
      <v-spacer></v-spacer>
      
      <v-checkbox
        v-model="isActive"
        hide-details
        density="compact"
        :color="item.color || 'primary'"
        @click.stop
        @change="toggleVisibility"
      ></v-checkbox>
    </div>
    
    <div v-if="isExpanded && hasChildren" class="item-children">
      <scene-layer-item
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :depth="depth + 1"
        @toggle="handleChildToggle"
      ></scene-layer-item>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Define props
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  }
});

// Define emits
const emit = defineEmits(['toggle']);

// Local state
const isExpanded = ref(true);
const isActive = ref(props.item.active);

// Watch for external changes to the item's active state
watch(() => props.item.active, (newValue) => {
  isActive.value = newValue;
});

// Computed properties
const hasChildren = computed(() => {
  return props.item.children && props.item.children.length > 0;
});

// Methods
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const toggleVisibility = () => {
  // Emit the toggle event with the updated item
  emit('toggle', {
    ...props.item,
    active: isActive.value
  });
};

const handleChildToggle = (child) => {
  // When a child is toggled, propagate the event up
  emit('toggle', child);
};

const getDefaultIcon = (item) => {
  // Get a default icon based on item type
  if (!item || !item.type) return 'mdi-help-circle-outline';
  
  switch (item.type) {
    case 'camera':
      return 'mdi-camera';
    case 'light':
      return 'mdi-lightbulb';
    case 'mesh':
      return 'mdi-cube-outline';
    case 'group':
      return 'mdi-folder-outline';
    case 'helper':
      return 'mdi-ruler';
    case 'scene':
      return 'mdi-view-dashboard';
    default:
      return 'mdi-shape-outline';
  }
};
</script>

<style scoped>
.scene-layer-item {
  position: relative;
}

.layer-item-header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
  min-height: 32px;
}

.layer-item-header:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.item-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
  transition: opacity 0.2s;
  padding: 0 4px;
}

.inactive-item {
  opacity: 0.6;
}

.visibility-hidden {
  visibility: hidden;
}

.item-children {
  margin-top: 2px;
}
</style> 