<template>
  <div class="drawing-asset-manager">
    <v-card variant="outlined">
      <v-tabs v-model="activeTab">
        <v-tab value="2d">2D Drawings</v-tab>
        <v-tab value="3d">3D Drawings</v-tab>
      </v-tabs>
      
      <v-window v-model="activeTab" class="mt-2">
        <!-- 2D Assets Tab -->
        <v-window-item value="2d">
          <v-list v-if="assetsByDimension['2d'].length > 0">
            <v-list-item
              v-for="asset in assetsByDimension['2d']"
              :key="asset.id"
              :title="getAssetTitle(asset)"
              :subtitle="formatDate(asset.createdAt)"
            >
              <template v-slot:prepend>
                <v-icon :icon="getAssetIcon(asset)" color="primary"></v-icon>
              </template>
              
              <template v-slot:append>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click="highlightAsset(asset.id)">
                      <v-icon>mdi-spotlight</v-icon>
                      <span class="ml-2">Highlight</span>
                    </v-list-item>
                    <v-list-item @click="deleteAsset(asset.id)">
                      <v-icon color="error">mdi-delete</v-icon>
                      <span class="ml-2">Delete</span>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-center pa-4">
            <v-icon icon="mdi-draw" size="large" color="grey"></v-icon>
            <p class="text-body-1 mt-2">No 2D drawings created yet</p>
            <p class="text-caption">Use the drawing tools to create shapes on the grid plane</p>
          </v-card-text>
        </v-window-item>
        
        <!-- 3D Assets Tab -->
        <v-window-item value="3d">
          <v-list v-if="assetsByDimension['3d'].length > 0">
            <v-list-item
              v-for="asset in assetsByDimension['3d']"
              :key="asset.id"
              :title="getAssetTitle(asset)"
              :subtitle="formatDate(asset.createdAt)"
            >
              <template v-slot:prepend>
                <v-icon :icon="getAssetIcon(asset)" color="primary"></v-icon>
              </template>
              
              <template v-slot:append>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click="highlightAsset(asset.id)">
                      <v-icon>mdi-spotlight</v-icon>
                      <span class="ml-2">Highlight</span>
                    </v-list-item>
                    <v-list-item @click="deleteAsset(asset.id)">
                      <v-icon color="error">mdi-delete</v-icon>
                      <span class="ml-2">Delete</span>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-center pa-4">
            <v-icon icon="mdi-cube-outline" size="large" color="grey"></v-icon>
            <p class="text-body-1 mt-2">No 3D objects created yet</p>
            <p class="text-caption">Use the drawing tools to create 3D objects in the scene</p>
          </v-card-text>
        </v-window-item>
      </v-window>
      
      <v-divider></v-divider>
      
      <v-card-actions>
        <v-btn 
          variant="tonal" 
          color="error" 
          block 
          :disabled="getAssetsCount() === 0"
          @click="confirmClearAll"
        >
          <v-icon left>mdi-delete-sweep</v-icon>
          Clear All Drawings
        </v-btn>
      </v-card-actions>
    </v-card>
    
    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card>
        <v-card-title>Clear all drawings?</v-card-title>
        <v-card-text>
          This action cannot be undone. All drawing assets will be permanently removed.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="confirmDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="clearAllAssets">Clear All</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'DrawingAssetManager',
  
  props: {
    drawingManager: {
      type: Object,
      required: true
    }
  },
  
  setup(props, { emit }) {
    const activeTab = ref('2d');
    const assets = ref([]);
    const confirmDialog = ref(false);
    const lastHighlightedId = ref(null);
    
    // Mapping for tool icons
    const toolIcons = {
      'line': 'mdi-vector-line',
      'polygon': 'mdi-vector-polygon',
      'rectangle': 'mdi-vector-rectangle',
      'circle': 'mdi-circle-outline',
      'spline': 'mdi-vector-curve',
      '3d-box': 'mdi-cube-outline',
      '3d-sphere': 'mdi-sphere',
      '3d-cylinder': 'mdi-cylinder',
      '3d-path': 'mdi-vector-polyline',
      '3d-spline': 'mdi-bezier-curve'
    };
    
    // Compute assets by dimension (2d/3d)
    const assetsByDimension = computed(() => {
      return {
        '2d': assets.value.filter(asset => asset.type === '2dShape'),
        '3d': assets.value.filter(asset => asset.type === '3dShape')
      };
    });
    
    // Format date string
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString();
    };
    
    // Get appropriate icon for asset based on tool type
    const getAssetIcon = (asset) => {
      return toolIcons[asset.tool] || 'mdi-shape-outline';
    };
    
    // Get a human-readable title for the asset
    const getAssetTitle = (asset) => {
      const toolName = asset.tool.replace(/^3d-/, '');
      return `${toolName.charAt(0).toUpperCase() + toolName.slice(1)} (${asset.id.slice(0, 8)})`;
    };
    
    // Get total asset count
    const getAssetsCount = () => {
      return assets.value.length;
    };
    
    // Refresh the asset list from drawing manager
    const refreshAssets = () => {
      if (props.drawingManager) {
        const allAssets = props.drawingManager.getDrawingAssets();
        assets.value = allAssets.map(asset => ({
          id: asset.id,
          type: asset.object.userData.type,
          tool: asset.tool,
          createdAt: asset.object.userData.createdAt
        }));
      }
    };
    
    // Highlight a specific asset in the scene
    const highlightAsset = (assetId) => {
      if (lastHighlightedId.value) {
        // Reset previous highlight
        emit('reset-highlight', lastHighlightedId.value);
      }
      
      emit('highlight-asset', assetId);
      lastHighlightedId.value = assetId;
    };
    
    // Delete a specific asset
    const deleteAsset = (assetId) => {
      if (props.drawingManager) {
        props.drawingManager.removeDrawingAsset(assetId);
        refreshAssets();
        emit('asset-deleted', assetId);
      }
    };
    
    // Confirm clearing all assets
    const confirmClearAll = () => {
      confirmDialog.value = true;
    };
    
    // Clear all assets
    const clearAllAssets = () => {
      if (props.drawingManager) {
        props.drawingManager.clearAll();
        refreshAssets();
        emit('all-assets-cleared');
      }
      confirmDialog.value = false;
    };
    
    // Handle new asset creation event
    const handleAssetCreated = (event) => {
      refreshAssets();
    };
    
    // Setup event listeners
    onMounted(() => {
      window.addEventListener('drawing-asset-created', handleAssetCreated);
      refreshAssets();
    });
    
    // Cleanup event listeners
    onUnmounted(() => {
      window.removeEventListener('drawing-asset-created', handleAssetCreated);
    });
    
    return {
      activeTab,
      assets,
      assetsByDimension,
      confirmDialog,
      getAssetIcon,
      getAssetTitle,
      formatDate,
      getAssetsCount,
      highlightAsset,
      deleteAsset,
      confirmClearAll,
      clearAllAssets
    };
  }
};
</script>

<style scoped>
.drawing-asset-manager {
  max-height: 400px;
  overflow-y: auto;
}
</style> 