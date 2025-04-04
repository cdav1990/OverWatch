<template>
  <div class="building-visualization-container">
    <!-- This component is used for rendering in the 3D scene -->
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import * as THREE from 'three'
import { useMissionStore } from '../store/missionStore'

const props = defineProps({
  scene: {
    type: Object,
    required: true
  },
  simulationActive: {
    type: Boolean,
    default: false
  },
  animationPlaying: {
    type: Boolean,
    default: false
  }
})

// Get mission store
const missionStore = useMissionStore()

// References to 3D objects
const buildingObj = ref(null)
const waypointsObj = ref(null)
const pathLineObj = ref(null)
const waypointMarkersRef = ref([])

// Get simulation data from store
const simulationData = computed(() => {
  return {
    pattern: missionStore.simulation.pattern,
    waypoints: missionStore.simulation.waypoints,
    activeWaypoint: missionStore.simulation.activeWaypoint,
    params: missionStore.simulation.params,
    skipVisualization: missionStore.simulation.skipVisualization || false
  }
})

// Create building visualization
const createBuildingVisualization = () => {
  // Skip visualization if the flag is set
  if (!props.scene || !props.simulationActive || simulationData.value.skipVisualization) {
    cleanupObjects()
    return
  }
  
  try {
    // Clean up existing objects
    cleanupObjects()
    
    // If skipVisualization is true, only create waypoints without the building
    if (simulationData.value.skipVisualization) {
      createWaypointsVisualization()
      return
    }
    
    // Get building dimensions from store
    const buildingWidth = simulationData.value.params.buildingWidth || 100
    const buildingHeight = simulationData.value.params.buildingHeight || 300
    const buildingDepth = 10 // Default depth
    
    // Create building group
    const buildingGroup = new THREE.Group()
    
    // Create building mesh
    const buildingGeometry = new THREE.BoxGeometry(buildingDepth, buildingHeight, buildingWidth)
    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    })
    
    const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial)
    buildingMesh.position.set(buildingDepth/2, buildingHeight/2, 0)
    buildingGroup.add(buildingMesh)
    
    // Add wireframe for better visibility
    const wireframeGeometry = new THREE.EdgesGeometry(buildingGeometry)
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0xaaaaaa, 
      linewidth: 1
    })
    
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial)
    wireframe.position.copy(buildingMesh.position)
    buildingGroup.add(wireframe)
    
    // Add grid on the building face for reference
    const gridSize = Math.max(buildingWidth, buildingHeight)
    const gridDivisions = 10
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x222222)
    gridHelper.position.set(0, buildingHeight/2, 0)
    gridHelper.rotation.x = Math.PI / 2
    buildingGroup.add(gridHelper)
    
    // Add to scene and store reference
    props.scene.add(buildingGroup)
    buildingObj.value = buildingGroup
    
    // Create waypoints visualization
    createWaypointsVisualization()
  } catch (error) {
    console.error('Error creating building visualization:', error)
  }
}

// Create waypoints visualization
const createWaypointsVisualization = () => {
  if (!props.scene || !props.simulationActive || !simulationData.value.waypoints.length) {
    return
  }
  
  try {
    // Clean up existing waypoints objects
    if (waypointsObj.value) {
      props.scene.remove(waypointsObj.value)
      waypointsObj.value = null
    }
    
    if (pathLineObj.value) {
      props.scene.remove(pathLineObj.value)
      pathLineObj.value = null
    }
    
    // Create waypoints group
    const waypointsGroup = new THREE.Group()
    const waypoints = simulationData.value.waypoints
    const waypointMarkers = []
    
    // Create points for the path line
    const linePoints = waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z))
    
    // Create path line
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(linePoints)
    const pathMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ff00, 
      linewidth: 2 
    })
    
    const pathLine = new THREE.Line(pathGeometry, pathMaterial)
    props.scene.add(pathLine)
    pathLineObj.value = pathLine
    
    // Add markers for each waypoint
    waypoints.forEach((waypoint, index) => {
      // Different size and color based on waypoint type
      let markerSize = 0.3
      let markerColor = 0xffff00 // Default yellow
      
      switch(waypoint.type) {
        case 'position':
          markerColor = 0x00ffff // Cyan for position points
          markerSize = 0.4
          break
        case 'capture':
          markerColor = 0xff00ff // Magenta for capture points
          break
        case 'return':
          markerColor = 0xff0000 // Red for return point
          markerSize = 0.5
          break
      }
      
      // Create marker
      const markerGeometry = new THREE.SphereGeometry(markerSize, 8, 8)
      const markerMaterial = new THREE.MeshBasicMaterial({ 
        color: markerColor, 
        opacity: 0.8,
        transparent: true
      })
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial)
      marker.position.set(waypoint.x, waypoint.y, waypoint.z)
      
      // Add label for specific waypoints (first, middle, last)
      if (index === 0 || index === waypoints.length - 1 || index === Math.floor(waypoints.length / 2)) {
        // Create a canvas for the label
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = 128
        canvas.height = 64
        
        // Draw the text
        context.fillStyle = '#ffffff'
        context.font = '24px Arial'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        
        let label = `#${index + 1}`
        if (index === 0) label += ' (Start)'
        if (index === waypoints.length - 1) label += ' (End)'
        
        context.fillText(label, 64, 32)
        
        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas)
        
        // Create a sprite material using the texture
        const labelMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true
        })
        
        // Create a sprite using the material
        const labelSprite = new THREE.Sprite(labelMaterial)
        labelSprite.position.set(waypoint.x, waypoint.y + 1, waypoint.z)
        labelSprite.scale.set(2, 1, 1)
        
        waypointsGroup.add(labelSprite)
      }
      
      waypointsGroup.add(marker)
      waypointMarkers.push(marker)
    })
    
    // Add to scene and store reference
    props.scene.add(waypointsGroup)
    waypointsObj.value = waypointsGroup
    waypointMarkersRef.value = waypointMarkers
    
    // Highlight active waypoint
    updateActiveWaypoint()
  } catch (error) {
    console.error('Error creating waypoints visualization:', error)
  }
}

// Update active waypoint highlight
const updateActiveWaypoint = () => {
  // Reset all waypoint colors
  waypointMarkersRef.value.forEach((marker, index) => {
    const waypoint = simulationData.value.waypoints[index]
    let markerColor = 0xffff00 // Default yellow
    
    switch(waypoint.type) {
      case 'position':
        markerColor = 0x00ffff // Cyan for position points
        break
      case 'capture':
        markerColor = 0xff00ff // Magenta for capture points
        break
      case 'return':
        markerColor = 0xff0000 // Red for return point
        break
    }
    
    if (marker.material) {
      marker.material.color.setHex(markerColor)
      marker.material.opacity = 0.8
    }
  })
  
  // Highlight active waypoint
  const activeIndex = simulationData.value.activeWaypoint
  if (activeIndex >= 0 && activeIndex < waypointMarkersRef.value.length) {
    const activeMarker = waypointMarkersRef.value[activeIndex]
    if (activeMarker.material) {
      activeMarker.material.color.setHex(0x00ff00) // Bright green
      activeMarker.material.opacity = 1.0
      activeMarker.scale.set(1.5, 1.5, 1.5) // Make it bigger
    }
  }
}

// Clean up objects when component is unmounted or simulation is disabled
const cleanupObjects = () => {
  if (buildingObj.value) {
    props.scene.remove(buildingObj.value)
    buildingObj.value = null
  }
  
  if (waypointsObj.value) {
    props.scene.remove(waypointsObj.value)
    waypointsObj.value = null
  }
  
  if (pathLineObj.value) {
    props.scene.remove(pathLineObj.value)
    pathLineObj.value = null
  }
  
  waypointMarkersRef.value = []
}

// Watch for simulation active state changes
watch(() => props.simulationActive, (isActive) => {
  nextTick(() => {
    if (isActive) {
      createBuildingVisualization()
    } else {
      cleanupObjects()
    }
  })
})

// Watch for waypoints changes
watch(() => simulationData.value.waypoints, () => {
  nextTick(() => {
    if (props.simulationActive) {
      createWaypointsVisualization()
    }
  })
})

// Watch for active waypoint changes
watch(() => simulationData.value.activeWaypoint, () => {
  updateActiveWaypoint()
})

// Watch for animation playing state
watch(() => props.animationPlaying, (isPlaying) => {
  // Could add special effects for animation playback
})

// Clean up on unmount
onMounted(() => {
  nextTick(() => {
    if (props.simulationActive) {
      createBuildingVisualization()
    }
  })
})

onUnmounted(() => {
  cleanupObjects()
})
</script>

<style scoped>
.building-visualization-container {
  /* This component doesn't render visible HTML */
}
</style> 