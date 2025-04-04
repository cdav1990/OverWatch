<template>
  <div class="drone-visualization">
    <div class="visualization-container" ref="container"></div>
  </div>
</template>

<script setup>
// Import necessary modules
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { calculateFieldOfView, calculateDOF } from '../utils/dofCalculations'
import { calculateFootprint } from '../utils/gsdCalculations'

// Debug THREE.js version
console.log('THREE.js version:', THREE.REVISION)

// Define emits
const emit = defineEmits(['error'])

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
  selectedLidar: {
    type: Object,
    default: null
  },
  aperture: {
    type: Number,
    default: 2.8
  },
  focusDistance: {
    type: Number,
    default: 10
  }
})

// Component state
const container = ref(null)
const scene = ref(null)
const camera = ref(null)
const renderer = ref(null)
const controls = ref(null)
const animationFrameId = ref(null)
const renderingFailed = ref(false)

// 3D objects references
const droneObj = ref(null)
const boundaryBox = ref(null)
const coverageObj = ref(null)

// Constants for positioning
const droneHeight = 10 // Height of the drone above ground in meters

// Get effective focal length (accounting for zoom lenses)
const getEffectiveFocalLength = (lens) => {
  if (!lens) return 50
  
  if (Array.isArray(lens.focalLength)) {
    return (lens.focalLength[0] + lens.focalLength[1]) / 2
  }
  return lens.focalLength
}

// Calculate ground coverage at focus distance
const groundCoverage = computed(() => {
  try {
    if (!props.cameraDetails || !props.lensDetails) {
      console.log('Missing camera or lens details for ground coverage calculation')
      return { width: 10, height: 10 }
    }
    
    // Create camera parameters object for footprint calculation
    const cameraParams = {
      focalLength: getEffectiveFocalLength(props.lensDetails),
      sensorWidth: props.cameraDetails.sensorWidth || 35,
      sensorHeight: props.cameraDetails.sensorHeight || 24,
      imageWidth: props.cameraDetails.imageWidth || 6000, // Default if not specified
      imageHeight: props.cameraDetails.imageHeight || 4000 // Default if not specified
    }
    
    console.log('Camera params for footprint calc:', JSON.stringify(cameraParams))
    
    // Calculate footprint at focus distance
    const footprint = calculateFootprint(cameraParams, props.focusDistance || 10)
    console.log('Calculated footprint:', footprint)
    
    return footprint
  } catch (error) {
    console.error('Error calculating ground coverage:', error)
    return { width: 10, height: 10 } // Default fallback
  }
})

// Check if WebGL is supported
const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch (e) {
    return false
  }
}

// Initialize the 3D scene
const initScene = () => {
  console.log('Initializing scene...')
  
  if (!container.value) {
    console.error('Container element not found')
    renderingFailed.value = true
    showFallbackCanvas()
    emit('error')
    return
  }
  
  // Skip 3D visualization due to persistent proxy errors
  // Force using the 2D canvas visualization instead
  console.log('Using 2D canvas visualization instead of 3D scene')
  renderingFailed.value = true
  showFallbackCanvas()
  
  // Handle window resize for canvas
  window.addEventListener('resize', onWindowResize)
}

// Show a 2D canvas visualization as fallback
const showFallbackCanvas = () => {
  console.log('Creating 2D canvas visualization')
  if (!container.value) return
  
  // Clear container
  container.value.innerHTML = ''
  
  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = container.value.clientWidth
  canvas.height = container.value.clientHeight
  container.value.appendChild(canvas)
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.error('Failed to get 2D context')
    return
  }
  
  // Get design parameters
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2 - 50
  const droneY = centerY - 100
  const baseY = centerY + 150 // Ground position

  // Draw background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  bgGradient.addColorStop(0, '#121219')
  bgGradient.addColorStop(1, '#1a1a24')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw grid for reference
  drawGrid(ctx, canvas.width, canvas.height)
  
  // Add UI elements
  drawViewButtons(canvas, ctx)
  
  // If camera details exist, draw visualization
  if (props.cameraDetails && props.lensDetails) {
    // Draw visualization title
    ctx.font = 'bold 18px Arial'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText(`${props.cameraDetails.brand} ${props.cameraDetails.model} with ${props.lensDetails.brand} ${props.lensDetails.focalLength}mm lens`, centerX, 30)
    
    try {
      // Calculate field of view
      const cameraDetailsObj = JSON.parse(JSON.stringify(props.cameraDetails))
      const lensDetailsObj = JSON.parse(JSON.stringify(props.lensDetails))
      const fov = calculateFieldOfView(cameraDetailsObj, lensDetailsObj) || 45
      let width = 10, height = 10
      
      try {
        const coverage = groundCoverage.value
        if (coverage) {
          width = coverage.width || 10
          height = coverage.height || 10
        }
      } catch (e) {
        console.error('Error getting ground coverage:', e)
      }
      
      // Draw drone at top
      drawDrone(ctx, centerX, droneY)
      
      // Calculate frustum dimensions
      const distancePixels = baseY - droneY - 15 // Visual distance in pixels
      const fovRadians = fov * (Math.PI / 180)
      const halfWidth = distancePixels * Math.tan(fovRadians / 2)
      
      // Draw distance line
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 3])
      ctx.beginPath()
      ctx.moveTo(centerX, droneY + 30)
      ctx.lineTo(centerX, baseY)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw frustum lines
      ctx.strokeStyle = '#00aaff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX, droneY + 30) // From camera
      ctx.lineTo(centerX - halfWidth, baseY) // To left edge
      ctx.moveTo(centerX, droneY + 30) // From camera
      ctx.lineTo(centerX + halfWidth, baseY) // To right edge
      ctx.stroke()
      
      // Calculate depth of field planes
      const dofValues = calculateDOF(
        getEffectiveFocalLength(props.lensDetails), 
        props.aperture, 
        props.focusDistance,
        props.cameraDetails.sensorWidth || 35,
        props.cameraDetails.sensorHeight || 24
      )
      
      console.log('DOF values:', dofValues)
      
      // Convert DOF values to pixel distances on canvas
      // pixel distance = (dof in meters / focus distance) * distancePixels
      const nearDistancePixels = (dofValues.nearLimit / props.focusDistance) * distancePixels
      let farDistancePixels = distancePixels
      
      if (dofValues.farLimit !== Infinity) {
        farDistancePixels = (dofValues.farLimit / props.focusDistance) * distancePixels
      }
      
      // Calculate near and far plane positions
      const nearY = droneY + 30 + nearDistancePixels
      const farY = Math.min(baseY + 30, droneY + 30 + farDistancePixels) // Limit far plane to a reasonable position
      
      // Draw focus plane (green)
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 3
      ctx.beginPath()
      const focusPlaneWidth = halfWidth * 2 * (props.focusDistance / props.focusDistance)
      ctx.moveTo(centerX - focusPlaneWidth/2, baseY)
      ctx.lineTo(centerX + focusPlaneWidth/2, baseY)
      ctx.stroke()
      
      // Draw near plane (orange)
      if (dofValues.nearLimit > 0) {
        const nearPlaneWidth = halfWidth * 2 * (dofValues.nearLimit / props.focusDistance)
        
        ctx.strokeStyle = '#ff7700'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(centerX - nearPlaneWidth/2, nearY)
        ctx.lineTo(centerX + nearPlaneWidth/2, nearY)
        ctx.stroke()
        
        // Add label for near plane
        ctx.font = '12px Arial'
        ctx.fillStyle = '#ff7700'
        ctx.textAlign = 'left'
        ctx.fillText(`Near: ${dofValues.nearLimit.toFixed(2)}m`, centerX + nearPlaneWidth/2 + 10, nearY + 5)
      }
      
      // Draw far plane (blue)
      if (dofValues.farLimit !== Infinity && farY < baseY + 20) {
        const farPlaneWidth = halfWidth * 2 * (dofValues.farLimit / props.focusDistance)
        
        ctx.strokeStyle = '#00aaff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(centerX - farPlaneWidth/2, farY)
        ctx.lineTo(centerX + farPlaneWidth/2, farY)
        ctx.stroke()
        
        // Add label for far plane
        ctx.font = '12px Arial'
        ctx.fillStyle = '#00aaff'
        ctx.textAlign = 'left'
        ctx.fillText(`Far: ${dofValues.farLimit.toFixed(2)}m`, centerX + farPlaneWidth/2 + 10, farY + 5)
      }
      
      // Draw DOF volume visualization
      if (dofValues.nearLimit > 0 && dofValues.farLimit !== Infinity) {
        const nearPlaneWidth = halfWidth * 2 * (dofValues.nearLimit / props.focusDistance)
        const farPlaneWidth = halfWidth * 2 * (dofValues.farLimit / props.focusDistance)
        
        // Draw semi-transparent DOF volume
        const dofGradient = ctx.createLinearGradient(centerX, nearY, centerX, farY)
        dofGradient.addColorStop(0, 'rgba(255, 119, 0, 0.1)') // Near (orange)
        dofGradient.addColorStop(1, 'rgba(0, 170, 255, 0.1)') // Far (blue)
        
        ctx.fillStyle = dofGradient
        ctx.beginPath()
        ctx.moveTo(centerX - nearPlaneWidth/2, nearY)
        ctx.lineTo(centerX + nearPlaneWidth/2, nearY)
        ctx.lineTo(centerX + farPlaneWidth/2, farY)
        ctx.lineTo(centerX - farPlaneWidth/2, farY)
        ctx.closePath()
        ctx.fill()
      }
      
      // Draw ground plane with gradient
      const groundGradient = ctx.createLinearGradient(
        centerX - halfWidth, baseY,
        centerX + halfWidth, baseY
      )
      groundGradient.addColorStop(0, 'rgba(0, 255, 0, 0.1)')
      groundGradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.3)')
      groundGradient.addColorStop(1, 'rgba(0, 255, 0, 0.1)')
      
      ctx.fillStyle = groundGradient
      ctx.beginPath()
      ctx.rect(centerX - halfWidth, baseY - 2, halfWidth * 2, 4)
      ctx.fill()
      
      // Draw ground outline
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX - halfWidth, baseY)
      ctx.lineTo(centerX + halfWidth, baseY)
      ctx.stroke()
      
      // Draw dimensions
      ctx.font = '14px Arial'
      ctx.fillStyle = '#00ff00'
      ctx.textAlign = 'center'
      ctx.fillText(`${width.toFixed(1)}m`, centerX, baseY + 20)
      
      // Add distance markers
      ctx.fillStyle = '#ffff00'
      ctx.beginPath()
      ctx.arc(centerX, baseY, 5, 0, 2 * Math.PI)
      ctx.fill()
      
      // Add information panel with DOF details
      drawInfoPanelWithDOF(ctx, centerX, baseY + 60, {
        fov: fov,
        width: width,
        height: height,
        distance: props.focusDistance,
        aperture: props.aperture,
        dof: dofValues
      })
  } catch (error) {
      console.error('Error drawing visualization:', error)
      drawErrorMessage(ctx, centerX, centerY, 'Error calculating visualization')
    }
    } else {
    // No camera/lens selected
    drawErrorMessage(ctx, centerX, centerY, 'Please select a camera and lens to view visualization')
  }
  
  console.log('2D canvas visualization created successfully')
}

// Draw the grid background
const drawGrid = (ctx, width, height) => {
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 0.5
  
  // Draw horizontal lines
  const gridSize = 20
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // Draw vertical lines
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
}

// Draw the drone
const drawDrone = (ctx, x, y) => {
  // Draw drone body
  ctx.fillStyle = '#666666'
  ctx.beginPath()
  ctx.roundRect(x - 30, y - 15, 60, 30, 5)
  ctx.fill()
  
  // Draw drone details
  ctx.fillStyle = '#00ccff'
  ctx.fillRect(x - 20, y - 8, 40, 3)
  
  // Draw rotors
  const rotorPositions = [
    {x: x - 35, y: y - 15},
    {x: x + 35, y: y - 15},
    {x: x - 35, y: y + 15},
    {x: x + 35, y: y + 15}
  ]
  
  ctx.fillStyle = '#444444'
  rotorPositions.forEach(pos => {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI)
    ctx.fill()
    
    // Draw spinning effect
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI)
    ctx.stroke()
  })
  
  // Draw camera mount
  ctx.fillStyle = '#333333'
  ctx.beginPath()
  ctx.roundRect(x - 10, y + 15, 20, 15, 3)
  ctx.fill()
  
  // Draw camera lens
  ctx.fillStyle = '#222222'
  ctx.beginPath()
  ctx.arc(x, y + 22, 5, 0, 2 * Math.PI)
  ctx.fill()
}

// Draw view buttons
const drawViewButtons = (canvas, ctx) => {
  const views = [
    { id: 'default', label: 'Default View' },
    { id: 'top', label: 'Top View' },
    { id: 'front', label: 'Front View' },
    { id: 'side', label: 'Side View' }
  ]
  
  // Create button container
  const buttonContainer = document.createElement('div')
  buttonContainer.style.position = 'absolute'
  buttonContainer.style.bottom = '10px'
  buttonContainer.style.left = '10px'
  buttonContainer.style.display = 'flex'
  buttonContainer.style.gap = '5px'
  
  views.forEach(view => {
    const button = document.createElement('button')
    button.textContent = view.label
    button.style.background = '#333'
    button.style.color = 'white'
    button.style.border = '1px solid #555'
    button.style.padding = '5px 10px'
    button.style.borderRadius = '4px'
    button.style.cursor = 'pointer'
    button.style.fontSize = '12px'
    
    button.addEventListener('click', () => {
      console.log(`View changed to ${view.id}`)
      showFallbackCanvas() // Redraw with the new view
    })
    
    buttonContainer.appendChild(button)
  })
  
  canvas.parentNode.appendChild(buttonContainer)
}

// Draw the information panel with DOF details
const drawInfoPanelWithDOF = (ctx, x, y, info) => {
  // Draw panel background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.beginPath()
  ctx.roundRect(x - 150, y, 300, 170, 5)
  ctx.fill()
  
  // Draw panel border
  ctx.strokeStyle = '#444444'
  ctx.lineWidth = 1
  ctx.stroke()
  
  // Draw panel content
  ctx.fillStyle = '#ffffff'
  ctx.font = '16px Arial'
  ctx.textAlign = 'left'
  
  const lineHeight = 22
  let lineY = y + 25
  
  ctx.fillText(`Field of View: ${info.fov.toFixed(1)}°`, x - 130, lineY)
  lineY += lineHeight
  
  ctx.fillText(`Ground Coverage: ${info.width.toFixed(1)}m × ${info.height.toFixed(1)}m`, x - 130, lineY)
  lineY += lineHeight
  
  ctx.fillText(`Focus Distance: ${info.distance}m`, x - 130, lineY)
  lineY += lineHeight
  
  ctx.fillText(`Aperture: f/${info.aperture}`, x - 130, lineY)
  lineY += lineHeight
  
  // Add DOF information
  ctx.fillStyle = '#ff7700'
  ctx.fillText(`Near Limit: ${info.dof.nearLimit.toFixed(2)}m`, x - 130, lineY)
  lineY += lineHeight
  
  ctx.fillStyle = '#00aaff'
  ctx.fillText(`Far Limit: ${info.dof.farLimit === Infinity ? '∞' : info.dof.farLimit.toFixed(2) + 'm'}`, x - 130, lineY)
  lineY += lineHeight
  
  ctx.fillStyle = '#00ff77'
  const totalDOF = info.dof.farLimit === Infinity ? '∞' : info.dof.totalDOF.toFixed(2) + 'm'
  ctx.fillText(`Total DOF: ${totalDOF}`, x - 130, lineY)
}

// Draw error message
const drawErrorMessage = (ctx, x, y, message) => {
  ctx.font = 'bold 18px Arial'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.fillText('Camera Visualization', x, y - 50)
  
  ctx.font = '16px Arial'
  ctx.fillStyle = '#ff6666'
  ctx.fillText(message, x, y - 10)
}

// Handle window resize
const onWindowResize = () => {
  if (!container.value) return
  
  // Redraw canvas when window is resized
  showFallbackCanvas()
}

// Animation loop
const animate = () => {
  // No longer needed - we're using 2D canvas only
}

// Initialize scene on mount
onMounted(() => {
  console.log('DroneVisualization mounted, container exists:', !!container.value)
  nextTick(() => {
    console.log('Starting visualization initialization')
    try {
      initScene()
      console.log('Visualization initialized successfully')
  } catch (error) {
      console.error('Error initializing visualization:', error)
      renderingFailed.value = true
      showFallbackCanvas()
      emit('error')
    }
  })
})

// Cleanup on unmount
onUnmounted(() => {
  // Remove event listeners
  window.removeEventListener('resize', onWindowResize)
})

// Update visualization when props change
  watch(
  () => [
    props.cameraDetails, 
    props.lensDetails, 
    props.aperture, 
    props.focusDistance
  ],
    () => {
    // Simply redraw the canvas with updated props
    showFallbackCanvas()
    },
    { deep: true }
)
</script>

<style>
.drone-visualization {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.visualization-container {
  width: 100%;
  height: 100%;
  background-color: #121212;
  border-radius: 4px;
  position: relative;
}
</style> 