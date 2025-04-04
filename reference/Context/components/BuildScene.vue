<template>
  <div class="backdrop" v-if="isExpanded" @click="toggleExpand"></div>
  <div class="build-scene" :class="{ 'closed': !isOpen, 'expanded': isExpanded }" data-component="build-scene">
    <div class="header">
      <h3>Step #2: Build Scene</h3>
      <div class="header-controls">
        <v-btn
          :icon="isExpanded ? 'mdi-arrow-collapse' : 'mdi-arrow-expand'"
          size="small"
          variant="text"
          color="white"
          class="expand-btn"
          @click="toggleExpand"
        ></v-btn>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          color="white"
          class="close-btn"
          @click="togglePanel"
        ></v-btn>
      </div>
    </div>
    
    <div class="scene-content">
      <v-tabs :model-value="getActiveTab()" @update:model-value="setActiveTab" color="primary" grow>
        <v-tab value="objects">
          <v-icon start>mdi-cube-scan</v-icon>
          Objects
        </v-tab>
        <v-tab value="import">
          <v-icon start>mdi-import</v-icon>
          Import
        </v-tab>
        <v-tab value="export">
          <v-icon start>mdi-export</v-icon>
          Export
        </v-tab>
      </v-tabs>
      
      <v-window :model-value="getActiveTab()" @update:model-value="setActiveTab" class="tab-content">
        <!-- Objects Tab -->
        <v-window-item value="objects">
          <div class="object-settings-section">
            <!-- Object Info Settings Section -->
            <div class="section">
              <div class="section-header" @click="objectInfoExpanded = !objectInfoExpanded">
                <h4 class="section-title">Object Info Settings</h4>
                <span class="toggle-icon">{{ objectInfoExpanded ? '▼' : '▶' }}</span>
              </div>
              <div v-show="objectInfoExpanded" class="section-content">
                <div class="settings-grid">
                  <div class="settings-column">
                    <h4 class="settings-subtitle">Object Dimensions</h4>
                    <div class="input-row">
                      <v-text-field
                        v-model.number="buildingWidth"
                        label="Width (m)"
                        type="number"
                        min="5"
                        max="500"
                        variant="outlined"
                        density="compact"
                        bg-color="rgba(0, 0, 0, 0.7)"
                        color="warning"
                      ></v-text-field>
                      
                      <v-text-field
                        v-model.number="buildingLength"
                        label="Length (m)"
                        type="number"
                        min="5"
                        max="500"
                        variant="outlined"
                        density="compact"
                        bg-color="rgba(0, 0, 0, 0.7)"
                        color="warning"
                      ></v-text-field>
                      
                      <v-text-field
                        v-model.number="buildingHeight"
                        label="Height (m)"
                        type="number"
                        min="5"
                        max="500"
                        variant="outlined"
                        density="compact"
                        bg-color="rgba(0, 0, 0, 0.7)"
                        color="warning"
                      ></v-text-field>
                    </div>
                    
                    <!-- Object Color in Object Dimensions section -->
                    <v-select
                      v-model="objectColor"
                      :items="['blue', 'red', 'green', 'yellow', 'purple', 'orange']"
                      label="Object Color"
                      variant="outlined"
                      density="compact"
                      bg-color="rgba(0, 0, 0, 0.7)"
                      color="warning"
                      class="mt-3"
                    ></v-select>
                    
                    <!-- Object Creation Button -->
                    <v-btn 
                      color="success" 
                      block 
                      class="mt-3" 
                      prepend-icon="mdi-cube-outline"
                      @click="createScanObject"
                      :loading="isLoading"
                      :disabled="isLoading"
                    >
                      Create 3D Object
                    </v-btn>
                    
                    <!-- Error message -->
                    <v-alert
                      v-if="errorMessage"
                      type="error"
                      variant="tonal"
                      class="mt-3"
                      closable
                      @click:close="errorMessage = ''"
                    >
                      {{ errorMessage }}
                    </v-alert>
                    
                    <!-- Success message -->
                    <v-alert
                      v-if="successMessage"
                      type="success"
                      variant="tonal"
                      class="mt-3"
                      closable
                      @click:close="successMessage = ''"
                    >
                      {{ successMessage }}
                    </v-alert>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Show existing objects in the scene -->
            <div class="section mt-4" v-if="sceneObjects.length > 0">
              <div class="section-header" @click="objectListExpanded = !objectListExpanded">
                <h4 class="section-title">Scene Objects</h4>
                <span class="toggle-icon">{{ objectListExpanded ? '▼' : '▶' }}</span>
              </div>
              <div v-show="objectListExpanded" class="section-content">
                <v-list bg-color="rgba(0, 0, 0, 0.5)">
                  <v-list-item
                    v-for="object in sceneObjects"
                    :key="object.id"
                    :title="`Object #${object.id.slice(0, 8)}`"
                    :subtitle="`${object.width}m × ${object.length}m × ${object.height}m`"
                    color="warning"
                    @click="selectObject(object.id)"
                    :active="buildStore.selectedObjectId === object.id"
                  >
                    <template v-slot:prepend>
                      <v-avatar :color="object.color" size="32"></v-avatar>
                    </template>
                    <template v-slot:append>
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        color="error"
                        variant="text"
                        @click="(e) => removeObject(object.id, e)"
                        :loading="isLoading"
                        :disabled="isLoading"
                      ></v-btn>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
            </div>
          </div>
        </v-window-item>
        
        <!-- Import Tab -->
        <v-window-item value="import">
          <v-card flat>
            <v-card-title>Import Data</v-card-title>
            <v-card-text>
              <v-file-input
                label="Import GeoJSON, KML, or 3D Model"
                prepend-icon="mdi-file-upload"
                @change="handleFileImport"
                accept=".geojson,.kml,.glb,.gltf"
                show-size
                chips
              ></v-file-input>
              
              <v-alert
                type="info"
                variant="tonal"
                class="mt-4"
              >
                Supported file formats: GeoJSON, KML, GLB, GLTF
              </v-alert>
            </v-card-text>
          </v-card>
        </v-window-item>
        
        <!-- Export Tab -->
        <v-window-item value="export">
          <v-card flat>
            <v-card-title>Export Scene</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12">
                  <v-btn
                    color="primary"
                    prepend-icon="mdi-export"
                    block
                    @click="exportScene"
                    :disabled="!hasSceneObjects"
                  >
                    Export Scene
                  </v-btn>
                </v-col>
                <v-col cols="12">
                  <v-select
                    v-model="exportFormat"
                    label="Export Format"
                    :items="['glb', 'gltf', 'geojson']"
                    variant="outlined"
                  ></v-select>
                </v-col>
              </v-row>
              
              <v-alert
                type="info"
                variant="tonal"
                class="mt-4"
                v-if="!hasSceneObjects"
              >
                Create objects in the scene first to enable export.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
      
      <!-- Continue Button -->
      <div class="continue-button-container mt-4 pa-4 d-flex justify-end">
        <v-btn
          color="primary"
          prepend-icon="mdi-arrow-right"
          @click="completeStep"
          :disabled="!buildStore.hasObjects"
        >
          Continue to Hardware Selection
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useBuildStore } from '../store/buildStore';
import { showNotification } from '../utils/notifications';

// Store reference
const buildStore = useBuildStore();

// Panel state
const isOpen = ref(true);
const isExpanded = ref(false);
const activeTab = ref('objects');
const objectInfoExpanded = ref(true);
const objectListExpanded = ref(true);

// Object creation properties
const buildingWidth = ref(100);
const buildingLength = ref(300);
const buildingHeight = ref(300);
const objectColor = ref('blue');

// Scene objects array to track created objects
const sceneObjects = ref([]);

// UI state
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// Export options
const exportFormat = ref('glb');
const hasSceneObjects = computed(() => sceneObjects.value.length > 0);

// Define emits
const emit = defineEmits(['toggle-panel', 'completed']);

// Set of UUIDs we've processed to avoid duplicates
const processedIds = ref(new Set());

// Generate a UUID for object tracking
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Create a new 3D object
const createScanObject = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    
    // Generate a unique ID for the object
    const uuid = generateUUID();
    
    // Add to our processed IDs set to prevent duplicates
    processedIds.value.add(uuid);
    
    // Calculate offset for new object based on number of existing objects
    // This ensures objects don't stack on top of each other
    const objectCount = sceneObjects.value.length;
    const offsetX = objectCount * 20; // Offset each object by 20 meters in X direction
    const offsetZ = objectCount * 10; // Offset each object by 10 meters in Z direction
    
    // Create object data
    const newObject = {
      id: uuid,
      width: buildingWidth.value,
      length: buildingLength.value,
      height: buildingHeight.value,
      color: objectColor.value,
      position: {
        x: offsetX, // Position with offset to avoid stacking
        y: 0, // Ground level
        z: offsetZ // Position with offset
      },
      opacity: 1.0,
      isDraggable: true,
      createdAt: new Date().toISOString(),
      userCreated: true,
      source: 'build-scene-ui'
    };
    
    console.log(`Creating new object with ID: ${uuid} at position (${offsetX}, 0, ${offsetZ})`);
    
    // Add to our local tracking array
    sceneObjects.value.push(newObject);
    
    // Add to store
    buildStore.addObject(newObject);
    
    // Create a visualization of the building by dispatching an event
    const creationPromise = new Promise((resolve, reject) => {
      // Set up a listener for the success event
      const successListener = (event) => {
        if (event.detail && event.detail.id === uuid) {
          window.removeEventListener('scan-object-created-success', successListener);
          window.removeEventListener('scan-object-created-error', errorListener);
          resolve(event.detail);
        }
      };
      
      // Set up a listener for the error event
      const errorListener = (event) => {
        if (event.detail && event.detail.id === uuid) {
          window.removeEventListener('scan-object-created-success', successListener);
          window.removeEventListener('scan-object-created-error', errorListener);
          reject(new Error(event.detail.message || 'Failed to create 3D object'));
        }
      };
      
      // Add the event listeners
      window.addEventListener('scan-object-created-success', successListener);
      window.addEventListener('scan-object-created-error', errorListener);
      
      // Dispatch the event to create the object
      window.dispatchEvent(new CustomEvent('create-scan-object', {
        detail: {
          ...newObject,
          uuid: uuid, // Include UUID in the event detail
          createGroundPlane: false,
          createSecondaryObject: false,
          showWireframe: false,
          centerInScene: false,
          userCreated: true,
          source: 'build-scene-ui',
          isNewObject: true, // Flag indicating this is a new object, not a replacement
          replaceExisting: false // Explicitly tell the scene not to replace objects
        }
      }));
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        window.removeEventListener('scan-object-created-success', successListener);
        window.removeEventListener('scan-object-created-error', errorListener);
        resolve({ id: uuid, status: 'timeout', message: 'Operation completed but no confirmation received' });
      }, 5000);
    });
    
    // Wait for the creation promise to resolve
    await creationPromise;
    
    successMessage.value = '3D object created successfully';
    
    // Clear success message after a delay
    setTimeout(() => {
      if (successMessage.value === '3D object created successfully') {
        successMessage.value = '';
      }
    }, 3000);
    
    showNotification({
      message: '3D object created successfully',
      color: 'success',
      timeout: 3000
    });
  } catch (error) {
    console.error('Error creating 3D object:', error);
    errorMessage.value = error.message || 'Failed to create 3D object';
    
    // Remove the object from our tracking arrays if creation failed
    const index = sceneObjects.value.findIndex(obj => obj.id === uuid);
    if (index !== -1) {
      sceneObjects.value.splice(index, 1);
    }
    
    buildStore.removeObjectById(uuid);
    
    showNotification({
      message: `Error: ${errorMessage.value}`,
      color: 'error',
      timeout: 5000
    });
  } finally {
    isLoading.value = false;
  }
};

// Remove an object from the scene by UUID
const removeObject = async (id, event) => {
  // Prevent the click event from bubbling up to the list item
  if (event) {
    event.stopPropagation();
  }
  
  try {
    isLoading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    
    // Find object index in the array
    const index = sceneObjects.value.findIndex(obj => obj.id === id);
    
    if (index === -1) {
      console.error(`Object with ID ${id} not found`);
      errorMessage.value = `Object with ID ${id} not found`;
      return;
    }
    
    // Create a promise to track the removal
    const removalPromise = new Promise((resolve, reject) => {
      // Set up a listener for the success event
      const successListener = (event) => {
        if (event.detail && event.detail.objectId === id) {
          window.removeEventListener('scene-object-removed-success', successListener);
          window.removeEventListener('scene-object-removed-error', errorListener);
          resolve(event.detail);
        }
      };
      
      // Set up a listener for the error event
      const errorListener = (event) => {
        if (event.detail && event.detail.objectId === id) {
          window.removeEventListener('scene-object-removed-success', successListener);
          window.removeEventListener('scene-object-removed-error', errorListener);
          reject(new Error(event.detail.message || 'Failed to remove object'));
        }
      };
      
      // Add the event listeners
      window.addEventListener('scene-object-removed-success', successListener);
      window.addEventListener('scene-object-removed-error', errorListener);
      
      // Dispatch event to remove from scene
      window.dispatchEvent(new CustomEvent('remove-scene-object', {
        detail: {
          objectId: id
        }
      }));
      
      // Set a timeout to resolve the promise if no response is received
      setTimeout(() => {
        window.removeEventListener('scene-object-removed-success', successListener);
        window.removeEventListener('scene-object-removed-error', errorListener);
        resolve({ objectId: id, status: 'timeout', message: 'Operation completed but no confirmation received' });
      }, 5000);
    });
    
    // Wait for the removal promise to resolve
    await removalPromise;
    
    // Remove from our tracking array
    sceneObjects.value.splice(index, 1);
    
    // Remove from processed IDs set
    processedIds.value.delete(id);
    
    // Remove from store
    buildStore.removeObjectById(id);
    
    successMessage.value = 'Object removed from scene';
    
    // Clear success message after a delay
    setTimeout(() => {
      if (successMessage.value === 'Object removed from scene') {
        successMessage.value = '';
      }
    }, 3000);
    
    showNotification({
      message: 'Object removed from scene',
      color: 'info',
      timeout: 3000
    });
  } catch (error) {
    console.error(`Error removing object with ID ${id}:`, error);
    errorMessage.value = error.message || 'Failed to remove object';
    
    showNotification({
      message: `Error: ${errorMessage.value}`,
      color: 'error',
      timeout: 5000
    });
  } finally {
    isLoading.value = false;
  }
};

// Handle file import
const handleFileImport = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // Process file based on extension
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.geojson') || fileName.endsWith('.kml')) {
    // Handle GeoJSON or KML import
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Generate a unique ID for the imported data
        const uuid = generateUUID();
        
        // Dispatch event with file content
        window.dispatchEvent(new CustomEvent('import-geo-data', {
          detail: {
            id: uuid,
            content: e.target.result,
            format: fileName.endsWith('.geojson') ? 'geojson' : 'kml'
          }
        }));
        
        showNotification({
          message: `${fileName.endsWith('.geojson') ? 'GeoJSON' : 'KML'} data imported successfully`,
          color: 'success',
          timeout: 3000
        });
      } catch (error) {
        showNotification({
          message: `Error importing file: ${error.message}`,
          color: 'error',
          timeout: 5000
        });
      }
    };
    reader.readAsText(file);
  } else if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
    // Handle 3D model import
    // Create a temporary URL for the file
    const objectUrl = URL.createObjectURL(file);
    
    // Generate a unique ID for the model
    const uuid = generateUUID();
    
    // Dispatch event to load the 3D model
    window.dispatchEvent(new CustomEvent('import-3d-model', {
      detail: {
        id: uuid,
        url: objectUrl,
        format: fileName.endsWith('.glb') ? 'glb' : 'gltf',
        fileName: file.name
      }
    }));
    
    showNotification({
      message: '3D model importing. Please wait...',
      color: 'info',
      timeout: 3000
    });
  }
};

// Export the scene
const exportScene = () => {
  // Dispatch event to export the scene in the selected format
  window.dispatchEvent(new CustomEvent('export-scene', {
    detail: {
      format: exportFormat.value,
      objects: sceneObjects.value.map(obj => obj.id) // Send object IDs instead of objects
    }
  }));
  
  showNotification({
    message: `Exporting scene as ${exportFormat.value.toUpperCase()}...`,
    color: 'info',
    timeout: 3000
  });
};

// Complete the build scene step
const completeStep = () => {
  emit('completed');
  
  showNotification({
    message: 'Scene building completed. Moving to hardware selection.',
    color: 'success',
    timeout: 3000
  });
};

// Toggle panel open/closed
const togglePanel = () => {
  isOpen.value = !isOpen.value;
  buildStore.toggleBuildPanel();
  emit('toggle-panel');
};

// Toggle expanded state
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

// Get active tab
const getActiveTab = () => {
  return activeTab.value;
};

// Set active tab
const setActiveTab = (tab) => {
  activeTab.value = tab;
};

// Select an object
const selectObject = (id) => {
  buildStore.selectObjectById(id);
};

// Create properly scoped event handler references
const scanObjectCreatedHandler = event => {
  if (event.detail) {
    // Generate a unique ID if not provided
    const objectId = event.detail.id || event.detail.uuid || generateUUID();
    
    // Determine if this is a user-created object
    const isUserCreated = Boolean(
      event.detail.userCreated || 
      processedIds.value.has(objectId) || 
      event.detail.source === 'build-scene-ui'
    );
    
    // Log object creation
    console.log(`Object creation event: ${objectId}`, {
      source: event.detail.source || 'unknown',
      isUserCreated,
      fromProcessedIds: processedIds.value.has(objectId),
      dimensions: `${event.detail.width || 'unknown'}x${event.detail.length || 'unknown'}x${event.detail.height || 'unknown'}`,
      isNewObject: event.detail.isNewObject,
      replaceExisting: event.detail.replaceExisting
    });
    
    // Skip if we've already processed this ID - prevents duplicates
    if (processedIds.value.has(objectId)) {
      console.log(`Skipping already processed object: ${objectId}`);
      return;
    }
    
    // Skip objects that aren't explicitly marked as user-created
    if (!isUserCreated) {
      console.log(`Skipping non-user object: ${objectId} (source: ${event.detail.source || 'unknown'})`);
      return;
    }
    
    // Check if this is trying to replace an existing object
    if (event.detail.replaceExisting === true && !event.detail.isNewObject) {
      console.log(`Skipping replacement object: ${objectId}`);
      return;
    }
    
    // Add to our tracking set
    processedIds.value.add(objectId);
    
    // Skip adding to tracking array if we already have it
    if (!sceneObjects.value.some(obj => obj.id === objectId)) {
      console.log(`Adding user object to scene with ID: ${objectId}`);
      
      const newObject = {
        id: objectId,
        width: event.detail.width || buildingWidth.value,
        length: event.detail.length || buildingLength.value,
        height: event.detail.height || buildingHeight.value,
        color: event.detail.color || objectColor.value,
        position: event.detail.position || { 
          // If position isn't specified, offset based on object count
          x: sceneObjects.value.length * 20, 
          y: 0, 
          z: sceneObjects.value.length * 10 
        },
        createdAt: new Date().toISOString(),
        userCreated: true,
        source: event.detail.source || 'event-handler'
      };
      
      sceneObjects.value.push(newObject);
      
      // Also add to store if it doesn't exist there
      if (!buildStore.getObjectById(objectId)) {
        buildStore.addObject(newObject);
      }
    }
  }
};

const sceneObjectRemovedHandler = event => {
  if (event.detail && (event.detail.id || event.detail.objectId)) {
    const objectId = event.detail.id || event.detail.objectId;
    
    // Remove from processed IDs set
    processedIds.value.delete(objectId);
    
    // Remove from our local tracking array
    const index = sceneObjects.value.findIndex(obj => obj.id === objectId);
    if (index !== -1) {
      sceneObjects.value.splice(index, 1);
    }
    
    // Also remove from store
    buildStore.removeObjectById(objectId);
  }
};

// Clear any non-user-created objects from our tracking
const clearNonUserObjects = () => {
  // Get current objects
  const currentObjects = [...sceneObjects.value];
  
  // Filter out non-user objects and objects that don't have source information
  const nonUserObjects = currentObjects.filter(obj => {
    // Keep objects that are explicitly marked as user-created and have a source
    if (obj.userCreated && obj.source) {
      return false;
    }
    
    // Keep objects with a known source
    if (obj.source === 'build-scene-ui' || obj.source === 'user-created') {
      return false;
    }
    
    // Remove objects lacking proper identification
    return true;
  });
  
  if (nonUserObjects.length > 0) {
    console.log(`Clearing ${nonUserObjects.length} non-user objects from tracking:`, 
      nonUserObjects.map(obj => ({
        id: obj.id.slice(0, 8), 
        source: obj.source || 'unknown',
        userCreated: obj.userCreated || false
      }))
    );
    
    // Remove non-user objects from our tracking
    nonUserObjects.forEach(obj => {
      const index = sceneObjects.value.findIndex(o => o.id === obj.id);
      if (index !== -1) {
        sceneObjects.value.splice(index, 1);
      }
      
      // Also remove from store
      buildStore.removeObjectById(obj.id);
      
      // Remove from processed IDs set
      processedIds.value.delete(obj.id);
      
      // Also try to remove from the actual scene
      window.dispatchEvent(new CustomEvent('remove-scene-object', {
        detail: {
          objectId: obj.id,
          quiet: true // Don't show notifications for system cleanup
        }
      }));
    });
  }
};

// Event listeners for objects created externally
onMounted(() => {
  // Set the initial active tab
  activeTab.value = 'objects';
  
  // Listen for objects created elsewhere
  window.addEventListener('scan-object-created', scanObjectCreatedHandler);
  
  // Listen for object removed events
  window.addEventListener('scene-object-removed', sceneObjectRemovedHandler);
  
  // Clear any non-user objects on initial load (with a slight delay to let existing events process)
  setTimeout(clearNonUserObjects, 500);
  
  // Set up periodic cleanup to ensure we don't accumulate non-user objects
  const cleanupInterval = setInterval(clearNonUserObjects, 5000);
  
  // Store interval for cleanup on unmount
  buildStore.setCleanupInterval(cleanupInterval);
});

// Clean up event listeners
onBeforeUnmount(() => {
  // Remove event listeners with our proper handler references
  window.removeEventListener('scan-object-created', scanObjectCreatedHandler);
  window.removeEventListener('scene-object-removed', sceneObjectRemovedHandler);
  
  // Clear our tracking data
  processedIds.value.clear();
  
  // Clear the cleanup interval
  if (buildStore.cleanupInterval) {
    clearInterval(buildStore.cleanupInterval);
    buildStore.setCleanupInterval(null);
  }
});

// Add debug logging when objects change
watch(sceneObjects, (newValue) => {
  console.log(`Scene objects updated, count: ${newValue.length}`);
  console.log('Current objects:', newValue.map(obj => ({ id: obj.id.slice(0, 8), dims: `${obj.width}x${obj.length}x${obj.height}` })));
}, { deep: true });

// Track store objects to detect desync
watch(() => buildStore.sceneObjects, (newValue) => {
  console.log(`Store objects updated, count: ${newValue.length}`);
  console.log('Store objects:', newValue.map(obj => ({ id: obj.id.slice(0, 8), dims: `${obj.width}x${obj.length}x${obj.height}` })));
}, { deep: true });
</script>

<style scoped>
.build-scene {
  position: absolute;
  top: 60px;
  left: 10px;
  width: 400px;
  background-color: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  z-index: 900;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease-in-out;
  overflow: hidden;
}

.build-scene.closed {
  height: 50px;
  overflow: hidden;
}

.build-scene.expanded {
  width: 80vw;
  height: 80vh;
  top: 10vh;
  left: 10vw;
  z-index: 1000;
}

.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 899;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  background-color: rgba(0, 0, 0, 0.7);
}

.header h3 {
  margin: 0;
  font-size: 1.2em;
  color: #00ffff;
}

.header-controls {
  display: flex;
  gap: 5px;
}

.scene-content {
  padding: 15px;
  max-height: calc(80vh - 50px);
  overflow-y: auto;
}

.tab-content {
  padding-top: 20px;
}

/* Object Info Settings Styles */
.section {
  margin-bottom: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.7);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background-color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
}

.section-title {
  margin: 0;
  font-size: 1.1em;
  color: #00ffff;
}

.toggle-icon {
  color: #00ffff;
  font-size: 18px;
}

.section-content {
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.4);
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.settings-column {
  margin-bottom: 15px;
}

.settings-subtitle {
  margin: 0 0 10px 0;
  font-size: 1em;
  color: #00ffff;
}

.input-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* App Theme-specific styling */
:deep(.v-card) {
  background-color: rgba(0, 0, 0, 0.7) !important;
  color: white !important;
}

:deep(.v-card-title) {
  color: #00ffff !important;
}

:deep(.v-card-text) {
  color: rgba(255, 255, 255, 0.8) !important;
}

:deep(.v-list) {
  background-color: rgba(0, 0, 0, 0.7) !important;
  color: white !important;
}

:deep(.v-list-item) {
  color: white !important;
}

:deep(.v-list-item:hover) {
  background-color: rgba(0, 255, 255, 0.1) !important;
}

/* Continue button styling */
.continue-button-container {
  border-top: 1px solid rgba(0, 255, 255, 0.2);
}
</style> 