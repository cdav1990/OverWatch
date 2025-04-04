<template>
  <div class="scene-layer-manager" :class="{ collapsed: isCollapsed }" ref="managerEl" :style="positionStyle">
    <div class="panel-header" @mousedown="startDrag">
      <h3>Scene Layers</h3>
      <div class="header-buttons">
        <v-btn icon x-small @click.stop="toggleAllLayers">
          <v-icon>{{ allLayersActive ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
          <v-tooltip activator="parent" location="top">Toggle All Layers</v-tooltip>
        </v-btn>
        <v-btn icon x-small @click.stop="toggleExpand">
          <v-icon>{{ isExpanded ? 'mdi-arrow-collapse' : 'mdi-arrow-expand' }}</v-icon>
          <v-tooltip activator="parent" location="top">{{ isExpanded ? 'Collapse' : 'Expand' }}</v-tooltip>
        </v-btn>
        <v-btn icon x-small @click.stop="togglePanel">
          <v-icon>{{ isCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
          <v-tooltip activator="parent" location="top">{{ isCollapsed ? 'Show' : 'Hide' }}</v-tooltip>
        </v-btn>
      </div>
    </div>

    <div v-if="!isCollapsed" class="panel-content" :style="contentStyle">
      <div class="search-container">
        <v-text-field
          v-model="searchQuery"
          density="compact"
          variant="outlined"
          label="Search layers"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          class="mb-3"
        ></v-text-field>
      </div>

      <div class="layer-categories">
        <!-- Scene Structure Tree -->
        <v-expansion-panels v-model="expandedPanels" multiple variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="panel-title">
                <v-icon color="primary" class="mr-2">mdi-cube-outline</v-icon>
                <span class="title-text">Scene Structure</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="layer-tree">
                <div class="tree-item root-item">
                  <div class="tree-item-header">
                    <v-icon class="mr-2" color="primary" size="small">mdi-cube-scan</v-icon>
                    <span class="item-name">Scene</span>
                    <v-spacer></v-spacer>
                    <v-checkbox
                      v-model="sceneRootActive"
                      hide-details
                      density="compact"
                      color="primary"
                      @change="toggleSceneRoot"
                    ></v-checkbox>
                  </div>
                  <div class="tree-children">
                    <scene-layer-item
                      v-for="item in filteredSceneItems"
                      :key="item.id"
                      :item="item"
                      :depth="1"
                      @toggle="toggleLayerVisibility"
                    ></scene-layer-item>
                  </div>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Environment -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="panel-title">
                <v-icon color="success" class="mr-2">mdi-earth</v-icon>
                <span class="title-text">Environment</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="layer-grid">
                <div 
                  v-for="item in filteredEnvironmentItems" 
                  :key="item.id" 
                  class="layer-item"
                >
                  <v-icon size="small" :color="item.color" class="mr-2">{{ item.icon }}</v-icon>
                  <span class="item-name">{{ item.name }}</span>
                  <v-spacer></v-spacer>
                  <v-checkbox
                    v-model="item.active"
                    hide-details
                    density="compact"
                    :color="item.color"
                    @change="toggleEnvironmentItem(item)"
                  ></v-checkbox>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Visual Effects -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="panel-title">
                <v-icon color="info" class="mr-2">mdi-image-filter-drama</v-icon>
                <span class="title-text">Visual Effects</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="layer-grid">
                <div 
                  v-for="item in filteredEffectItems" 
                  :key="item.id" 
                  class="layer-item"
                >
                  <v-icon size="small" :color="item.color" class="mr-2">{{ item.icon }}</v-icon>
                  <span class="item-name">{{ item.name }}</span>
                  <v-spacer></v-spacer>
                  <v-checkbox
                    v-model="item.active"
                    hide-details
                    density="compact"
                    :color="item.color"
                    @change="toggleEffectItem(item)"
                  ></v-checkbox>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <div class="visibility-controls">
        <div class="control-section-title mb-2">Quick Toggles</div>
        <v-chip-group>
          <v-chip 
            v-for="category in layerCategories" 
            :key="category.id"
            :color="category.active ? category.color : undefined"
            :variant="category.active ? 'elevated' : 'outlined'"
            size="small"
            class="ma-1"
            @click="toggleCategory(category)"
          >
            <v-icon size="small" start>{{ category.icon }}</v-icon>
            {{ category.name }}
          </v-chip>
        </v-chip-group>
      </div>

      <div class="resize-handle" @mousedown="startResize"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import SceneLayerItem from './SceneLayerItem.vue';

// Panel state
const isCollapsed = ref(true); // Start collapsed by default
const isExpanded = ref(false);
const expandedPanels = ref([0]); // Open first panel by default
const searchQuery = ref('');
const sceneRootActive = ref(true);

// Position and size state for dragging and resizing
const position = ref({ x: null, y: null });
const size = ref({ width: 350, height: null });
const managerEl = ref(null);
const isDragging = ref(false);
const isResizing = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// Computed styles
const positionStyle = computed(() => {
  // If panel is collapsed, use default right-side position
  if (isCollapsed.value) {
    return {
      right: '0',
      top: '80px'
    };
  }
  
  // When explicitly positioned by dragging
  if (position.value.x !== null && position.value.y !== null) {
    return {
      top: `${position.value.y}px`,
      left: `${position.value.x}px`,
      right: 'auto',
      width: size.value.width ? `${size.value.width}px` : null,
      height: size.value.height ? `${size.value.height}px` : null
    };
  }
  
  // Default to center position when first opened
  return {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    right: 'auto',
    width: `${size.value.width}px`,
    maxHeight: '80vh'
  };
});

const contentStyle = computed(() => {
  if (!isExpanded.value) return {};
  
  return {
    height: '60vh',
    width: '100%'
  };
});

// Scene Structure data
const sceneItems = ref([
  {
    id: 'scene-root',
    name: 'Scene Root',
    type: 'scene',
    icon: 'mdi-view-dashboard',
    active: true,
    children: [
      {
        id: 'camera',
        name: 'Camera',
        type: 'camera',
        icon: 'mdi-camera',
        active: true,
        children: []
      },
      {
        id: 'lights',
        name: 'Lights',
        type: 'group',
        icon: 'mdi-lightbulb-group',
        active: true,
        children: [
          {
            id: 'ambient-light',
            name: 'Ambient Light',
            type: 'light',
            icon: 'mdi-lightbulb',
            color: 'amber',
            active: true,
            children: []
          },
          {
            id: 'directional-light',
            name: 'Directional Light',
            type: 'light',
            icon: 'mdi-lightbulb-on',
            color: 'amber',
            active: true,
            children: []
          }
        ]
      },
      {
        id: 'grid',
        name: 'Grid',
        type: 'helper',
        icon: 'mdi-grid',
        color: 'grey',
        active: true,
        children: []
      },
      {
        id: 'objects',
        name: 'Objects',
        type: 'group',
        icon: 'mdi-shape',
        active: true,
        children: [
          {
            id: 'ground-plane',
            name: 'Ground Plane',
            type: 'mesh',
            icon: 'mdi-square-outline',
            color: 'brown',
            active: true,
            children: []
          },
          {
            id: 'user-objects',
            name: 'User Objects',
            type: 'group',
            icon: 'mdi-cube-outline',
            color: 'primary',
            active: true,
            children: [
              {
                id: 'box-1',
                name: 'Box 1',
                type: 'mesh',
                icon: 'mdi-cube-outline',
                color: 'primary',
                active: true,
                children: []
              },
              {
                id: 'cylinder-1',
                name: 'Cylinder 1',
                type: 'mesh',
                icon: 'mdi-cylinder',
                color: 'primary',
                active: true,
                children: []
              }
            ]
          }
        ]
      }
    ]
  }
]);

// Environment items
const environmentItems = ref([
  { id: 'grid', name: 'Grid', icon: 'mdi-grid', color: 'grey', active: true },
  { id: 'ground', name: 'Ground', icon: 'mdi-grass', color: 'green', active: true },
  { id: 'skybox', name: 'Skybox', icon: 'mdi-weather-sunny', color: 'blue', active: true },
  { id: 'fog', name: 'Fog', icon: 'mdi-weather-fog', color: 'grey', active: false },
  { id: 'ambient-light', name: 'Ambient Light', icon: 'mdi-lightbulb', color: 'amber', active: true },
  { id: 'directional-light', name: 'Directional Light', icon: 'mdi-lightbulb-on', color: 'amber', active: true }
]);

// Visual effect items
const effectItems = ref([
  { id: 'shadows', name: 'Shadows', icon: 'mdi-border-none-variant', color: 'grey-darken-1', active: true },
  { id: 'ssao', name: 'Ambient Occlusion', icon: 'mdi-gradient-vertical', color: 'grey-darken-2', active: false },
  { id: 'bloom', name: 'Bloom', icon: 'mdi-flare', color: 'deep-orange', active: false },
  { id: 'toneMapping', name: 'Tone Mapping', icon: 'mdi-brightness-6', color: 'amber', active: true },
  { id: 'antialiasing', name: 'Anti-Aliasing', icon: 'mdi-vector-line', color: 'indigo', active: true }
]);

// Layer categories for quick toggling
const layerCategories = ref([
  { id: 'meshes', name: 'Meshes', icon: 'mdi-cube-outline', color: 'primary', active: true },
  { id: 'lights', name: 'Lights', icon: 'mdi-lightbulb-group', color: 'amber', active: true },
  { id: 'helpers', name: 'Helpers', icon: 'mdi-tools', color: 'grey', active: true },
  { id: 'effects', name: 'Effects', icon: 'mdi-image-filter', color: 'purple', active: true }
]);

// Computed properties for filtering
const filteredSceneItems = computed(() => {
  if (!searchQuery.value) return sceneItems.value;
  
  // Deep filter function
  const filterTreeItems = (items) => {
    return items.filter(item => {
      // Check if this item matches
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
      
      // Check children recursively
      let filteredChildren = [];
      if (item.children && item.children.length > 0) {
        filteredChildren = filterTreeItems(item.children);
      }
      
      // Clone item with filtered children
      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...item,
          children: filteredChildren
        };
      }
      
      return false;
    });
  };
  
  return filterTreeItems(sceneItems.value);
});

const filteredEnvironmentItems = computed(() => {
  if (!searchQuery.value) return environmentItems.value;
  
  return environmentItems.value.filter(item => 
    item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const filteredEffectItems = computed(() => {
  if (!searchQuery.value) return effectItems.value;
  
  return effectItems.value.filter(item => 
    item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const allLayersActive = computed(() => {
  // Check if all items are active
  const allEnvironmentActive = environmentItems.value.every(item => item.active);
  const allEffectsActive = effectItems.value.every(item => item.active);
  
  // Recursively check scene items
  const checkAllActive = (items) => {
    return items.every(item => {
      if (!item.active) return false;
      if (item.children && item.children.length > 0) {
        return checkAllActive(item.children);
      }
      return true;
    });
  };
  
  const allSceneActive = checkAllActive(sceneItems.value);
  
  return allEnvironmentActive && allEffectsActive && allSceneActive;
});

// Drag and resize methods
const startDrag = (event) => {
  // Don't initiate drag if clicking buttons
  if (event.target.closest('button') || event.target.closest('.v-btn')) {
    return;
  }
  
  isDragging.value = true;
  
  const rect = managerEl.value.getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  
  // Set initial position if not already set
  if (!position.value.x && !position.value.y) {
    position.value = {
      x: rect.left,
      y: rect.top
    };
  }
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
};

const handleDrag = (event) => {
  if (!isDragging.value) return;
  
  position.value = {
    x: event.clientX - dragOffset.value.x,
    y: event.clientY - dragOffset.value.y
  };
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
};

const startResize = (event) => {
  isResizing.value = true;
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = size.value.width;
  const startHeight = managerEl.value.getBoundingClientRect().height;
  
  const handleResize = (e) => {
    if (isResizing.value) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      size.value = {
        width: Math.max(200, startWidth + dx),
        height: Math.max(300, startHeight + dy)
      };
    }
  };
  
  const stopResize = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };
  
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
};

// UI control methods
const togglePanel = () => {
  isCollapsed.value = !isCollapsed.value;
  
  // Auto center and expand when opening for the first time
  if (!isCollapsed.value && position.value.x === null && position.value.y === null) {
    // Auto expand on first open
    isExpanded.value = true;
  }
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

// Methods
const toggleLayerVisibility = (item) => {
  // This would update the actual Three.js object visibility
  console.log(`Toggling visibility for ${item.name} (${item.id}): ${item.active}`);
  
  // In a real implementation, you'd find the actual object by UUID and set its visibility
  // Example: scene.getObjectByProperty('uuid', item.id).visible = item.active;
  
  // Update parent visibility based on children
  updateParentVisibility(sceneItems.value);
};

const toggleSceneRoot = () => {
  // Set all items to match the root state
  const setAllVisible = (items, isVisible) => {
    items.forEach(item => {
      item.active = isVisible;
      if (item.children && item.children.length > 0) {
        setAllVisible(item.children, isVisible);
      }
    });
  };
  
  setAllVisible(sceneItems.value, sceneRootActive.value);
  
  // This would update all Three.js objects' visibility
  console.log(`Setting all scene objects to ${sceneRootActive.value ? 'visible' : 'hidden'}`);
};

const toggleEnvironmentItem = (item) => {
  // This would update the actual Three.js object visibility
  console.log(`Toggling environment item ${item.name}: ${item.active}`);
  
  // Example: Find matching object in scene and update visibility
  // const object = scene.getObjectByName(item.id);
  // if (object) object.visible = item.active;
};

const toggleEffectItem = (item) => {
  // This would enable/disable the post-processing effect
  console.log(`Toggling effect ${item.name}: ${item.active}`);
  
  // Example implementation
  // renderer.postProcessing[item.id].enabled = item.active;
};

const toggleAllLayers = () => {
  const newState = !allLayersActive.value;
  
  // Update all layers to the new state
  sceneRootActive.value = newState;
  toggleSceneRoot();
  
  environmentItems.value.forEach(item => {
    item.active = newState;
    toggleEnvironmentItem(item);
  });
  
  effectItems.value.forEach(item => {
    item.active = newState;
    toggleEffectItem(item);
  });
};

const toggleCategory = (category) => {
  // Toggle the category state
  category.active = !category.active;
  
  // Set visibility for all matching items
  const updateCategoryVisibility = (items, categoryId, isVisible) => {
    items.forEach(item => {
      // Match by type or other properties
      if (
        (categoryId === 'meshes' && (item.type === 'mesh' || item.type === 'scene')) ||
        (categoryId === 'lights' && item.type === 'light') ||
        (categoryId === 'helpers' && item.type === 'helper') ||
        (categoryId === 'effects' && item.id in effectItems.value.map(e => e.id))
      ) {
        item.active = isVisible;
        toggleLayerVisibility(item);
      }
      
      // Recursive check for children
      if (item.children && item.children.length > 0) {
        updateCategoryVisibility(item.children, categoryId, isVisible);
      }
    });
  };
  
  if (category.id === 'effects') {
    effectItems.value.forEach(item => {
      item.active = category.active;
      toggleEffectItem(item);
    });
  } else {
    // Update scene items that match this category
    updateCategoryVisibility(sceneItems.value, category.id, category.active);
    
    // Also update environment items if they match
    if (category.id === 'lights') {
      environmentItems.value
        .filter(item => item.id.includes('light'))
        .forEach(item => {
          item.active = category.active;
          toggleEnvironmentItem(item);
        });
    }
  }
};

// Helper to update parent visibility based on children
const updateParentVisibility = (items, parent = null) => {
  items.forEach(item => {
    if (item.children && item.children.length > 0) {
      // Recursively update deeper children first
      updateParentVisibility(item.children, item);
      
      // Set parent active state based on all children being active
      const allChildrenActive = item.children.every(child => child.active);
      item.active = allChildrenActive;
    }
  });
  
  // Update the root checkbox state
  if (!parent) {
    sceneRootActive.value = items.every(item => item.active);
  }
};

// Update scene from Three.js
const updateSceneStructure = (threeScene) => {
  if (!threeScene) return;
  
  // This would traverse the Three.js scene and build the structure
  // Simplified example - in a real app you'd traverse the entire scene graph
  const buildSceneTree = (object, parentId = null) => {
    const item = {
      id: object.uuid,
      name: object.name || object.type,
      type: getObjectType(object),
      icon: getObjectIcon(object),
      color: getObjectColor(object),
      active: object.visible,
      children: []
    };
    
    // Add children
    if (object.children && object.children.length > 0) {
      item.children = object.children
        .filter(child => !child.userData.excludeFromLayerManager)
        .map(child => buildSceneTree(child, item.id));
    }
    
    return item;
  };
  
  // Helper functions
  const getObjectType = (object) => {
    if (object.isCamera) return 'camera';
    if (object.isLight) return 'light';
    if (object.isMesh) return 'mesh';
    if (object.isGroup) return 'group';
    if (object.isHelper) return 'helper';
    return 'object';
  };
  
  const getObjectIcon = (object) => {
    if (object.isCamera) return 'mdi-camera';
    if (object.isAmbientLight) return 'mdi-lightbulb';
    if (object.isDirectionalLight) return 'mdi-lightbulb-on';
    if (object.isPointLight) return 'mdi-lightbulb-outline';
    if (object.isSpotLight) return 'mdi-spotlight';
    if (object.isMesh) {
      if (object.geometry.type.includes('Box')) return 'mdi-cube-outline';
      if (object.geometry.type.includes('Sphere')) return 'mdi-sphere';
      if (object.geometry.type.includes('Cylinder')) return 'mdi-cylinder';
      if (object.geometry.type.includes('Plane')) return 'mdi-square-outline';
      return 'mdi-shape-outline';
    }
    if (object.isGroup) return 'mdi-view-grid-outline';
    if (object.isHelper) return 'mdi-tools';
    return 'mdi-cube-scan';
  };
  
  const getObjectColor = (object) => {
    if (object.isLight) return 'amber';
    if (object.isHelper) return 'grey';
    if (object.isMesh && object.material && object.material.color) {
      // Try to match the object's color to a Vuetify color
      const color = object.material.color;
      if (color.r > 0.7 && color.g < 0.3 && color.b < 0.3) return 'red';
      if (color.r < 0.3 && color.g > 0.7 && color.b < 0.3) return 'green';
      if (color.r < 0.3 && color.g < 0.3 && color.b > 0.7) return 'blue';
      return 'primary';
    }
    return 'primary';
  };
  
  // Build the scene tree starting from the scene root
  sceneItems.value = [buildSceneTree(threeScene)];
};

// Lifecycle hooks
onMounted(() => {
  // Original onMounted code
  console.log('Scene layer manager mounted');
  
  // Cleanup event listeners on component destruction
  onUnmounted(() => {
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
  });
});

// Watch for changes in scene structure and sync visibility
watch(sceneItems, () => {
  updateParentVisibility(sceneItems.value);
}, { deep: true });

// Update methods in defineExpose to include panel positioning functions
defineExpose({
  updateSceneStructure,
  expandAll: () => expandedPanels.value = [0, 1, 2],
  collapseAll: () => expandedPanels.value = [],
  togglePanel: () => {
    isCollapsed.value = !isCollapsed.value;
  },
  isPanelVisible: () => !isCollapsed.value,
  centerPanel: () => {
    // Reset position to center panel
    position.value = { x: null, y: null };
    // Expand panel when centered
    isExpanded.value = true;
  }
});
</script>

<style scoped>
.scene-layer-manager {
  position: fixed;
  top: 80px;
  right: 0;
  width: 350px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 990;
  max-height: calc(100vh - 100px);
}

.scene-layer-manager.collapsed {
  transform: translateX(350px); /* Completely off-screen */
  width: 350px;
  right: 0;
  left: auto;
  top: 80px;
  opacity: 0; /* Make it completely invisible */
  pointer-events: none; /* Prevent any interaction while hidden */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(33, 150, 243, 0.9);
  color: white;
  cursor: move;
  flex-shrink: 0;
  user-select: none;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: auto;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  transition: height 0.3s ease, width 0.3s ease;
}

.search-container {
  padding: 0 0 8px 0;
}

.layer-categories {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 8px;
}

.panel-title {
  display: flex;
  align-items: center;
  font-weight: 500;
  white-space: nowrap;
}

.title-text {
  font-size: 14px;
  margin-left: 4px;
}

.layer-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.layer-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.item-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 4px;
}

.layer-tree {
  margin-left: -8px;
  padding: 8px 0;
}

.tree-item {
  margin-bottom: 4px;
}

.root-item > .tree-item-header {
  font-weight: 500;
}

.tree-item-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.tree-item-header:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.tree-children {
  padding-left: 24px;
  margin-top: 2px;
}

.visibility-controls {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.control-section-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 8px;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(33, 150, 243, 0.3) 50%);
  border-radius: 0 0 8px 0;
}

/* Responsive handling */
@media (max-width: 600px) {
  .scene-layer-manager {
    width: 280px;
  }
  
  .scene-layer-manager.collapsed {
    transform: translateX(250px);
  }
}

/* Ensure proper spacing for expansion panels */
:deep(.v-expansion-panel-title) {
  padding: 12px 16px;
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 0 8px 16px;
}
</style> 