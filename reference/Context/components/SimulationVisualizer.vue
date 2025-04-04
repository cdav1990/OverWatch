<template>
  <div class="simulation-visualizer">
    <div class="visualization-container" ref="container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const props = defineProps({
  scene: Object,
  simulationActive: {
    type: Boolean,
    default: false
  },
  animationPlaying: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['sceneInitialized'])

// Scene references
const container = ref(null)
let renderer = null
let camera = null
let controls = null
let sceneObj = null
let animationFrameId = null

// Initialize the 3D scene
const initScene = () => {
  if (!container.value) return
  
  // Create scene if not provided via props
  sceneObj = props.scene || new THREE.Scene()
  sceneObj.background = new THREE.Color(0x111111)
  
  // Create camera
  camera = new THREE.PerspectiveCamera(
    75,
    container.value.clientWidth / container.value.clientHeight,
    0.1,
    1000
  )
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)
  
  // Add controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  
  // Add basic lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  sceneObj.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 7)
  sceneObj.add(directionalLight)
  
  // Add grid helper
  const gridHelper = new THREE.GridHelper(10, 10)
  sceneObj.add(gridHelper)
  
  // Add coordinate axes
  const axesHelper = new THREE.AxesHelper(2)
  sceneObj.add(axesHelper)
  
  // Start animation loop
  animate()
  
  // Emit initialization event
  emit('sceneInitialized', { scene: sceneObj, camera, renderer })
  
  // Handle resize
  window.addEventListener('resize', onResize)
}

// Animation loop
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  
  if (controls) {
    controls.update()
  }
  
  if (renderer && camera) {
    renderer.render(sceneObj, camera)
  }
}

// Handle window resize
const onResize = () => {
  if (!container.value || !camera || !renderer) return
  
  camera.aspect = container.value.clientWidth / container.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
}

// Lifecycle hooks
onMounted(() => {
  initScene()
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  
  if (renderer) {
    renderer.dispose()
    container.value?.removeChild(renderer.domElement)
  }
  
  window.removeEventListener('resize', onResize)
})

// Watch for animation playing state
watch(() => props.animationPlaying, (newValue) => {
  // Handle animation state changes
  console.log('Animation playing:', newValue)
})

// Expose methods for parent component
defineExpose({
  getScene: () => sceneObj,
  getCamera: () => camera,
  getRenderer: () => renderer
})
</script>

<style scoped>
.simulation-visualizer {
  width: 100%;
  height: 100%;
}

.visualization-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
  background-color: #111;
  border-radius: 4px;
  overflow: hidden;
}
</style> 