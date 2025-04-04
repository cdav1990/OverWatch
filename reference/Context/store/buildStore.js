import { defineStore } from 'pinia';

/**
 * Store for managing the Build Scene state
 */
export const useBuildStore = defineStore('build', {
  state: () => ({
    // Whether the build panel is open
    isPanelOpen: true,
    
    // Current active tab
    activeTab: 'objects',
    
    // Scene objects
    sceneObjects: [],
    
    // Selected object ID (null means no selection)
    selectedObjectId: null,
    
    // Cleanup interval reference
    cleanupInterval: null,
  }),
  
  getters: {
    /**
     * Get the currently selected object
     * @returns {Object|null} The selected object or null if none selected
     */
    selectedObject: (state) => {
      if (!state.selectedObjectId) {
        return null;
      }
      return state.sceneObjects.find(obj => obj.id === state.selectedObjectId) || null;
    },
    
    /**
     * Check if there are any objects in the scene
     * @returns {boolean} True if there are objects in the scene
     */
    hasObjects: (state) => state.sceneObjects.length > 0,
    
    /**
     * Get an object by its ID
     * @returns {function} A function that takes an ID and returns the object or null
     */
    getObjectById: (state) => (id) => {
      return state.sceneObjects.find(obj => obj.id === id) || null;
    }
  },
  
  actions: {
    /**
     * Toggle the build panel open/closed state
     */
    toggleBuildPanel() {
      this.isPanelOpen = !this.isPanelOpen;
    },
    
    /**
     * Set the active tab
     * @param {string} tab - The tab to set active
     */
    setActiveTab(tab) {
      this.activeTab = tab;
    },
    
    /**
     * Add a new object to the scene
     * @param {Object} object - The object to add
     */
    addObject(object) {
      // Ensure object has an ID
      if (!object.id) {
        object.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      
      // Check for duplicate ID
      if (this.sceneObjects.some(obj => obj.id === object.id)) {
        console.warn(`Object with ID ${object.id} already exists, generating new ID`);
        object.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      
      this.sceneObjects.push(object);
    },
    
    /**
     * Remove an object from the scene by index
     * @param {number} index - The index of the object to remove
     * @deprecated Use removeObjectById instead
     */
    removeObject(index) {
      if (index >= 0 && index < this.sceneObjects.length) {
        const removedObject = this.sceneObjects[index];
        this.sceneObjects.splice(index, 1);
        
        // Reset selected object if the removed object was selected
        if (this.selectedObjectId === removedObject.id) {
          this.selectedObjectId = null;
        }
      }
    },
    
    /**
     * Remove an object from the scene by ID
     * @param {string} id - The ID of the object to remove
     */
    removeObjectById(id) {
      const index = this.sceneObjects.findIndex(obj => obj.id === id);
      
      if (index >= 0) {
        this.sceneObjects.splice(index, 1);
        
        // Reset selected object if the removed object was selected
        if (this.selectedObjectId === id) {
          this.selectedObjectId = null;
        }
      } else {
        console.warn(`Object with ID ${id} not found for removal`);
      }
    },
    
    /**
     * Select an object in the scene by ID
     * @param {string} id - The ID of the object to select, null to deselect
     */
    selectObjectById(id) {
      if (id === null || this.sceneObjects.some(obj => obj.id === id)) {
        this.selectedObjectId = id;
      } else {
        console.warn(`Cannot select object with ID ${id}: object not found`);
      }
    },
    
    /**
     * Update an object's properties
     * @param {string} id - The ID of the object to update
     * @param {Object} properties - The properties to update
     */
    updateObjectById(id, properties) {
      const index = this.sceneObjects.findIndex(obj => obj.id === id);
      
      if (index >= 0) {
        // Preserve the ID and prevent overwriting it
        const { id: propId, ...otherProps } = properties;
        if (propId && propId !== id) {
          console.warn(`Cannot change object ID from ${id} to ${propId}`);
        }
        
        this.sceneObjects[index] = {
          ...this.sceneObjects[index],
          ...otherProps
        };
      } else {
        console.warn(`Object with ID ${id} not found for update`);
      }
    },
    
    /**
     * Clear all objects from the scene
     */
    clearObjects() {
      this.sceneObjects = [];
      this.selectedObjectId = null;
    },
    
    /**
     * Set the cleanup interval reference
     * @param {number|null} interval - The interval ID to store or null to clear
     */
    setCleanupInterval(interval) {
      this.cleanupInterval = interval;
    },
  },
}); 