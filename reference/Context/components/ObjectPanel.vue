<template>
  <div class="object-panel">
    <div class="panel-header">
      <h3>Scene Objects</h3>
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            icon="mdi-dots-vertical"
            variant="text"
            size="small"
            v-bind="props"
          />
        </template>
        <v-list density="compact">
          <v-list-item @click="exportObjects">
            <template v-slot:prepend>
              <v-icon icon="mdi-export" size="small" />
            </template>
            <v-list-item-title>Export Objects</v-list-item-title>
          </v-list-item>
          <v-list-item @click="importObjects">
            <template v-slot:prepend>
              <v-icon icon="mdi-import" size="small" />
            </template>
            <v-list-item-title>Import Objects</v-list-item-title>
          </v-list-item>
          <v-divider />
          <v-list-item @click="clearObjects">
            <template v-slot:prepend>
              <v-icon icon="mdi-delete-sweep" size="small" color="error" />
            </template>
            <v-list-item-title class="text-error">Clear All</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <!-- Object Type Filter Tabs -->
    <div class="object-filter">
      <div
        v-for="type in objectTypes"
        :key="type.value"
        class="filter-tab"
        :class="{ active: activeFilter === type.value }"
        @click="activeFilter = type.value"
      >
        <v-icon :icon="type.icon" size="small" class="mr-1" />
        <span>{{ type.label }}</span>
        <span class="count" v-if="getObjectCount(type.value)">
          {{ getObjectCount(type.value) }}
        </span>
      </div>
    </div>

    <!-- Object Library (Add Mode) -->
    <div v-if="mode === 'add'" class="object-library">
      <h4>Add Objects</h4>
      <div class="library-grid">
        <div
          v-for="model in filteredModels"
          :key="model.key"
          class="library-item"
          :class="{ selected: selectedModel === model.key }"
          @click="selectModel(model.key)"
        >
          <div class="model-preview" :class="model.type">
            <v-icon :icon="model.icon" size="large" />
          </div>
          <div class="model-name">{{ model.label }}</div>
        </div>
      </div>

      <div class="drawing-controls">
        <v-btn 
          block 
          color="primary" 
          @click="startDrawing" 
          :disabled="isDrawing"
        >
          <v-icon icon="mdi-cursor-default-click" class="mr-2" />
          Place on Map
        </v-btn>
        <div v-if="isDrawing" class="drawing-active">
          <v-icon icon="mdi-information-outline" color="info" size="small" class="mr-2" />
          Click on the map to place the object
        </div>
      </div>
    </div>

    <!-- Object List (View Mode) -->
    <div v-else-if="mode === 'list'" class="object-list">
      <div class="list-header">
        <h4>Scene Objects</h4>
        <v-btn 
          variant="text" 
          color="primary" 
          size="small"
          @click="mode = 'add'"
        >
          <v-icon icon="mdi-plus" class="mr-1" />
          Add
        </v-btn>
      </div>

      <div v-if="filteredObjects.length === 0" class="empty-state">
        <v-icon icon="mdi-cube-outline" size="large" color="grey-lighten-1" />
        <p>No objects added yet</p>
        <v-btn 
          variant="text" 
          color="primary" 
          @click="mode = 'add'"
        >
          Add Objects
        </v-btn>
      </div>

      <div v-else class="objects-container">
        <div 
          v-for="(object, index) in filteredObjects" 
          :key="index"
          class="object-item"
          :class="{ selected: selectedObject === object }"
          @click="selectObjectItem(object)"
        >
          <div class="object-icon" :class="object.userData.type">
            <v-icon :icon="getIconForModel(object.userData.modelKey)" size="small" />
          </div>
          <div class="object-details">
            <div class="object-name">{{ object.userData.properties.name }}</div>
            <div class="object-coords">
              {{ formatCoordinates(object) }}
            </div>
          </div>
          <div class="object-actions">
            <v-btn
              icon="mdi-pencil"
              variant="text"
              size="x-small"
              @click.stop="editObject(object)"
            />
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="x-small"
              color="error"
              @click.stop="removeObjectItem(object)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Object Edit Form (Edit Mode) -->
    <div v-else-if="mode === 'edit' && editingObject" class="object-edit">
      <div class="edit-header">
        <h4>Edit Object</h4>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="cancelEdit"
        />
      </div>

      <div class="edit-form">
        <v-text-field
          v-model="editForm.name"
          label="Name"
          density="comfortable"
          variant="outlined"
          class="mb-2"
        />

        <h5>Position</h5>
        <div class="position-inputs">
          <v-text-field
            v-model.number="editForm.position.x"
            label="East (m)"
            type="number"
            density="comfortable"
            variant="outlined"
            class="coord-input"
          />
          <v-text-field
            v-model.number="editForm.position.y"
            label="Up (m)"
            type="number"
            density="comfortable"
            variant="outlined"
            class="coord-input"
          />
          <v-text-field
            v-model.number="editForm.position.z"
            label="North (m)"
            type="number"
            density="comfortable"
            variant="outlined"
            class="coord-input"
          />
        </div>

        <h5>Properties</h5>
        <v-slider
          v-model="editForm.rotation"
          label="Rotation"
          min="0"
          max="359"
          step="1"
          thumb-label
          class="mb-2"
        >
          <template v-slot:append>
            <span>{{ editForm.rotation }}°</span>
          </template>
        </v-slider>

        <v-slider
          v-model="editForm.scale"
          label="Scale"
          min="0.1"
          max="5"
          step="0.1"
          thumb-label
          class="mb-2"
        >
          <template v-slot:append>
            <span>{{ editForm.scale }}x</span>
          </template>
        </v-slider>

        <div class="edit-actions">
          <v-btn variant="text" @click="cancelEdit">Cancel</v-btn>
          <v-btn color="primary" @click="saveEdit">Save</v-btn>
        </div>
      </div>
    </div>

    <!-- Import Dialog -->
    <v-dialog v-model="showImportDialog" max-width="500px">
      <v-card>
        <v-card-title>Import Objects</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="importFile"
            label="GeoJSON File"
            accept=".json,.geojson"
            prepend-icon="mdi-map"
            :show-size="true"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" text @click="showImportDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" @click="processImport" :disabled="!importFile">
            Import
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { 
  initObjectManager, 
  OBJECT_TYPES, 
  addObject, 
  removeObject, 
  updateObject,
  getObjectsByType,
  getAllObjects,
  setDrawingMode,
  isDrawingEnabled,
  exportObjectsAsGeoJSON,
  importObjectsFromGeoJSON,
  clearAllObjects
} from '../utils/objectManager'

// Props from parent
const props = defineProps({
  scene: Object,
  originCoordinates: Object
})

// Emit events to parent
const emit = defineEmits(['object-added', 'object-removed', 'object-updated', 'drawing-mode-changed'])

// Component state
const mode = ref('list') // 'list', 'add', 'edit'
const activeFilter = ref('all')
const selectedModel = ref('building')
const selectedObject = ref(null)
const editingObject = ref(null)
const editForm = ref({
  name: '',
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  scale: 1
})
const showImportDialog = ref(false)
const importFile = ref(null)

// Available object types for filtering
const objectTypes = [
  { value: 'all', label: 'All', icon: 'mdi-cube-outline' },
  { value: OBJECT_TYPES.ASSET, label: 'Assets', icon: 'mdi-office-building' },
  { value: OBJECT_TYPES.OBSTACLE, label: 'Obstacles', icon: 'mdi-alert' },
  { value: OBJECT_TYPES.NEUTRAL, label: 'Neutral', icon: 'mdi-tree' }
]

// Model definitions for the object library
const modelLibrary = [
  { key: 'building', label: 'Building', type: OBJECT_TYPES.ASSET, icon: 'mdi-office-building' },
  { key: 'solarpanel', label: 'Solar Panel', type: OBJECT_TYPES.ASSET, icon: 'mdi-solar-power' },
  { key: 'windturbine', label: 'Wind Turbine', type: OBJECT_TYPES.ASSET, icon: 'mdi-wind-turbine' },
  { key: 'powerline', label: 'Power Line', type: OBJECT_TYPES.OBSTACLE, icon: 'mdi-transmission-tower' },
  { key: 'tower', label: 'Tower', type: OBJECT_TYPES.OBSTACLE, icon: 'mdi-antenna' },
  { key: 'crane', label: 'Crane', type: OBJECT_TYPES.OBSTACLE, icon: 'mdi-crane' },
  { key: 'tree', label: 'Tree', type: OBJECT_TYPES.NEUTRAL, icon: 'mdi-tree' },
  { key: 'rock', label: 'Rock', type: OBJECT_TYPES.NEUTRAL, icon: 'mdi-mountain' },
  { key: 'water', label: 'Water', type: OBJECT_TYPES.NEUTRAL, icon: 'mdi-water' }
]

// Computed properties
const isDrawing = computed(() => isDrawingEnabled())

const filteredModels = computed(() => {
  if (activeFilter === 'all') {
    return modelLibrary
  }
  return modelLibrary.filter(model => model.type === activeFilter)
})

const filteredObjects = computed(() => {
  if (activeFilter === 'all') {
    return getAllObjects()
  }
  return getObjectsByType(activeFilter)
})

// Initialize object manager when scene is available
onMounted(() => {
  if (props.scene && props.originCoordinates) {
    initObjectManager(props.scene, props.originCoordinates)
  }
})

watch(() => props.scene, (newScene) => {
  if (newScene && props.originCoordinates) {
    initObjectManager(newScene, props.originCoordinates)
  }
})

// Methods
function getObjectCount(type) {
  if (type === 'all') {
    return getAllObjects().length
  }
  return getObjectsByType(type).length
}

function selectModel(modelKey) {
  selectedModel.value = modelKey
}

function startDrawing() {
  // Get the type from the selected model
  const modelInfo = modelLibrary.find(m => m.key === selectedModel.value)
  if (!modelInfo) return
  
  // Enable drawing mode
  setDrawingMode(true, modelInfo.type, selectedModel.value)
  emit('drawing-mode-changed', true)
}

function selectObjectItem(object) {
  selectedObject.value = object
}

function editObject(object) {
  editingObject.value = object
  
  // Initialize edit form with current values
  editForm.value = {
    name: object.userData.properties.name,
    position: {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z
    },
    rotation: object.userData.properties.rotation,
    scale: object.userData.properties.scale
  }
  
  mode.value = 'edit'
}

function cancelEdit() {
  editingObject.value = null
  mode.value = 'list'
}

function saveEdit() {
  if (!editingObject.value) return
  
  // Update object with new values
  updateObject(editingObject.value, {
    name: editForm.value.name,
    position: editForm.value.position,
    rotation: editForm.value.rotation,
    scale: editForm.value.scale
  })
  
  emit('object-updated', editingObject.value)
  
  // Return to list mode
  cancelEdit()
}

function removeObjectItem(object) {
  removeObject(object)
  emit('object-removed', object)
  
  if (selectedObject.value === object) {
    selectedObject.value = null
  }
  
  if (editingObject.value === object) {
    cancelEdit()
  }
}

function formatCoordinates(object) {
  if (!object.userData.enuCoords) return 'No coordinates'
  
  const { east, north, up } = object.userData.enuCoords
  return `E: ${east.toFixed(1)}m, N: ${north.toFixed(1)}m, U: ${up.toFixed(1)}m`
}

function getIconForModel(modelKey) {
  const model = modelLibrary.find(m => m.key === modelKey)
  return model ? model.icon : 'mdi-cube-outline'
}

function exportObjects() {
  const geoJSON = exportObjectsAsGeoJSON()
  
  // Create a download link
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geoJSON, null, 2))
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute("href", dataStr)
  downloadAnchorNode.setAttribute("download", "scene_objects.geojson")
  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

function importObjects() {
  showImportDialog.value = true
}

function processImport() {
  if (!importFile.value || !importFile.value[0]) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const geoJSON = JSON.parse(e.target.result)
      const success = importObjectsFromGeoJSON(geoJSON)
      
      if (success) {
        showImportDialog.value = false
        importFile.value = null
      }
    } catch (error) {
      console.error('Error importing GeoJSON:', error)
      // Show error message
    }
  }
  
  reader.readAsText(importFile.value[0])
}

function clearObjects() {
  clearAllObjects()
  selectedObject.value = null
  
  if (mode.value === 'edit') {
    cancelEdit()
  }
}
</script>

<style scoped>
.object-panel {
  background: var(--background-color);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-color);
}

.object-filter {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.filter-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  font-size: 0.8571428571rem;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.filter-tab:hover {
  background: rgba(0, 0, 0, 0.05);
}

.filter-tab.active {
  color: var(--primary-color);
}

.filter-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-color);
}

.filter-tab .count {
  font-size: 0.7142857143rem;
  background: #e0e0e0;
  color: #616161;
  border-radius: 10px;
  padding: 1px 6px;
  margin-left: 4px;
}

.object-library, .object-list, .object-edit {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.object-library h4, .object-list .list-header h4, .object-edit .edit-header h4 {
  margin: 0 0 16px 0;
  font-size: 0.9285714286rem;
  font-weight: 500;
  color: var(--text-color);
}

.list-header, .edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.library-item {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.library-item:hover {
  border-color: var(--primary-color);
}

.library-item.selected {
  border-color: var(--primary-color);
  background: rgba(25, 118, 210, 0.05);
}

.model-preview {
  padding: 16px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.model-preview.asset {
  background: rgba(76, 175, 80, 0.1);
}

.model-preview.obstacle {
  background: rgba(244, 67, 54, 0.1);
}

.model-preview.neutral {
  background: rgba(144, 164, 174, 0.1);
}

.model-name {
  padding: 8px;
  font-size: 0.7857142857rem;
  text-align: center;
  border-top: 1px solid var(--border-color);
}

.drawing-controls {
  margin-top: 20px;
}

.drawing-active {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(33, 150, 243, 0.1);
  border-radius: 4px;
  font-size: 0.7857142857rem;
  color: #2196f3;
  display: flex;
  align-items: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 12px 0;
  font-size: 0.8571428571rem;
}

.objects-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.object-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.object-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.object-item.selected {
  border-color: var(--primary-color);
  background: rgba(25, 118, 210, 0.05);
}

.object-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-right: 12px;
}

.object-icon.asset {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.object-icon.obstacle {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.object-icon.neutral {
  background: rgba(144, 164, 174, 0.1);
  color: #607d8b;
}

.object-details {
  flex: 1;
  min-width: 0;
}

.object-name {
  font-size: 0.8571428571rem;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.object-coords {
  font-size: 0.7142857143rem;
  color: var(--text-secondary);
}

.object-actions {
  display: flex;
  gap: 4px;
}

.edit-form h5 {
  margin: 16px 0 8px 0;
  font-size: 0.8571428571rem;
  font-weight: 500;
  color: var(--text-color);
}

.position-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
</style> 