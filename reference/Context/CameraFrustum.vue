<template>
  <div ref="frustumContainer" class="frustum-container"></div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed, nextTick } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  cameraDetails: {
    type: Object,
    required: true
  },
  lensDetails: {
    type: Object,
    required: true
  },
  position: {
    type: Array,
    default: () => [0, 0, 0]
  },
  rotation: {
    type: Array,
    default: () => [0, 0, 0]
  },
  scale: {
    type: Number,
    default: 1.0
  },
  distanceToObject: {
    type: Number,
    default: 30
  }
})

const frustumContainer = ref(null)
const frustumGroup = ref(null)
const scene = ref(null)
const camera = ref(null)
const renderer = ref(null)
const isHovered = ref(false)
const lastRotation = ref(props.rotation)
const animationFrameId = ref(null)

// Calculate FOV values
const fovValues = computed(() => {
  if (!props.cameraDetails || !props.lensDetails) return { horizontal: 0, vertical: 0 }
  
  const { sensorWidth, sensorHeight } = props.cameraDetails
  const { focalLength } = props.lensDetails
  
  // Calculate horizontal and vertical FOV in radians
  const horizontalFOV = 2 * Math.atan(sensorWidth / (2 * focalLength))
  const verticalFOV = 2 * Math.atan(sensorHeight / (2 * focalLength))
  
  return {
    horizontal: horizontalFOV,
    vertical: verticalFOV
  }
})

// Calculate coverage values
const coverageValues = computed(() => {
  if (!fovValues.value.horizontal || !fovValues.value.vertical) return { width: 0, height: 0 }
  
  // Convert distance to object from feet to a scale that fits the scene
  const sceneScale = 0.3048 // 1 foot = 0.3048 meters
  const distanceInScene = props.distanceToObject * sceneScale
  
  // Calculate width and height of coverage at the specified distance
  const coverageWidthFeet = 2 * props.distanceToObject * Math.tan(fovValues.value.horizontal / 2)
  const coverageHeightFeet = 2 * props.distanceToObject * Math.tan(fovValues.value.vertical / 2)
  
  return {
    width: coverageWidthFeet,
    height: coverageHeightFeet,
    distanceInScene
  }
})

// Create and update frustum
function createFrustum() {
  if (!props.cameraDetails || !props.lensDetails) return null
  
  try {
    // Use a simple approach to create the frustum
    const group = new THREE.Group()
    
    // Calculate necessary values for frustum geometry
    const nearPlane = 0.5
    const farPlane = coverageValues.value.distanceInScene
    
    const nearHeight = 2 * Math.tan(fovValues.value.vertical / 2) * nearPlane
    const nearWidth = 2 * Math.tan(fovValues.value.horizontal / 2) * nearPlane
    const farHeight = 2 * Math.tan(fovValues.value.vertical / 2) * farPlane
    const farWidth = 2 * Math.tan(fovValues.value.horizontal / 2) * farPlane
    
    // Create a simpler frustum using BoxGeometry for more stability
    const frustumGeometry = new THREE.BufferGeometry()
    
    // Define all 8 corners of the frustum
    const vertices = new Float32Array([
      // Near plane - 4 corners
      -nearWidth/2, -nearHeight/2, -nearPlane,  // bottom-left
      nearWidth/2, -nearHeight/2, -nearPlane,   // bottom-right
      nearWidth/2, nearHeight/2, -nearPlane,    // top-right
      -nearWidth/2, nearHeight/2, -nearPlane,   // top-left
      
      // Far plane - 4 corners
      -farWidth/2, -farHeight/2, -farPlane,     // bottom-left
      farWidth/2, -farHeight/2, -farPlane,      // bottom-right
      farWidth/2, farHeight/2, -farPlane,       // top-right
      -farWidth/2, farHeight/2, -farPlane,      // top-left
    ])
    
    // Define faces (triangles) to create the frustum
    const indices = [
      // Near plane
      0, 1, 2,
      0, 2, 3,
      
      // Far plane
      4, 6, 5,
      4, 7, 6,
      
      // Side planes
      0, 4, 1,
      1, 4, 5,
      
      1, 5, 2,
      2, 5, 6,
      
      2, 6, 3,
      3, 6, 7,
      
      3, 7, 0,
      0, 7, 4
    ]
    
    frustumGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    frustumGeometry.setIndex(indices)
    frustumGeometry.computeVertexNormals()
    
    // Create a simple material
    const frustumMaterial = new THREE.MeshBasicMaterial({
      color: 0x2060ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      wireframe: false
    })
    
    // Create mesh for the frustum
    const frustumMesh = new THREE.Mesh(frustumGeometry, frustumMaterial)
    group.add(frustumMesh)
    
    // Add wireframe for better visibility
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x4080ff,
      transparent: true,
      opacity: 0.8
    })
    
    const wireframe = new THREE.WireframeGeometry(frustumGeometry)
    const lines = new THREE.LineSegments(wireframe, wireframeMaterial)
    group.add(lines)
    
    // Add focus plane (far plane)
    const focusPlaneGeometry = new THREE.PlaneGeometry(farWidth, farHeight)
    const focusPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    })
    
    const focusPlane = new THREE.Mesh(focusPlaneGeometry, focusPlaneMaterial)
    focusPlane.position.set(0, 0, -farPlane)
    group.add(focusPlane)
    
    // Add simple text label
    const horizontalFOVDegrees = Math.round(fovValues.value.horizontal * 180 / Math.PI)
    const verticalFOVDegrees = Math.round(fovValues.value.vertical * 180 / Math.PI)
    
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'rgba(0, 0, 60, 0.7)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.fillStyle = 'white'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`FOV: ${horizontalFOVDegrees}° × ${verticalFOVDegrees}°`, 128, 24)
    ctx.font = '14px Arial'
    ctx.fillText(`Coverage: ${coverageValues.value.width.toFixed(1)}ft × ${coverageValues.value.height.toFixed(1)}ft`, 128, 48)
    
    const texture = new THREE.CanvasTexture(canvas)
    const labelMaterial = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      depthWrite: false 
    })
    
    const label = new THREE.Sprite(labelMaterial)
    label.position.set(0, farHeight/2 + 1, -farPlane/2)
    label.scale.set(4, 1, 1)
    group.add(label)
    
    // Position the group
    group.position.set(...props.position)
    group.rotation.set(...props.rotation)
    
    return group
  } catch (error) {
    console.error("Error creating frustum:", error)
    return null
  }
}

// Initialize scene
function initScene() {
  if (!frustumContainer.value) return
  
  try {
    // Create a fresh scene
    scene.value = new THREE.Scene()
    
    // Set up camera with explicit dimensions
    const width = frustumContainer.value.clientWidth
    const height = frustumContainer.value.clientHeight
    
    camera.value = new THREE.PerspectiveCamera(
      75, 
      width / height, 
      0.1, 
      1000
    )
    
    // Set camera position and update matrices
    camera.value.position.set(0, 2, 5)
    camera.value.lookAt(0, 0, 0)
    camera.value.updateProjectionMatrix()
    camera.value.updateMatrixWorld(true)
    
    // Create optimized renderer
    renderer.value = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    })
    
    // Set renderer properties
    renderer.value.setSize(width, height)
    renderer.value.setPixelRatio(window.devicePixelRatio)
    renderer.value.setClearColor(0x000000, 0)
    
    // Clear existing content
    while (frustumContainer.value.firstChild) {
      frustumContainer.value.removeChild(frustumContainer.value.firstChild)
    }
    
    // Add renderer to DOM
    frustumContainer.value.appendChild(renderer.value.domElement)
    
    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040)
    scene.value.add(ambientLight)
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(5, 10, 7.5)
    scene.value.add(dirLight)
    
    // Create frustum in next tick to ensure scene is ready
    nextTick(() => {
      frustumGroup.value = createFrustum()
      if (frustumGroup.value) {
        scene.value.add(frustumGroup.value)
        
        // Force a render to initialize matrices
        renderer.value.render(scene.value, camera.value)
        
        // Start animation loop after everything is initialized
        nextTick(() => {
          animate()
        })
      }
    })
  } catch (error) {
    console.error("Error initializing scene:", error)
  }
}

// Animation loop
function animate() {
  if (!scene.value || !camera.value || !renderer.value) return
  
  try {
    const frameId = requestAnimationFrame(animate)
    animationFrameId.value = frameId
    
    // Update camera matrices
    camera.value.updateMatrixWorld(true)
    
    // Render scene
    renderer.value.render(scene.value, camera.value)
  } catch (error) {
    console.error("Animation error:", error)
    
    // If there's an error, cancel animation frame and try to restart
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
      
      // Try to restart the animation after a short delay
      setTimeout(() => {
        animate()
      }, 1000)
    }
  }
}

// Update frustum position
function updateFrustumPosition() {
  if (!frustumGroup.value) return
  
  frustumGroup.value.position.set(...props.position)
}

// Update frustum rotation with smoothing
function updateFrustumRotation() {
  if (!frustumGroup.value) return
  
  try {
    // Set the rotation directly to avoid matrix manipulation issues
    frustumGroup.value.rotation.set(...props.rotation)
    lastRotation.value = [...props.rotation]
  } catch (error) {
    console.error("Error updating frustum rotation:", error)
  }
}

// Update frustum when props change
function updateFrustum() {
  if (!scene.value || !frustumGroup.value) return
  
  try {
    // Remove old frustum
    scene.value.remove(frustumGroup.value)
    
    // Properly dispose of old frustum resources
    disposeObject(frustumGroup.value)
    
    // Create and add new frustum
    frustumGroup.value = createFrustum()
    if (frustumGroup.value) {
      scene.value.add(frustumGroup.value)
    }
  } catch (error) {
    console.error("Error updating frustum:", error)
  }
}

// Helper function to dispose of Three.js objects
function disposeObject(object) {
  if (!object) return
  
  object.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      if (node.geometry) {
        node.geometry.dispose()
      }
      
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach(material => material.dispose())
        } else {
          node.material.dispose()
        }
      }
    } else if (node instanceof THREE.LineSegments) {
      if (node.geometry) {
        node.geometry.dispose()
      }
      if (node.material) {
        node.material.dispose()
      }
    } else if (node instanceof THREE.Sprite) {
      if (node.material && node.material.map) {
        node.material.map.dispose()
        node.material.dispose()
      }
    }
  })
}

// Handle hover state
function handlePointerOver() {
  isHovered.value = true
  updateFrustum()
}

function handlePointerOut() {
  isHovered.value = false
  updateFrustum()
}

// Handle window resize
function handleResize() {
  if (!camera.value || !renderer.value || !frustumContainer.value) return
  
  try {
    const width = frustumContainer.value.clientWidth
    const height = frustumContainer.value.clientHeight
    
    camera.value.aspect = width / height
    camera.value.updateProjectionMatrix()
    
    renderer.value.setSize(width, height)
  } catch (error) {
    console.error("Error handling resize:", error)
  }
}

// Watch for changes in props
watch(() => props.position, updateFrustumPosition, { deep: true })
watch(() => props.rotation, updateFrustumRotation, { deep: true })
watch(() => [props.cameraDetails, props.lensDetails, props.distanceToObject, props.scale], updateFrustum, { deep: true })

// Setup and cleanup
onMounted(() => {
  nextTick(() => {
    initScene()
  })
  
  window.addEventListener('resize', handleResize)
  
  if (frustumContainer.value) {
    frustumContainer.value.addEventListener('pointerover', handlePointerOver)
    frustumContainer.value.addEventListener('pointerout', handlePointerOut)
  }
})

onUnmounted(() => {
  // Stop animation first
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }
  
  // Remove event listeners
  window.removeEventListener('resize', handleResize)
  
  if (frustumContainer.value) {
    frustumContainer.value.removeEventListener('pointerover', handlePointerOver)
    frustumContainer.value.removeEventListener('pointerout', handlePointerOut)
  }
  
  // Clean up Three.js resources
  if (renderer.value) {
    if (renderer.value.domElement && renderer.value.domElement.parentNode) {
      renderer.value.domElement.parentNode.removeChild(renderer.value.domElement)
    }
    renderer.value.dispose()
    renderer.value = null
  }
  
  // Dispose of scene objects
  if (scene.value) {
    // Dispose of frustum group
    if (frustumGroup.value) {
      disposeObject(frustumGroup.value)
      frustumGroup.value = null
    }
    
    // Dispose of all other scene objects
    while(scene.value.children.length > 0) {
      const object = scene.value.children[0]
      scene.value.remove(object)
      disposeObject(object)
    }
    
    scene.value = null
  }
  
  // Clear references
  camera.value = null
  lastRotation.value = null
})
</script>

<style scoped>
.frustum-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style> 