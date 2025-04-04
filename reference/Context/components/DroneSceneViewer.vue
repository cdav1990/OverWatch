<template>
  <div ref="sceneContainer" class="scene-container">
    <div class="view-buttons">
      <button 
        :class="['view-button', { active: currentView === 'perspective' }]" 
        @click="setView('perspective')"
      >
        Perspective
      </button>
      <button 
        :class="['view-button', { active: currentView === 'top' }]" 
        @click="setView('top')"
      >
        Top View
      </button>
      <button 
        :class="['view-button', { active: currentView === 'front' }]" 
        @click="setView('front')"
      >
        Front View
      </button>
      <button 
        :class="['view-button', { active: currentView === 'side' }]" 
        @click="setView('side')"
      >
        Side View
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, markRaw } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps({
  selectedDrone: {
    type: Object,
    default: null
  },
  cameraDetails: {
    type: Object,
    default: null
  },
  lensDetails: {
    type: Object,
    default: null
  },
  focusDistance: {
    type: Number,
    default: 10
  },
  aperture: {
    type: Number,
    default: 2.8
  }
})

// Define emit for error reporting
const emit = defineEmits(['error'])

// Component state
const sceneContainer = ref(null)
const scene = ref(null)
const camera = ref(null)
const renderer = ref(null)
const controls = ref(null)
const droneModel = ref(null)
const cameraFrustum = ref(null)
const currentView = ref('perspective')
const animationId = ref(null)

// Initialize the 3D scene
function initScene() {
  if (!sceneContainer.value) return

  // Create scene with markRaw to prevent Vue reactivity
  scene.value = markRaw(new THREE.Scene())
  scene.value.background = markRaw(new THREE.Color(0x121219))

  // Create camera with markRaw
  const width = sceneContainer.value.clientWidth
  const height = sceneContainer.value.clientHeight
  camera.value = markRaw(new THREE.PerspectiveCamera(75, width / height, 0.1, 1000))
  camera.value.position.set(5, 5, 5)
  camera.value.lookAt(0, 0, 0)

  // Create renderer with markRaw
  renderer.value = markRaw(new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
  }))
  renderer.value.setSize(width, height)
  renderer.value.setPixelRatio(window.devicePixelRatio)
  
  // Clear container and add renderer
  while (sceneContainer.value.firstChild) {
    sceneContainer.value.removeChild(sceneContainer.value.firstChild)
  }
  sceneContainer.value.appendChild(renderer.value.domElement)

  // Create lights with markRaw
  const ambientLight = markRaw(new THREE.AmbientLight(0x404040, 0.5))
  scene.value.add(ambientLight)

  const dirLight = markRaw(new THREE.DirectionalLight(0xffffff, 0.8))
  dirLight.position.set(10, 15, 10)
  scene.value.add(dirLight)

  // Create ground plane with markRaw
  const planeGeometry = markRaw(new THREE.PlaneGeometry(100, 100))
  const planeMaterial = markRaw(new THREE.MeshStandardMaterial({
    color: 0x333333,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.2
  }))
  const groundPlane = markRaw(new THREE.Mesh(planeGeometry, planeMaterial))
  groundPlane.rotation.x = Math.PI / 2
  groundPlane.position.y = -0.1
  scene.value.add(groundPlane)

  // Add grid with markRaw
  const grid = markRaw(new THREE.GridHelper(100, 100, 0x555555, 0x333333))
  grid.position.y = 0
  scene.value.add(grid)

  // Add axes helper with markRaw
  const axesHelper = markRaw(new THREE.AxesHelper(5))
  scene.value.add(axesHelper)

  // Add drone model
  createDroneModel()
  
  // Add camera frustum if camera and lens are available
  if (props.cameraDetails && props.lensDetails) {
    createCameraFrustum()
  }

  // Create orbit controls with markRaw
  controls.value = markRaw(new OrbitControls(camera.value, renderer.value.domElement))
  controls.value.enableDamping = true
  controls.value.dampingFactor = 0.05

  // Start animation loop
  animate()
}

// Create a simple drone model
function createDroneModel() {
  if (!scene.value) return
  
  if (droneModel.value) {
    scene.value.remove(droneModel.value)
    droneModel.value = null
  }
  
  const group = markRaw(new THREE.Group())
  
  // Create drone body with markRaw
  const bodyGeometry = markRaw(new THREE.BoxGeometry(2, 0.5, 2))
  const bodyMaterial = markRaw(new THREE.MeshPhongMaterial({ color: 0x444444 }))
  const body = markRaw(new THREE.Mesh(bodyGeometry, bodyMaterial))
  group.add(body)
  
  // Create mount with markRaw
  const mountGeometry = markRaw(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16))
  const mountMaterial = markRaw(new THREE.MeshPhongMaterial({ color: 0x222222 }))
  const mount = markRaw(new THREE.Mesh(mountGeometry, mountMaterial))
  mount.position.set(0, -0.5, 0)
  mount.rotation.x = Math.PI / 2
  group.add(mount)
  
  // Create arms and rotors
  const armPositions = [
    { x: 1.2, z: 1.2 },
    { x: -1.2, z: 1.2 },
    { x: -1.2, z: -1.2 },
    { x: 1.2, z: -1.2 }
  ]
  
  armPositions.forEach((pos) => {
    // Create arm
    const armGeometry = markRaw(new THREE.BoxGeometry(0.8, 0.2, 0.2))
    const armMaterial = markRaw(new THREE.MeshPhongMaterial({ color: 0x333333 }))
    const arm = markRaw(new THREE.Mesh(armGeometry, armMaterial))
    arm.position.set(pos.x / 2, 0, pos.z / 2)
    
    // Calculate angle to point arm in correct direction
    const angle = Math.atan2(pos.z, pos.x)
    arm.rotation.y = angle
    
    // Scale arm to correct length
    const length = Math.sqrt(pos.x ** 2 + pos.z ** 2)
    arm.scale.x = length
    
    group.add(arm)
    
    // Create rotor
    const rotorGeometry = markRaw(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16))
    const rotorMaterial = markRaw(new THREE.MeshPhongMaterial({ color: 0x222222 }))
    const rotor = markRaw(new THREE.Mesh(rotorGeometry, rotorMaterial))
    rotor.position.set(pos.x, 0.15, pos.z)
    group.add(rotor)
    
    // Create propeller blades
    const bladeGeometry = markRaw(new THREE.BoxGeometry(1.0, 0.05, 0.1))
    const bladeMaterial = markRaw(new THREE.MeshPhongMaterial({ color: 0x666666 }))
    const blade = markRaw(new THREE.Mesh(bladeGeometry, bladeMaterial))
    blade.position.set(pos.x, 0.25, pos.z)
    group.add(blade)
  })
  
  // Position drone at default height
  group.position.y = 2
  
  // Add to scene
  droneModel.value = group
  scene.value.add(droneModel.value)
}

// Create simplified camera frustum visualization
function createCameraFrustum() {
  if (!scene.value || !props.cameraDetails || !props.lensDetails) return
  
  if (cameraFrustum.value) {
    scene.value.remove(cameraFrustum.value)
    cameraFrustum.value = null
  }
  
  const group = markRaw(new THREE.Group())
  
  try {
    // Get camera and lens properties
    const sensorWidth = props.cameraDetails.sensorWidth || 36
    const sensorHeight = props.cameraDetails.sensorHeight || 24
    const focalLength = Array.isArray(props.lensDetails.focalLength) 
      ? (props.lensDetails.focalLength[0] + props.lensDetails.focalLength[1]) / 2
      : props.lensDetails.focalLength || 50
    
    // Calculate FOV in radians
    const horizontalFOV = 2 * Math.atan(sensorWidth / (2 * focalLength))
    const verticalFOV = 2 * Math.atan(sensorHeight / (2 * focalLength))
    
    // Use focus distance from props
    const distanceToObject = props.focusDistance || 10
    
    // Create a basic frustum shape using simple geometry
    // Calculate dimensions at near and far planes
    const nearDistance = 0.5
    const farDistance = distanceToObject
    
    const nearHeight = 2 * Math.tan(verticalFOV / 2) * nearDistance
    const nearWidth = 2 * Math.tan(horizontalFOV / 2) * nearDistance
    const farHeight = 2 * Math.tan(verticalFOV / 2) * farDistance
    const farWidth = 2 * Math.tan(horizontalFOV / 2) * farDistance
    
    // Create frustum outline using lines
    const points = [
      // Near plane corners
      new THREE.Vector3(-nearWidth/2, -nearHeight/2, -nearDistance),
      new THREE.Vector3(nearWidth/2, -nearHeight/2, -nearDistance),
      new THREE.Vector3(nearWidth/2, nearHeight/2, -nearDistance),
      new THREE.Vector3(-nearWidth/2, nearHeight/2, -nearDistance),
      // Far plane corners
      new THREE.Vector3(-farWidth/2, -farHeight/2, -farDistance),
      new THREE.Vector3(farWidth/2, -farHeight/2, -farDistance),
      new THREE.Vector3(farWidth/2, farHeight/2, -farDistance),
      new THREE.Vector3(-farWidth/2, farHeight/2, -farDistance)
    ]
    
    // Define lines for frustum edges
    const lineIndices = [
      // Near plane
      0, 1, 1, 2, 2, 3, 3, 0,
      // Far plane
      4, 5, 5, 6, 6, 7, 7, 4,
      // Connecting lines
      0, 4, 1, 5, 2, 6, 3, 7
    ]
    
    // Create line geometry
    const lineGeometry = new THREE.BufferGeometry()
    const lineVertices = []
    
    for (let i = 0; i < lineIndices.length; i++) {
      const point = points[lineIndices[i]]
      lineVertices.push(point.x, point.y, point.z)
    }
    
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3))
    
    // Create line material
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4080ff,
      linewidth: 2
    })
    
    // Create line segments and add to group
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    group.add(lines)
    
    // Add far plane visualization
    const planeGeometry = new THREE.PlaneGeometry(farWidth, farHeight)
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    })
    
    const focusPlane = new THREE.Mesh(planeGeometry, planeMaterial)
    focusPlane.position.z = -farDistance
    group.add(focusPlane)
    
    // Position the frustum
    group.position.y = 0.7
    
    // Store reference and add to scene
    cameraFrustum.value = group
    scene.value.add(cameraFrustum.value)
  } catch (error) {
    console.error("Failed to create camera frustum:", error)
  }
}

// Animation loop
function animate() {
  if (!scene.value || !camera.value || !renderer.value) return
  
  animationId.value = requestAnimationFrame(animate)
  
  // Update controls
  if (controls.value) {
    controls.value.update()
  }
  
  // Render scene
  renderer.value.render(scene.value, camera.value)
}

// Set camera view
function setView(view) {
  if (!camera.value || !controls.value) return
  
  currentView.value = view
  
  switch(view) {
    case 'perspective':
      camera.value.position.set(5, 5, 5)
      break
    case 'top':
      camera.value.position.set(0, 10, 0)
      break
    case 'front':
      camera.value.position.set(0, 2, 10)
      break
    case 'side':
      camera.value.position.set(10, 2, 0)
      break
  }
  
  // Look at center
  camera.value.lookAt(0, 0, 0)
  controls.value.target.set(0, 0, 0)
  controls.value.update()
}

// Handle window resize
function handleResize() {
  if (!camera.value || !renderer.value || !sceneContainer.value) return
  
  const width = sceneContainer.value.clientWidth
  const height = sceneContainer.value.clientHeight
  
  camera.value.aspect = width / height
  camera.value.updateProjectionMatrix()
  renderer.value.setSize(width, height)
}

// Watch for property changes to update the scene
watch(() => [props.cameraDetails, props.lensDetails, props.focusDistance, props.aperture], () => {
  if (scene.value) {
    createCameraFrustum()
  }
}, { deep: true })

// Lifecycle hooks
onMounted(() => {
  try {
    initScene()
    window.addEventListener('resize', handleResize)
  } catch (error) {
    console.error("Error initializing 3D scene:", error)
    emit('error')
  }
})

onUnmounted(() => {
  // Cancel animation frame
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
  }
  
  // Remove event listener
  window.removeEventListener('resize', handleResize)
  
  // Clean up Three.js resources
  if (renderer.value) {
    if (renderer.value.domElement && renderer.value.domElement.parentNode) {
      renderer.value.domElement.parentNode.removeChild(renderer.value.domElement)
    }
    renderer.value.dispose()
  }
  
  // Clear references
  scene.value = null
  camera.value = null
  controls.value = null
  droneModel.value = null
  cameraFrustum.value = null
})
</script>

<style scoped>
.scene-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.view-buttons {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 10;
}

.view-button {
  padding: 5px 10px;
  background-color: rgba(30, 30, 30, 0.7);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  min-width: 100px;
  text-align: center;
}

.view-button:hover {
  background-color: rgba(60, 60, 60, 0.8);
}

.view-button.active {
  background-color: rgba(60, 120, 200, 0.7);
  border-color: rgba(100, 180, 255, 0.5);
}
</style> 