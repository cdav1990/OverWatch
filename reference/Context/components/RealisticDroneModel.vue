<template>
  <div ref="droneContainer" class="drone-container"></div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import * as THREE from 'three'

const props = defineProps({
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
    default: 0.8
  },
  animated: {
    type: Boolean,
    default: false
  }
})

const droneContainer = ref(null)
const scene = ref(null)
const camera = ref(null)
const renderer = ref(null)
const droneGroup = ref(null)
const rotorMeshes = ref([])
const animationSpeed = 0.2

// Create basic drone model
function createDroneModel() {
  const group = new THREE.Group()
  
  // Create drone body
  const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 2)
  const bodyMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x444444,
    specular: 0x111111,
    shininess: 30
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  group.add(body)
  
  // Add accent line to the body
  const accentGeometry = new THREE.BoxGeometry(1.6, 0.1, 0.2)
  const accentMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x00aaff,
    emissive: 0x003366,
    shininess: 80
  })
  const accent = new THREE.Mesh(accentGeometry, accentMaterial)
  accent.position.set(0, 0.2, 0)
  group.add(accent)
  
  // Create camera mount
  const mountGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16)
  const mountMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 })
  const mount = new THREE.Mesh(mountGeometry, mountMaterial)
  mount.position.set(0, -0.5, 0)
  mount.rotation.x = Math.PI / 2
  group.add(mount)
  
  // Create camera lens
  const lensGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16)
  const lensMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x111111,
    specular: 0x555555,
    shininess: 100
  })
  const lens = new THREE.Mesh(lensGeometry, lensMaterial)
  lens.position.set(0, -0.5, -0.4)
  lens.rotation.x = Math.PI / 2
  group.add(lens)
  
  // Create four rotor arms
  const armPositions = [
    { x: 1.2, z: 1.2 },
    { x: -1.2, z: 1.2 },
    { x: -1.2, z: -1.2 },
    { x: 1.2, z: -1.2 }
  ]
  
  const armGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.2)
  const armMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 })
  
  const rotors = []
  
  armPositions.forEach((pos, index) => {
    // Calculate arm direction and length
    const angle = Math.atan2(pos.z, pos.x)
    const length = Math.sqrt(pos.x ** 2 + pos.z ** 2)
    
    // Create arm
    const arm = new THREE.Mesh(armGeometry, armMaterial)
    arm.scale.x = length
    arm.position.set(pos.x / 2, 0, pos.z / 2)
    arm.rotation.y = angle
    group.add(arm)
    
    // Create rotor housing
    const rotorHousingGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16)
    const rotorHousingMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 })
    const rotorHousing = new THREE.Mesh(rotorHousingGeometry, rotorHousingMaterial)
    rotorHousing.position.set(pos.x, 0.1, pos.z)
    group.add(rotorHousing)
    
    // Create rotor blades
    const rotorGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.1)
    const rotorMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 })
    const rotor = new THREE.Mesh(rotorGeometry, rotorMaterial)
    rotor.position.set(pos.x, 0.25, pos.z)
    
    // Alternate the initial rotation for visual interest
    rotor.rotation.y = index * Math.PI / 2
    
    group.add(rotor)
    rotors.push(rotor)
  })
  
  // Add sensors or lights
  const sensorGeometry = new THREE.SphereGeometry(0.1, 16, 16)
  const redSensorMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xff0000,
    emissive: 0x660000,
    emissiveIntensity: 0.5
  })
  const greenSensorMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x00ff00,
    emissive: 0x006600,
    emissiveIntensity: 0.5
  })
  
  // Front LEDs
  const frontLeftLED = new THREE.Mesh(sensorGeometry, greenSensorMaterial)
  frontLeftLED.position.set(0.8, 0, 1)
  group.add(frontLeftLED)
  
  const frontRightLED = new THREE.Mesh(sensorGeometry, greenSensorMaterial)
  frontRightLED.position.set(-0.8, 0, 1)
  group.add(frontRightLED)
  
  // Back LEDs
  const backLeftLED = new THREE.Mesh(sensorGeometry, redSensorMaterial)
  backLeftLED.position.set(0.8, 0, -1)
  group.add(backLeftLED)
  
  const backRightLED = new THREE.Mesh(sensorGeometry, redSensorMaterial)
  backRightLED.position.set(-0.8, 0, -1)
  group.add(backRightLED)
  
  // Scale the entire drone
  group.scale.set(props.scale, props.scale, props.scale)
  
  // Position and rotate
  group.position.set(...props.position)
  group.rotation.set(...props.rotation)
  
  return { group, rotors }
}

// Initialize scene
function initScene() {
  if (!droneContainer.value) return
  
  try {
    // Create scene
    scene.value = new THREE.Scene()
    
    // Create camera
    camera.value = new THREE.PerspectiveCamera(
      75, 
      droneContainer.value.clientWidth / droneContainer.value.clientHeight, 
      0.1, 
      1000
    )
    camera.value.position.set(0, 2, 5)
    
    // Create renderer with preservation of drawing buffer
    renderer.value = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    })
    renderer.value.setSize(droneContainer.value.clientWidth, droneContainer.value.clientHeight)
    renderer.value.setClearColor(0x000000, 0)
    droneContainer.value.appendChild(renderer.value.domElement)
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040)
    scene.value.add(ambientLight)
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(5, 10, 7.5)
    scene.value.add(dirLight)
    
    // Create and add drone model
    const droneResult = createDroneModel()
    droneGroup.value = droneResult.group
    rotorMeshes.value = droneResult.rotors
    
    if (droneGroup.value) {
      scene.value.add(droneGroup.value)
    }
    
    // Ensure a first render to initialize matrices
    renderer.value.render(scene.value, camera.value)
    
    // Start rendering
    animate()
  } catch (error) {
    console.error("Error initializing drone scene:", error)
  }
}

// Animation loop with error handling
function animate() {
  if (!scene.value || !camera.value || !renderer.value) return
  
  try {
    // Animate rotors
    if (props.animated && rotorMeshes.value.length > 0) {
      rotorMeshes.value.forEach((rotor, index) => {
        // Alternate rotation directions for more realism
        const direction = index % 2 === 0 ? 1 : -1
        rotor.rotation.y += animationSpeed * direction
      })
    }
    
    requestAnimationFrame(animate)
    renderer.value.render(scene.value, camera.value)
  } catch (error) {
    console.error("Animation error:", error)
  }
}

// Update drone position
function updateDronePosition() {
  if (!droneGroup.value) return
  
  try {
    droneGroup.value.position.set(...props.position)
    
    // Force a render to update matrices
    if (renderer.value && scene.value && camera.value) {
      renderer.value.render(scene.value, camera.value)
    }
  } catch (error) {
    console.error("Error updating drone position:", error)
  }
}

// Update drone rotation
function updateDroneRotation() {
  if (!droneGroup.value) return
  
  try {
    droneGroup.value.rotation.set(...props.rotation)
    
    // Force a render to update matrices
    if (renderer.value && scene.value && camera.value) {
      renderer.value.render(scene.value, camera.value)
    }
  } catch (error) {
    console.error("Error updating drone rotation:", error)
  }
}

// Helper function to dispose of Three.js objects
function disposeObject(object) {
  if (!object) return
  
  if (object.geometry) {
    object.geometry.dispose()
  }
  
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(material => material.dispose())
    } else {
      object.material.dispose()
    }
  }
  
  if (object.children) {
    object.children.forEach(child => disposeObject(child))
  }
}

// Handle window resize
function handleResize() {
  if (!camera.value || !renderer.value || !droneContainer.value) return
  
  try {
    const width = droneContainer.value.clientWidth
    const height = droneContainer.value.clientHeight
    
    camera.value.aspect = width / height
    camera.value.updateProjectionMatrix()
    
    renderer.value.setSize(width, height)
  } catch (error) {
    console.error("Error handling resize:", error)
  }
}

// Watch for changes in props
watch(() => props.position, updateDronePosition, { deep: true })
watch(() => props.rotation, updateDroneRotation, { deep: true })
watch(() => props.scale, () => {
  if (droneGroup.value) {
    droneGroup.value.scale.set(props.scale, props.scale, props.scale)
  }
})

// Setup and cleanup
onMounted(() => {
  // Defer initialization to ensure DOM is ready
  nextTick(() => {
    initScene()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  
  // Clean up Three.js resources
  if (renderer.value) {
    if (renderer.value.domElement && renderer.value.domElement.parentNode) {
      renderer.value.domElement.parentNode.removeChild(renderer.value.domElement)
    }
    renderer.value.dispose()
  }
  
  // Dispose all scene objects
  if (scene.value) {
    if (droneGroup.value) {
      // Clean up drone group and all its children
      scene.value.remove(droneGroup.value)
      disposeObject(droneGroup.value)
      droneGroup.value = null
      rotorMeshes.value = []
    }
    
    // Clean up all other scene objects
    while(scene.value.children.length > 0) { 
      const object = scene.value.children[0]
      scene.value.remove(object)
      disposeObject(object)
    }
  }
})
</script>

<style scoped>
.drone-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style> 