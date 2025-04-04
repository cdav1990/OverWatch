<template>
  <div class="main-scene-container">
    <div ref="sceneContainer" class="scene-container"></div>
    
    <!-- Building visualization for simulation mode -->
    <BuildingVisualization 
      v-if="simulation?.waypoints?.length > 0 && !missionStore.simulation?.skipVisualization" 
      :scene="sceneObj" 
      :simulation-active="true"
      :animation-playing="simulation?.isPlaying || false"
    />
    
    <!-- Hardware info overlay -->
    <div v-if="hardwareConfigured && dronePosition.showInfoPanel" class="hardware-info">
      <div class="info-item">
        <span class="label">Drone:</span>
        <span class="value">{{ getDroneName }}</span>
      </div>
      <div class="info-item" v-if="hardware.camera !== 'none'">
        <span class="label">Camera:</span>
        <span class="value">{{ getCameraName }}</span>
      </div>
      <div class="info-item" v-if="hardware.camera !== 'none' && hardware.lens">
        <span class="label">Lens:</span>
        <span class="value">{{ hardware.lens }}</span>
      </div>
      <div class="info-item" v-if="hardware.lidar !== 'none'">
        <span class="label">LiDAR:</span>
        <span class="value">{{ getLidarName }}</span>
      </div>
    </div>
    
    <!-- Position control button -->
    <div v-if="hardwareConfigured" class="control-button">
      <v-btn 
        color="primary" 
        icon 
        @click="showPositionControl = true" 
        class="fab-button"
      >
        <v-icon>mdi-drone</v-icon>
        <v-tooltip activator="parent" location="top">Drone Controls</v-tooltip>
      </v-btn>
    </div>
    
    <!-- Position control panel -->
    <DronePositionControl 
      :is-visible="showPositionControl" 
      @close="showPositionControl = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useMissionStore } from '../store/missionStore'
import DronePositionControl from './DronePositionControl.vue'
import BuildingVisualization from './BuildingVisualization.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const missionStore = useMissionStore()

// References
const sceneContainer = ref(null)
const showPositionControl = ref(false)
const selectionMode = ref('none')
const sceneInitialized = ref(false)
const isDroneFollowing = ref(false)
const animationStep = ref(0)
const waypoints = ref([])
let animationId = null

// Scene elements
let sceneObj = null
let cameraObj = null
let rendererObj = null
let controlsObj = null
let droneObj = null
let groundObj = null
let cameraModelObj = null
let cameraFrustumObj = null
let lidarModelObj = null
let dofVisualizationObj = null
let scanObjectObj = null // Track the 3D scan object in the scene
let takeoffMarkerObj = null; // Track the takeoff marker

// Computed properties
const hardware = computed(() => missionStore.hardware || {})

const dronePosition = computed(() => missionStore.dronePosition || {
  x: 0,
  y: 50,
  z: 0,
  followCamera: false
})

const simulation = computed(() => {
  // Check if missionStore.simulation exists, otherwise return a default object
  return missionStore.simulation || {
  waypoints: [],
  activeWaypoint: 0,
  isPlaying: false
  };
})

const hardwareConfigured = computed(() => {
  return hardware.value && hardware.value.drone
})

// Human-readable names
const getDroneName = computed(() => {
  if (!hardware.value) return ''
  return hardware.value.drone === 'astro' ? 'FreeFly Astro' : 'FreeFly Alta'
})

const getCameraName = computed(() => {
  if (!hardware.value) return ''
  
  switch (hardware.value.camera) {
    case 'phaseone': return 'Phase One IXM'
    case 'ilx': return 'Sony ILX'
    case 'a7': return 'Sony A7'
    default: return 'None'
  }
})

const getLidarName = computed(() => {
  if (!hardware.value) return ''
  
  switch (hardware.value.lidar) {
    case 'ouster': return 'Ouster OS0-128'
    case 'hovermap': return 'Emesent Hovermap'
    default: return 'None'
  }
})

// Get the actual focal length from lens string
const focalLengthMM = computed(() => {
  if (!hardware.value?.lens) return 50
  
  // Extract focal length
  const match = hardware.value.lens.match(/(\d+)mm/)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  
  // For zoom lenses, use mid-point
  const zoomMatch = hardware.value.lens.match(/(\d+)-(\d+)mm/)
  if (zoomMatch && zoomMatch[1] && zoomMatch[2]) {
    const min = parseInt(zoomMatch[1], 10)
    const max = parseInt(zoomMatch[2], 10)
    return Math.round((min + max) / 2)
  }
  
  return 50 // Default
})

// Get the circle of confusion based on camera type (in mm)
const circleOfConfusion = computed(() => {
  if (!hardware.value) return 0.029
  
  switch (hardware.value.camera) {
    case 'phaseone': return 0.03 // Medium format
    case 'a7': return 0.029 // Full frame
    case 'ilx': return 0.018 // APS-C
    default: return 0.029 // Default to full frame
  }
})

// Calculate DOF values
const dofValues = computed(() => {
  if (!hardware.value || hardware.value.camera === 'none' || !hardware.value.lens) {
    return {
      nearFocusM: 0,
      farFocusM: 0,
      hyperfocalM: 0
    }
  }
  
  // Convert distance from feet to mm
  const distanceMM = hardware.value.focusDistance * 304.8 // 1 foot = 304.8mm
  
  // Calculate hyperfocal distance (in mm)
  const hyperfocalMM = Math.pow(focalLengthMM.value, 2) / (hardware.value.fStop * circleOfConfusion.value) + focalLengthMM.value
  
  // Calculate near focus distance (in mm)
  const nearFocusMM = (distanceMM * (hyperfocalMM - focalLengthMM.value)) / (hyperfocalMM + distanceMM - (2 * focalLengthMM.value))
  
  // Calculate far focus distance (in mm)
  let farFocusMM
  if (distanceMM >= hyperfocalMM) {
    farFocusMM = Infinity
  } else {
    farFocusMM = (distanceMM * (hyperfocalMM - focalLengthMM.value)) / (hyperfocalMM - distanceMM)
  }
  
  // Convert to meters for Three.js visualization
  return {
    nearFocusM: nearFocusMM / 1000,
    farFocusM: farFocusMM === Infinity ? 1000 : farFocusMM / 1000, // Cap at 1000m
    hyperfocalM: hyperfocalMM / 1000
  }
})

// Create and initialize the 3D scene
const createScene = () => {
  if (sceneInitialized.value || !sceneContainer.value) return;
  
  try {
    // Create THREE.js scene
    sceneObj = new THREE.Scene();
    sceneObj.background = new THREE.Color(0x121212);
    
    // Add fog for depth perception
    sceneObj.fog = new THREE.Fog(0x121212, 100, 800);
    
    // Create and position the camera
    cameraObj = new THREE.PerspectiveCamera(
      70, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );
    
    // Initial camera position, will be adjusted later
    cameraObj.position.set(50, 50, 50);
    cameraObj.lookAt(0, 0, 0);
    
    // Set up renderer
    rendererObj = new THREE.WebGLRenderer({ antialias: true });
    rendererObj.setPixelRatio(window.devicePixelRatio);
    rendererObj.setSize(window.innerWidth, window.innerHeight);
    rendererObj.shadowMap.enabled = true;
    
    // Add to container
    if (sceneContainer.value && !sceneContainer.value.querySelector('canvas')) {
      sceneContainer.value.appendChild(rendererObj.domElement);
    }
    
    // Set up controls
    controlsObj = new OrbitControls(cameraObj, rendererObj.domElement);
    controlsObj.enableDamping = true;
    controlsObj.dampingFactor = 0.1;
    controlsObj.screenSpacePanning = false;
    controlsObj.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
    controlsObj.target.set(0, 0, 0);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneObj.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    sceneObj.add(directionalLight);
    
    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      side: THREE.DoubleSide,
      roughness: 0.8
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    ground.userData.excludeRaycaster = false;
    groundObj = ground;
    sceneObj.add(ground);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(2000, 200, 0x555555, 0x333333);
    gridHelper.position.y = 0.01; // Slightly above ground to avoid z-fighting
    sceneObj.add(gridHelper);
    
    // Check if a takeoff location already exists, if so, create a marker for it
    if (missionStore.hasTakeoffLocation) {
      const takeoffLocation = missionStore.takeoffLocation;
      createTakeoffMarker({
        x: takeoffLocation.lat,
        y: 0,
        z: takeoffLocation.lng
      });
    }
    
    // Create compass
    createCompass();
    
    // Create drone model
    if (hardwareConfigured.value) {
      createDrone();
    }
    
    // Add event listeners
    rendererObj.domElement.addEventListener('dblclick', handleDoubleClick);
    rendererObj.domElement.addEventListener('click', handleGroundClick);
    
    // Handle window resize
    window.addEventListener('resize', onResize);
    
    // Start animation loop
    animate();
    
    // Mark as initialized
    sceneInitialized.value = true;
  } catch (error) {
    console.error('Error creating main scene:', error)
  }
}

// Handle click on ground plane for selection operations
const handleGroundClick = (event) => {
  // Skip if we're not in selection mode
  if (selectionMode.value === 'none') return;
  
  // Check if the click was on the ground plane
  const intersection = getIntersection(event);
  if (!intersection) return;
  
  // Get the intersection point - where the click happened on the ground plane
  const point = intersection.point;
  
  // Handle different selection modes
  if (selectionMode.value === 'takeoff') {
    // Handle takeoff location selection
    handleTakeoffSelection(point);
    
    // Clean up the hover indicator
    removeTakeoffHoverIndicator();
    
    // Exit takeoff selection mode
    window.dispatchEvent(new CustomEvent('exit-takeoff-selection'));
  } else if (selectionMode.value === 'orbit-target') {
    // Handle orbit target point selection
    handleOrbitTargetSelection(point);
  }
  
  // Create a custom event with the click data
  const customEvent = new CustomEvent('ground-click', {
    detail: {
      position: point,
      selectionMode: selectionMode.value
    }
  });
  
  // Log the event before dispatching
  console.log('Dispatching ground-click event with data:', customEvent.detail);
  
  // Dispatch the event
  window.dispatchEvent(customEvent);
};

// Handle double-click
const handleDoubleClick = (event) => {
  // First, try to select object for dragging
  const intersection = getObjectIntersection(event);
  
  if (intersection && intersection.object) {
    // Get the root object (parent group)
    let rootObject = intersection.object;
    while (rootObject.parent && rootObject.parent !== sceneObj) {
      rootObject = rootObject.parent;
    }
    
    // Check if the object is draggable
    if (rootObject.userData && rootObject.userData.isDraggable) {
      selectedObject = rootObject;
      
      // Temporarily disable orbit controls during dragging
      if (controlsObj) {
        controlsObj.enabled = false;
      }
      
      // Show visual indicator that the object is selected
      if (selectedObject) {
        // Could add a highlight effect here
        
        // Show a notification
        showNotification({
          message: 'Object selected. Click and drag to move it.',
          color: 'info',
          timeout: 3000
        });
        
        // Change cursor to indicate draggable state
        if (sceneContainer.value) {
          sceneContainer.value.style.cursor = 'move';
        }
      }
      return; // Exit function to prevent showing position control
    }
  }
  
  // If no draggable object was clicked, show position control panel (hardware settings)
  if (hardwareConfigured.value) {
    showPositionControl.value = true;
  }
}

// Create drone model
const createDrone = () => {
  if (!sceneObj || !hardware.value) return
  
  try {
    // Remove existing drone model if it exists
    if (droneObj) {
      sceneObj.remove(droneObj)
    }
    
    const droneGroup = new THREE.Group()
    
    // Create drone body - different shape based on drone type
    let bodyGeometry
    
    if (hardware.value.drone === 'astro') {
      // Astro is more rectangular
      bodyGeometry = new THREE.BoxGeometry(2, 0.3, 1.5)
    } else {
      // Alta has an X shape
      bodyGeometry = new THREE.BoxGeometry(1.5, 0.3, 1.5)
    }
    
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.5,
      metalness: 0.8
    })
    const droneBody = new THREE.Mesh(bodyGeometry, bodyMaterial)
    droneGroup.add(droneBody)
    
    // Add arms for propellers
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.5,
      metalness: 0.7
    })
    
    // Different arm configuration based on drone type
    if (hardware.value.drone === 'astro') {
      // Astro has 4 arms
      const armPositions = [
        { x: 1, z: 1 },
        { x: 1, z: -1 },
        { x: -1, z: 1 },
        { x: -1, z: -1 }
      ]
      
      armPositions.forEach(pos => {
        const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8)
        const arm = new THREE.Mesh(armGeometry, armMaterial)
        arm.position.set(pos.x, 0, pos.z)
        arm.rotation.x = Math.PI / 2
        droneGroup.add(arm)
        
        // Add propeller
        const propGeometry = new THREE.BoxGeometry(0.8, 0.02, 0.05)
        const propMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 })
        const propeller = new THREE.Mesh(propGeometry, propMaterial)
        propeller.position.set(pos.x, 0.5, pos.z)
        droneGroup.add(propeller)
      })
    } else {
      // Alta has 8 arms in X configuration
      const armPositions = [
        { x: 1.2, z: 1.2 },
        { x: 1.2, z: -1.2 },
        { x: -1.2, z: 1.2 },
        { x: -1.2, z: -1.2 },
        { x: 1.7, z: 0 },
        { x: -1.7, z: 0 },
        { x: 0, z: 1.7 },
        { x: 0, z: -1.7 }
      ]
      
      armPositions.forEach(pos => {
        const armGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8)
        const arm = new THREE.Mesh(armGeometry, armMaterial)
        arm.position.set(pos.x, 0, pos.z)
        arm.rotation.x = Math.PI / 2
        droneGroup.add(arm)
        
        // Add propeller
        const propGeometry = new THREE.BoxGeometry(0.6, 0.02, 0.04)
        const propMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 })
        const propeller = new THREE.Mesh(propGeometry, propMaterial)
        propeller.position.set(pos.x, 0.4, pos.z)
        droneGroup.add(propeller)
      })
    }
    
    // Add landing gear
    const gearGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8)
    const gearMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 })
    
    const gearPositions = [
      { x: 0.8, z: 0.8 },
      { x: 0.8, z: -0.8 },
      { x: -0.8, z: 0.8 },
      { x: -0.8, z: -0.8 }
    ]
    
    gearPositions.forEach(pos => {
      const gear = new THREE.Mesh(gearGeometry, gearMaterial)
      gear.position.set(pos.x, -0.7, pos.z)
      droneGroup.add(gear)
    })
    
    // Create camera and LiDAR models if selected
    if (hardware.value.camera !== 'none') {
      createCameraModel(droneGroup)
    }
    
    if (hardware.value.lidar !== 'none') {
      createLidarModel(droneGroup)
    }
    
    // Position the drone according to dronePosition
    // Check if takeoff location exists and no specific drone position is set
    if (missionStore.hasTakeoffLocation && !dronePosition.value.x && !dronePosition.value.z) {
      // Use takeoff location for initial positioning
      const takeoff = missionStore.takeoffLocation;
      missionStore.setDronePosition({
        x: takeoff.lat,
        y: 6, // 6 feet above ground level for hovering
        z: takeoff.lng,
        followCamera: false
      });
    }
    
    // Set position from current dronePosition state
    droneGroup.position.set(
      dronePosition.value.x * 0.3048, // Convert feet to meters
      dronePosition.value.y * 0.3048, // Convert feet to meters
      dronePosition.value.z * 0.3048  // Convert feet to meters
    )
    
    // Add to scene
    droneObj = droneGroup
    sceneObj.add(droneObj)
    
    // Create camera frustum
    if (hardware.value.camera !== 'none') {
      createCameraFrustum()
    }
    
    // Create DOF visualization
    if (hardware.value.camera !== 'none') {
      createDOFVisualization()
    }
  } catch (error) {
    console.error('Error creating drone model:', error)
  }
}

// Create camera model
const createCameraModel = (droneGroup) => {
  if (!droneGroup || !hardware.value) return
  
  try {
    // Create camera model based on type
    let cameraWidth, cameraHeight, cameraDepth, cameraColor
    
    switch (hardware.value.camera) {
      case 'phaseone':
        cameraWidth = 0.8
        cameraHeight = 0.6
        cameraDepth = 0.5
        cameraColor = 0x3d85c6 // Blue
        break
      case 'ilx':
        cameraWidth = 0.7
        cameraHeight = 0.5
        cameraDepth = 0.4
        cameraColor = 0xff9900 // Orange
        break
      case 'a7':
        cameraWidth = 0.6
        cameraHeight = 0.4
        cameraDepth = 0.3
        cameraColor = 0xcc0000 // Red
        break
      default:
        return
    }
    
    // Camera body
    const bodyGeometry = new THREE.BoxGeometry(cameraWidth, cameraHeight, cameraDepth)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: cameraColor,
      roughness: 0.5,
      metalness: 0.7
    })
    const cameraBody = new THREE.Mesh(bodyGeometry, bodyMaterial)
    
    // Camera lens
    let lensRadius, lensLength
    if (hardware.value.lens.includes('16mm')) {
      lensRadius = 0.15
      lensLength = 0.2
    } else if (hardware.value.lens.includes('24mm') || hardware.value.lens.includes('28mm') || hardware.value.lens.includes('35mm')) {
      lensRadius = 0.18
      lensLength = 0.25
    } else if (hardware.value.lens.includes('50mm')) {
      lensRadius = 0.2
      lensLength = 0.3
    } else if (hardware.value.lens.includes('70mm') || hardware.value.lens.includes('85mm')) {
      lensRadius = 0.22
      lensLength = 0.4
    } else if (hardware.value.lens.includes('100mm') || hardware.value.lens.includes('120mm')) {
      lensRadius = 0.25
      lensLength = 0.5
    } else if (hardware.value.lens.includes('70-200mm')) {
      lensRadius = 0.3
      lensLength = 0.6
    } else {
      lensRadius = 0.2
      lensLength = 0.3
    }
    
    const lensGeometry = new THREE.CylinderGeometry(lensRadius, lensRadius, lensLength, 16)
    const lensMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.3,
      metalness: 0.8
    })
    const lens = new THREE.Mesh(lensGeometry, lensMaterial)
    lens.rotation.x = Math.PI / 2
    lens.position.z = (cameraDepth + lensLength) / 2
    
    // Create camera group and add parts
    const cameraGroup = new THREE.Group()
    cameraGroup.add(cameraBody)
    cameraGroup.add(lens)
    
    // Position under drone
    cameraGroup.position.set(0, -1, 0)
    
    // Add to drone group
    droneGroup.add(cameraGroup)
    
    cameraModelObj = cameraGroup
  } catch (error) {
    console.error('Error creating camera model:', error)
  }
}

// Create LiDAR model
const createLidarModel = (droneGroup) => {
  if (!droneGroup || !hardware.value) return
  
  try {
    const lidarGroup = new THREE.Group()
    
    // Different shapes based on LiDAR type
    if (hardware.value.lidar === 'ouster') {
      // Ouster is cylindrical
      const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16)
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.5,
        metalness: 0.8
      })
      const lidarBody = new THREE.Mesh(bodyGeometry, bodyMaterial)
      lidarGroup.add(lidarBody)
      
      // Add details
      const ringGeometry = new THREE.TorusGeometry(0.25, 0.02, 8, 32)
      const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.15
      lidarGroup.add(ring)
      
    } else if (hardware.value.lidar === 'hovermap') {
      // Hovermap is more boxy
      const bodyGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4)
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x777700,
        roughness: 0.5,
        metalness: 0.5
      })
      const lidarBody = new THREE.Mesh(bodyGeometry, bodyMaterial)
      lidarGroup.add(lidarBody)
      
      // Add housing details
      const housingGeometry = new THREE.BoxGeometry(0.45, 0.1, 0.45)
      const housingMaterial = new THREE.MeshStandardMaterial({ color: 0x444400 })
      const housing = new THREE.Mesh(housingGeometry, housingMaterial)
      housing.position.y = 0.25
      lidarGroup.add(housing)
    }
    
    // Position next to camera
    lidarGroup.position.set(0.7, -1, 0)
    
    // Add to drone group
    droneGroup.add(lidarGroup)
    
    lidarModelObj = lidarGroup
  } catch (error) {
    console.error('Error creating LiDAR model:', error)
  }
}

// Create camera frustum
const createCameraFrustum = () => {
  if (!sceneObj || !droneObj || !hardware.value || hardware.value.camera === 'none') return
  
  try {
    // Remove existing frustum if it exists
    if (cameraFrustumObj) {
      sceneObj.remove(cameraFrustumObj)
    }
    
    const frustumGroup = new THREE.Group()
    
    // Calculate FOV based on camera and lens
    let fovDegrees = 50 // default
    let aspectRatio = 3/2 // default
    
    // Different sensor sizes
    let sensorWidth
    switch (hardware.value.camera) {
      case 'phaseone':
        sensorWidth = 53.4 // mm, medium format
        aspectRatio = 4/3
        break
      case 'ilx':
        sensorWidth = 23.5 // mm, APS-C
        aspectRatio = 3/2
        break
      case 'a7':
        sensorWidth = 35.9 // mm, full frame
        aspectRatio = 3/2
        break
      default:
        sensorWidth = 35.9
    }
    
    // Calculate horizontal FOV
    fovDegrees = 2 * Math.atan(sensorWidth / (2 * focalLengthMM.value)) * (180 / Math.PI)
    
    // Vertical FOV
    const vFovDegrees = 2 * Math.atan((sensorWidth / aspectRatio) / (2 * focalLengthMM.value)) * (180 / Math.PI)
    
    // Convert to radians
    const fovRadians = fovDegrees * (Math.PI / 180)
    const vFovRadians = vFovDegrees * (Math.PI / 180)
    
    // Calculate frustum dimensions at distance
    const distance = 20 // Longer frustum for main scene
    const width = 2 * distance * Math.tan(fovRadians / 2)
    const height = 2 * distance * Math.tan(vFovRadians / 2)
    
    // Create frustum wireframe
    const frustumPoints = [
      new THREE.Vector3(0, 0, 0), // camera position
      new THREE.Vector3(width/2, height/2, -distance),
      new THREE.Vector3(-width/2, height/2, -distance),
      new THREE.Vector3(-width/2, -height/2, -distance),
      new THREE.Vector3(width/2, -height/2, -distance),
    ]
    
    // Determine frustum color based on camera type
    let frustumColor
    switch (hardware.value.camera) {
      case 'phaseone':
        frustumColor = 0x3d85c6 // Blue
        break
      case 'ilx':
        frustumColor = 0xff9900 // Orange
        break
      case 'a7':
        frustumColor = 0xcc0000 // Red
        break
      default:
        frustumColor = 0xffffff
    }
    
    if (!dronePosition.value.enhancedVisualization) {
      // Simple mode - just basic wireframe
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        frustumPoints[0], frustumPoints[1], // Top right edge
        frustumPoints[0], frustumPoints[2], // Top left edge
        frustumPoints[0], frustumPoints[3], // Bottom left edge
        frustumPoints[0], frustumPoints[4], // Bottom right edge
        frustumPoints[1], frustumPoints[2], // Top edge
        frustumPoints[2], frustumPoints[3], // Left edge
        frustumPoints[3], frustumPoints[4], // Bottom edge
        frustumPoints[4], frustumPoints[1]  // Right edge
      ])
      
      const lineMaterial = new THREE.LineBasicMaterial({ color: frustumColor })
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
      frustumGroup.add(lines)
      
      // Add a simple semi-transparent plane to show the FOV
      const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: frustumColor,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      })
      const plane = new THREE.Mesh(planeGeometry, planeMaterial)
      plane.position.set(0, 0, -distance/2)
      frustumGroup.add(plane)
    } else {
      // Enhanced mode - more detailed visualization
      
      // Create a more detailed frustum with more segments
      const enhancedFrustumGeometry = new THREE.BufferGeometry()
      const vertices = []
      
      // Create a more detailed representation with intermediate points
      const segments = 8 // Number of segments for the enhanced frustum
      
      for (let i = 0; i <= segments; i++) {
        // Calculate t as a value from 0 to 1
        const t = i / segments
        
        // Interpolate between camera and frustum corners
        const topRight = new THREE.Vector3().lerpVectors(
          frustumPoints[0], 
          frustumPoints[1], 
          t
        )
        vertices.push(topRight.x, topRight.y, topRight.z)
        
        const topLeft = new THREE.Vector3().lerpVectors(
          frustumPoints[0], 
          frustumPoints[2], 
          t
        )
        vertices.push(topLeft.x, topLeft.y, topLeft.z)
        
        const bottomLeft = new THREE.Vector3().lerpVectors(
          frustumPoints[0], 
          frustumPoints[3], 
          t
        )
        vertices.push(bottomLeft.x, bottomLeft.y, bottomLeft.z)
        
        const bottomRight = new THREE.Vector3().lerpVectors(
          frustumPoints[0], 
          frustumPoints[4], 
          t
        )
        vertices.push(bottomRight.x, bottomRight.y, bottomRight.z)
      }
      
      // Set the vertices
      enhancedFrustumGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      
      // Generate indices for connecting the vertices
      const indices = []
      const pointsPerLayer = 4 // 4 points per layer (top-right, top-left, bottom-left, bottom-right)
      
      // Connect along the edges
      for (let i = 0; i < segments; i++) {
        const layerOffset = i * pointsPerLayer
        const nextLayerOffset = (i + 1) * pointsPerLayer
        
        // Connect layers with lines
        for (let j = 0; j < pointsPerLayer; j++) {
          indices.push(layerOffset + j, nextLayerOffset + j)
        }
        
        // Connect points within each layer
        for (let j = 0; j < pointsPerLayer; j++) {
          indices.push(
            layerOffset + j, 
            layerOffset + ((j + 1) % pointsPerLayer)
          )
          indices.push(
            nextLayerOffset + j, 
            nextLayerOffset + ((j + 1) % pointsPerLayer)
          )
        }
      }
      
      // Set the indices
      enhancedFrustumGeometry.setIndex(indices)
      
      // Create the line segments
      const enhancedLineMaterial = new THREE.LineBasicMaterial({ 
        color: frustumColor,
        transparent: true,
        opacity: 0.8
      })
      const enhancedLines = new THREE.LineSegments(enhancedFrustumGeometry, enhancedLineMaterial)
      frustumGroup.add(enhancedLines)
      
      // Add glowing effect with additional translucent frustum
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(frustumColor) },
          viewVector: { value: new THREE.Vector3() }
        },
        vertexShader: `
          uniform vec3 viewVector;
          varying float intensity;
          void main() {
            vec3 vNormal = normalize(normalMatrix * normal);
            vec3 vView = normalize(viewVector - vec3(modelViewMatrix * vec4(position, 1.0)));
            intensity = 0.5 - dot(vNormal, vView);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying float intensity;
          void main() {
            gl_FragColor = vec4(color, 0.2 * intensity);
          }
        `,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      })
      
      // Create a frustum shape for the glow effect
      const frustumShape = new THREE.Shape()
      frustumShape.moveTo(0, 0)
      frustumShape.lineTo(width/2, height/2)
      frustumShape.lineTo(-width/2, height/2)
      frustumShape.lineTo(0, 0)
      
      const extrudeSettings = {
        steps: 1,
        depth: distance,
        bevelEnabled: false
      }
      
      const frustumGeometry = new THREE.ExtrudeGeometry(frustumShape, extrudeSettings)
      const glowMesh = new THREE.Mesh(frustumGeometry, glowMaterial)
      frustumGroup.add(glowMesh)
      
      // Add animated FOV plane 
      for (let i = 1; i <= 3; i++) {
        const planeDistance = distance / 4 * i
        const planeWidth = 2 * planeDistance * Math.tan(fovRadians / 2)
        const planeHeight = 2 * planeDistance * Math.tan(vFovRadians / 2)
        
        const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1)
        const planeMaterial = new THREE.MeshBasicMaterial({
          color: frustumColor,
          transparent: true,
          opacity: 0.05 + (i * 0.03), // Increase opacity for planes farther away
          side: THREE.DoubleSide
        })
        
        const plane = new THREE.Mesh(planeGeometry, planeMaterial)
        plane.position.set(0, 0, -planeDistance)
        
        // Add subtle animation
        const animate = () => {
          requestAnimationFrame(animate)
          const t = Date.now() * 0.0005
          const scale = 1 + 0.05 * Math.sin(t + i)
          plane.scale.set(scale, scale, 1)
        }
        animate()
        
        frustumGroup.add(plane)
      }
      
      // Add field of view labels
      const fovLabelCanvas = document.createElement('canvas')
      const fovContext = fovLabelCanvas.getContext('2d')
      fovLabelCanvas.width = 256
      fovLabelCanvas.height = 64
      
      fovContext.fillStyle = '#ffffff'
      fovContext.font = 'bold 24px Arial'
      fovContext.textAlign = 'center'
      fovContext.fillText(`FOV: ${fovDegrees.toFixed(1)}°`, 128, 32)
      
      const fovTexture = new THREE.CanvasTexture(fovLabelCanvas)
      const fovLabelMaterial = new THREE.SpriteMaterial({
        map: fovTexture,
        transparent: true
      })
      
      const fovLabel = new THREE.Sprite(fovLabelMaterial)
      fovLabel.position.set(0, height/2 + 1, -distance/2)
      fovLabel.scale.set(5, 1.25, 1)
      frustumGroup.add(fovLabel)
    }
    
    // Position frustum
    frustumGroup.position.copy(droneObj.position)
    frustumGroup.position.y -= 1 // Adjust to match camera position under drone
    frustumGroup.rotation.y = Math.PI // Point forward
    
    // Add to scene
    cameraFrustumObj = frustumGroup
    sceneObj.add(cameraFrustumObj)
  } catch (error) {
    console.error('Error creating camera frustum:', error)
  }
}

// Create DOF visualization
const createDOFVisualization = () => {
  if (!sceneObj || !droneObj || !hardware.value || hardware.value.camera === 'none') return
  
  try {
    // Remove existing DOF visualization if it exists
    if (dofVisualizationObj) {
      sceneObj.remove(dofVisualizationObj)
    }
    
    const dofGroup = new THREE.Group()
    
    // Convert focusDistance from feet to meters for scene scale
    const focusDistanceM = hardware.value.focusDistance * 0.3048 // 1 foot = 0.3048 meters
    
    // Create focus plane (positioned at focus distance)
    const focusPlaneSize = 10 // Size of the focus plane - larger for main scene
    const focusPlaneGeometry = new THREE.PlaneGeometry(focusPlaneSize, focusPlaneSize)
    const focusPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green for focus plane
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    })
    const focusPlane = new THREE.Mesh(focusPlaneGeometry, focusPlaneMaterial)
    focusPlane.position.set(0, 0, -focusDistanceM) // Position at focus distance
    dofGroup.add(focusPlane)
    
    // Add focus plane edges
    const edgesGeometry = new THREE.EdgesGeometry(focusPlaneGeometry)
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 })
    const focusPlaneEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
    focusPlaneEdges.position.set(0, 0, -focusDistanceM)
    dofGroup.add(focusPlaneEdges)
    
    // Add focus distance line
    const linePoints = [
      new THREE.Vector3(0, 0, 0), // Camera position
      new THREE.Vector3(0, 0, -focusDistanceM) // Focus point
    ]
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints)
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0x00ff00,
      dashSize: 0.2,
      gapSize: 0.1
    })
    const focusLine = new THREE.Line(lineGeometry, lineMaterial)
    focusLine.computeLineDistances() // Needed for dashed lines
    dofGroup.add(focusLine)
    
    // Add hyperfocal point visualization
    if (dofValues.value.hyperfocalM > 0) {
      // Create a sphere marker for the hyperfocal point
      const hyperfocalSphereGeometry = new THREE.SphereGeometry(0.3, 16, 16)
      const hyperfocalSphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00, // Yellow for hyperfocal point
        wireframe: false
      })
      const hyperfocalSphere = new THREE.Mesh(hyperfocalSphereGeometry, hyperfocalSphereMaterial)
      hyperfocalSphere.position.set(0, 0, -dofValues.value.hyperfocalM)
      dofGroup.add(hyperfocalSphere)
      
      // Add pulsing animation
      const pulseAnimation = () => {
        requestAnimationFrame(pulseAnimation)
        if (hyperfocalSphere) {
          const time = Date.now() * 0.001
          const scale = 1 + 0.2 * Math.sin(time * 3)
          hyperfocalSphere.scale.set(scale, scale, scale)
        }
      }
      pulseAnimation()
      
      // Add a label for the hyperfocal distance
      if (dronePosition.value.enhancedVisualization) {
        // Create text label using sprite
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = 256
        canvas.height = 128
        
        context.font = '24px Arial'
        context.fillStyle = 'yellow'
        context.textAlign = 'center'
        context.fillText(`Hyperfocal: ${dofValues.value.hyperfocalM.toFixed(2)}m`, 128, 64)
        
        const texture = new THREE.CanvasTexture(canvas)
        const labelMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true
        })
        
        const label = new THREE.Sprite(labelMaterial)
        label.position.set(0, 1.5, -dofValues.value.hyperfocalM)
        label.scale.set(5, 2.5, 1)
        dofGroup.add(label)
      }
    }
    
    // Add DOF visualization planes if DOF is calculated
    if (dofValues.value.nearFocusM > 0) {
      // In simple mode, only show near, far and focus planes if enhanced visualization is disabled
      if (!dronePosition.value.enhancedVisualization) {
        // Near focus plane
        const nearPlaneGeometry = new THREE.PlaneGeometry(focusPlaneSize, focusPlaneSize)
        const nearPlaneMaterial = new THREE.MeshBasicMaterial({
          color: 0xff5500, // Orange for near plane
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide
        })
        const nearPlane = new THREE.Mesh(nearPlaneGeometry, nearPlaneMaterial)
        nearPlane.position.set(0, 0, -dofValues.value.nearFocusM) // Position at near focus distance
        dofGroup.add(nearPlane)
        
        // Near plane edges
        const nearEdgesGeometry = new THREE.EdgesGeometry(nearPlaneGeometry)
        const nearEdgesMaterial = new THREE.LineBasicMaterial({ color: 0xff5500 })
        const nearPlaneEdges = new THREE.LineSegments(nearEdgesGeometry, nearEdgesMaterial)
        nearPlaneEdges.position.set(0, 0, -dofValues.value.nearFocusM)
        dofGroup.add(nearPlaneEdges)
        
        // Far focus plane
        const farPlaneGeometry = new THREE.PlaneGeometry(focusPlaneSize + 6, focusPlaneSize + 6) // Larger size for far plane
        const farPlaneMaterial = new THREE.MeshBasicMaterial({
          color: 0x0055ff, // Blue for far plane
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide
        })
        const farPlane = new THREE.Mesh(farPlaneGeometry, farPlaneMaterial)
        farPlane.position.set(0, 0, -dofValues.value.farFocusM) // Position at far focus distance
        dofGroup.add(farPlane)
        
        // Far plane edges
        const farEdgesGeometry = new THREE.EdgesGeometry(farPlaneGeometry)
        const farEdgesMaterial = new THREE.LineBasicMaterial({ color: 0x0055ff })
        const farPlaneEdges = new THREE.LineSegments(farEdgesGeometry, farEdgesMaterial)
        farPlaneEdges.position.set(0, 0, -dofValues.value.farFocusM)
        dofGroup.add(farPlaneEdges)
      } else {
        // Enhanced visualization - create a more detailed DOF visualization
        
        // Create a more accurate representation of the near focus plane
        const nearPlaneSize = Math.max(5, focusPlaneSize * (dofValues.value.nearFocusM / focusDistanceM))
        const nearPlaneGeometry = new THREE.PlaneGeometry(nearPlaneSize, nearPlaneSize)
        const nearPlaneMaterial = new THREE.MeshBasicMaterial({
          color: 0xff5500, // Orange for near plane
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide
        })
        const nearPlane = new THREE.Mesh(nearPlaneGeometry, nearPlaneMaterial)
        nearPlane.position.set(0, 0, -dofValues.value.nearFocusM)
        dofGroup.add(nearPlane)
        
        // Near plane edges with glow effect
        const nearEdgesGeometry = new THREE.EdgesGeometry(nearPlaneGeometry)
        const nearEdgesMaterial = new THREE.LineBasicMaterial({ 
          color: 0xff5500,
          linewidth: 2 // Note: linewidth > 1 may not work in WebGL
        })
        const nearPlaneEdges = new THREE.LineSegments(nearEdgesGeometry, nearEdgesMaterial)
        nearPlaneEdges.position.set(0, 0, -dofValues.value.nearFocusM)
        dofGroup.add(nearPlaneEdges)
        
        // Create a more accurate representation of the far focus plane
        let farPlaneSize
        if (dofValues.value.farFocusM === 1000) {
          // If infinity, make it much larger
          farPlaneSize = focusPlaneSize * 3
        } else {
          farPlaneSize = Math.max(5, focusPlaneSize * (dofValues.value.farFocusM / focusDistanceM))
        }
        
        const farPlaneGeometry = new THREE.PlaneGeometry(farPlaneSize, farPlaneSize)
        const farPlaneMaterial = new THREE.MeshBasicMaterial({
          color: 0x0055ff, // Blue for far plane
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide
        })
        const farPlane = new THREE.Mesh(farPlaneGeometry, farPlaneMaterial)
        farPlane.position.set(0, 0, -dofValues.value.farFocusM)
        dofGroup.add(farPlane)
        
        // Far plane edges with glow effect
        const farEdgesGeometry = new THREE.EdgesGeometry(farPlaneGeometry)
        const farEdgesMaterial = new THREE.LineBasicMaterial({ 
          color: 0x0055ff,
          linewidth: 2
        })
        const farPlaneEdges = new THREE.LineSegments(farEdgesGeometry, farEdgesMaterial)
        farPlaneEdges.position.set(0, 0, -dofValues.value.farFocusM)
        dofGroup.add(farPlaneEdges)
      }
      
      // Add DOF volume visualization (semi-transparent frustum between near and far planes)
      if (dronePosition.value.enhancedVisualization && dofValues.value.farFocusM < 100) {
        // Create high-quality DOF volume with improved transparency and gradient
        const dofVolumeGeometry = new THREE.CylinderGeometry(
          focusPlaneSize/2, 
          (focusPlaneSize+6)/2, 
          dofValues.value.farFocusM - dofValues.value.nearFocusM, 
          32, 8, true // More segments for higher quality
        )
        
        // Create a gradient material for better visualization
        const dofVolumeMaterial = new THREE.ShaderMaterial({
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          uniforms: {
            color1: { value: new THREE.Color(0xffaa77) }, // Orange-ish near
            color2: { value: new THREE.Color(0x77aaff) }, // Blue-ish far
            mixRatio: { value: 0.5 }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color1;
            uniform vec3 color2;
            uniform float mixRatio;
            varying vec2 vUv;
            void main() {
              gl_FragColor = vec4(mix(color1, color2, vUv.y), 0.05);
            }
          `
        })
        
        const dofVolume = new THREE.Mesh(dofVolumeGeometry, dofVolumeMaterial)
        // Position the cylinder to span from near to far focus
        dofVolume.position.set(0, 0, -(dofValues.value.nearFocusM + (dofValues.value.farFocusM - dofValues.value.nearFocusM)/2))
        dofVolume.rotation.x = Math.PI / 2 // Rotate to align with Z axis
        dofGroup.add(dofVolume)
        
        // Add wireframe for better visibility
        const wireframeGeometry = new THREE.WireframeGeometry(dofVolumeGeometry)
        const wireframeMaterial = new THREE.LineBasicMaterial({
          color: 0x88ccff,
          transparent: true,
          opacity: 0.2
        })
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial)
        wireframe.position.copy(dofVolume.position)
        wireframe.rotation.copy(dofVolume.rotation)
        dofGroup.add(wireframe)
      } else if (!dronePosition.value.enhancedVisualization && dofValues.value.farFocusM < 100) {
        // Simpler DOF volume for basic mode
        const dofVolumeGeometry = new THREE.CylinderGeometry(
          focusPlaneSize/2, 
          (focusPlaneSize+6)/2, 
          dofValues.value.farFocusM - dofValues.value.nearFocusM, 
          32, 1, true
        )
        const dofVolumeMaterial = new THREE.MeshBasicMaterial({
          color: 0xaaffff,
          transparent: true,
          opacity: 0.05,
          side: THREE.DoubleSide,
          depthWrite: false
        })
        const dofVolume = new THREE.Mesh(dofVolumeGeometry, dofVolumeMaterial)
        // Position the cylinder to span from near to far focus
        dofVolume.position.set(0, 0, -(dofValues.value.nearFocusM + (dofValues.value.farFocusM - dofValues.value.nearFocusM)/2))
        dofVolume.rotation.x = Math.PI / 2 // Rotate to align with Z axis
        dofGroup.add(dofVolume)
      }
    }
    
    // Position DOF group
    dofGroup.position.copy(droneObj.position)
    dofGroup.position.y -= 1 // Same height as camera
    dofGroup.rotation.y = Math.PI // Point forward
    
    // Add to scene
    dofVisualizationObj = dofGroup
    sceneObj.add(dofVisualizationObj)
  } catch (error) {
    console.error('Error creating DOF visualization:', error)
  }
}

// Animation loop
const animate = () => {
  if (!rendererObj || !cameraObj) return
  
  animationId = requestAnimationFrame(animate)
  
  // Update controls
  if (controlsObj) {
    controlsObj.update()
  }
  
  // Update drone position and rotation if following waypoints
  if (isDroneFollowing.value && animationStep.value < waypoints.value.length) {
    updateDronePosition()
  }
  
  // Make the takeoff marker label face the camera (billboard)
  if (takeoffMarkerObj) {
    // Find the sprite (label) in the takeoff marker group
    takeoffMarkerObj.children.forEach(child => {
      if (child instanceof THREE.Sprite) {
        // Sprites automatically face the camera
      }
    });
  }
  
  // Render the scene
  rendererObj.render(sceneObj, cameraObj)
}

// Handle resize
const onResize = () => {
  if (!cameraObj || !rendererObj || !sceneContainer.value) return
  
  try {
    cameraObj.aspect = sceneContainer.value.clientWidth / sceneContainer.value.clientHeight
    cameraObj.updateProjectionMatrix()
    rendererObj.setSize(sceneContainer.value.clientWidth, sceneContainer.value.clientHeight)
  } catch (error) {
    console.error('Error resizing renderer:', error)
  }
}

// Watch for changes to hardware and drone position
watch([() => hardware.value, () => dronePosition.value], () => {
  nextTick(() => {
    if (hardwareConfigured.value && sceneObj) {
      // Update the scene with new hardware configuration
      createDrone()
    }
  })
}, { deep: true })

// Add specific watch for enhancedVisualization changes
watch(() => dronePosition.value.enhancedVisualization, (newValue) => {
  nextTick(() => {
    if (hardwareConfigured.value && sceneObj) {
      // Update just the visualization elements
      createCameraFrustum()
      createDOFVisualization()
      
      console.log(`Enhanced visualization mode ${newValue ? 'enabled' : 'disabled'}`)
    }
  })
})

// Watch for specific camera setting changes
watch([() => hardware.value?.fStop, () => hardware.value?.focusDistance], () => {
  nextTick(() => {
    if (hardware.value?.camera !== 'none' && sceneObj) {
      // Update just the DOF visualization
      createDOFVisualization()
    }
  })
})

// Add a specific watch for the followCamera property to ensure we catch all changes
watch(() => dronePosition.value.followCamera, (newValue, oldValue) => {
  console.log(`[MainScene] Camera follow changed: ${oldValue} → ${newValue}`)
  
  if (newValue && controlsObj && cameraObj && droneObj) {
    // When follow mode is first enabled, position the camera at a good starting view
    
    // Set the orbit target to the drone
    controlsObj.target.set(droneObj.position.x, droneObj.position.y, droneObj.position.z)
    
    // Determine a zoomed-out camera position (much farther back than before)
    const cameraDistance = 50 // Meters from drone (much larger for zoomed out view)
    const cameraHeight = 25   // Meters above drone (higher for better overview)
    
    // Calculate the new camera position behind and above the drone
    const newCameraX = droneObj.position.x - cameraDistance
    const newCameraY = droneObj.position.y + cameraHeight
    const newCameraZ = droneObj.position.z - cameraDistance
    
    // Store the current camera position for smooth transition
    const currentPos = cameraObj.position.clone()
    
    // Set up a smooth transition animation using requestAnimationFrame
    let transitionProgress = 0
    const transitionDuration = 90 // frames (about 1.5 seconds at 60fps)
    
    const animateTransition = () => {
      transitionProgress++
      
      // Ease-in-out transition formula
      const t = transitionProgress / transitionDuration
      const smoothT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      
      // Interpolate camera position
      cameraObj.position.x = currentPos.x + (newCameraX - currentPos.x) * smoothT
      cameraObj.position.y = currentPos.y + (newCameraY - currentPos.y) * smoothT
      cameraObj.position.z = currentPos.z + (newCameraZ - currentPos.z) * smoothT
      
      // Look at the drone during transition
      cameraObj.lookAt(droneObj.position)
      
      // Continue animation until complete
      if (transitionProgress < transitionDuration) {
        requestAnimationFrame(animateTransition)
      }
    }
    
    // Start transition animation
    animateTransition()
  }
})

// Add a watch for info panel visibility changes
watch(() => dronePosition.value.showInfoPanel, (newValue, oldValue) => {
  console.log(`[MainScene] Info panel visibility changed: ${oldValue} → ${newValue}`)
})

// Watch for dronePosition changes
watch(() => dronePosition.value, (newPos) => {
  updateDronePosition()
}, { deep: true })

// Update drone position when it changes
const updateDronePosition = () => {
  if (!droneObj) return;
  
  const targetX = dronePosition.value.x * 0.3048; // Convert feet to meters
  const targetY = dronePosition.value.y * 0.3048; // Convert feet to meters
  const targetZ = dronePosition.value.z * 0.3048; // Convert feet to meters
  
  // Smoothly update drone position, using a higher smoothing factor for faster updates
  droneObj.position.x += (targetX - droneObj.position.x) * 0.5; // Increased from 0.1
  droneObj.position.y += (targetY - droneObj.position.y) * 0.5; // Increased from 0.1
  droneObj.position.z += (targetZ - droneObj.position.z) * 0.5; // Increased from 0.1
  
  // Safely update camera frustum position
  if (cameraFrustumObj && droneObj) {
    cameraFrustumObj.position.copy(droneObj.position);
    cameraFrustumObj.position.y -= 1; // Adjust to match camera position
  }
  
  // Safely update DOF visualization position
  if (dofVisualizationObj && droneObj) {
    dofVisualizationObj.position.copy(droneObj.position);
    dofVisualizationObj.position.y -= 1; // Adjust to match camera position
  }
  
  // Update camera if follow mode is enabled
  if (dronePosition.value.followCamera && controlsObj && droneObj) {
    // Update orbit controls target to follow the drone
    controlsObj.target.set(droneObj.position.x, droneObj.position.y, droneObj.position.z);
  }
};

// Handle click on the scene
const handleClick = (event) => {
  // Get the intersection point
  const intersection = getIntersection(event);
  if (!intersection) return;
  
  const point = intersection.point;
  const clickedObject = intersection.object;
  console.log('Scene clicked at:', point, 'Object:', clickedObject);
  
  // Check if we're in takeoff selection mode
  if (selectionMode.value === 'takeoff') {
    handleTakeoffSelection(point);
    return;
  }
  
  // Check if we're in orbit target selection mode
  if (selectionMode.value === 'orbit-target') {
    handleOrbitTargetSelection(point);
    return;
  }
  
  // Check if the clicked object is the drone or part of the camera frustum
  const isDroneObject = clickedObject && (
    // Check if it's the drone or a child of the drone
    (droneObj && (clickedObject === droneObj || isChildOf(clickedObject, droneObj))) ||
    // Check if it's the camera frustum or a child of the camera frustum
    (cameraFrustumObj && (clickedObject === cameraFrustumObj || isChildOf(clickedObject, cameraFrustumObj)))
  );
  
  // Only show the position control panel when clicking on the drone or camera frustum
  if (isDroneObject && hardwareConfigured.value) {
    console.log('Drone or camera frustum clicked, showing position control panel');
    showPositionControl.value = true;
    return; // Don't proceed further
  }
  
  // Dispatch the ground-click event with position data for other contexts
  const customEvent = new CustomEvent('ground-click', {
    detail: { 
      position: {
        x: point.x,
        y: point.y,
        z: point.z
      },
      isTakeoffSelection: document.body.classList.contains('takeoff-selection-mode')
    }
  });
  
  // Log the event before dispatching
  console.log('Dispatching ground-click event with data:', customEvent.detail);
  
  // Dispatch the event
  window.dispatchEvent(customEvent);
};

// Helper function to check if an object is a child of another object
const isChildOf = (obj, parent) => {
  let current = obj.parent;
  while (current) {
    if (current === parent) return true;
    current = current.parent;
  }
  return false;
};

// Direct handler for takeoff selection
const handleTakeoffSelection = (point) => {
  console.log('Handling takeoff selection directly at:', point);
  
  // Create a visual marker at the takeoff point
  createTakeoffMarker(point);
  
  // Set takeoff location in store
  missionStore.setTakeoffLocation({
    lat: point.x,
    lng: point.z
  });
  
  // Move drone to the selected take-off position
  missionStore.setDronePosition({
    x: point.x,
    y: 6, // 6 feet above ground level for hovering
    z: point.z,
    followCamera: false
  });
  
  // Force immediate positioning without smoothing for accurate placement
  if (droneObj) {
    // Convert feet to meters for the 3D scene
    droneObj.position.set(
      point.x * 0.3048, // Convert feet to meters  
      6 * 0.3048, // 6 feet converted to meters
      point.z * 0.3048 // Convert feet to meters
    );
    
    console.log('Directly positioned drone at:', droneObj.position);
    
    // Update camera frustum and DOF to match new position
    if (cameraFrustumObj) {
      cameraFrustumObj.position.copy(droneObj.position);
      cameraFrustumObj.position.y -= 1; // Adjust to match camera position
    }
    
    if (dofVisualizationObj) {
      dofVisualizationObj.position.copy(droneObj.position);
      dofVisualizationObj.position.y -= 1; // Adjust to match camera position
    }
  }
  
  // Reset takeoff selection mode
  selectionMode.value = 'none';
  document.body.classList.remove('takeoff-selection-mode');
  
  // Dispatch event to notify other components that takeoff location is set
  window.dispatchEvent(new CustomEvent('takeoff-location-set', {
    detail: { position: { x: point.x, z: point.z } }
  }));
  
  // Show success notification
  showNotification({
    message: 'Takeoff location set successfully',
    color: 'success',
    timeout: 3000
  });
  
  console.log('Takeoff location set successfully');
};

// Handle selection of orbit target point
const handleOrbitTargetSelection = (point) => {
  console.log('Handling orbit target selection at:', point);
  
  // Create a visual marker at the target point
  createOrbitMarker(point);
  
  // Calculate coordinates relative to takeoff point
  const takeoffLocation = missionStore.takeoffLocation;
  if (!takeoffLocation) {
    showNotification({
      message: 'Please set a takeoff location first',
      color: 'error',
      timeout: 3000
    });
    selectionMode.value = 'none';
    
    // Reset cursor
      if (sceneContainer.value) {
      sceneContainer.value.style.cursor = 'default';
    }
    return;
  }
  
  // Calculate relative coordinates
  const relativeX = point.x - takeoffLocation.lat;
  const relativeZ = point.z - takeoffLocation.lng;
  
  console.log('Orbit target relative to takeoff:', { x: relativeX, z: relativeZ });
  
  // Dispatch event with the selected coordinates
  window.dispatchEvent(new CustomEvent('orbit-target-selected', { 
    detail: { x: relativeX, z: relativeZ }
  }));
  
  // Exit selection mode
  selectionMode.value = 'none';
  
  // Reset cursor
      if (sceneContainer.value) {
    sceneContainer.value.style.cursor = 'default';
  }
  
  // Show success notification
  showNotification({
    message: 'Orbit target set successfully',
    color: 'success',
    timeout: 3000
  });
};

// Create marker for orbit target selection
const createOrbitMarker = (point) => {
  console.log('Creating orbit marker at:', point);
  return createMarker(point, 0xff9900);
}

// Create 3D object for scanning
const createScanObject = (properties) => {
  try {
    console.log('Creating 3D scan object with properties:', properties);
    
    // Remove existing scan object if present
    if (scanObjectObj) {
      sceneObj.remove(scanObjectObj);
      scanObjectObj = null;
    }
    
    // Create a group to hold the object
    const objectGroup = new THREE.Group();
    
    // Create the main geometry for the object
    const geometry = new THREE.BoxGeometry(
      properties.width, 
      properties.height, 
      properties.length
    );
    
    // Determine material color based on the color string
    let materialColor;
    switch(properties.color) {
      case 'red': materialColor = 0xff0000; break;
      case 'green': materialColor = 0x00ff00; break;
      case 'blue': materialColor = 0x0088ff; break;
      case 'yellow': materialColor = 0xffff00; break;
      case 'orange': materialColor = 0xff8800; break;
      case 'gray': materialColor = 0x888888; break;
      default: materialColor = 0x0088ff; // Default to blue
    }
    
    // Create solid mesh with no transparency unless explicitly requested
    if (!properties.isWireframe) {
      // Set default opacity to 1.0 (solid) unless specifically set in properties
      const opacity = typeof properties.opacity === 'number' ? properties.opacity : 1.0;
      const transparent = opacity < 1.0;
      
      const material = new THREE.MeshStandardMaterial({
        color: materialColor,
        transparent: transparent,
        opacity: opacity,
        side: THREE.DoubleSide
      });
      
      // Create the mesh and add to group
      const objectMesh = new THREE.Mesh(geometry, material);
      objectGroup.add(objectMesh);
    }
    
    // Add wireframe only if requested or if in wireframe mode
    if (properties.showWireframe || properties.isWireframe) {
      const wireframeGeometry = new THREE.WireframeGeometry(geometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({
        color: properties.isWireframe ? materialColor : 0xffffff,
        transparent: true,
        opacity: properties.isWireframe ? 0.9 : 0.5
      });
      
      const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
      objectGroup.add(wireframe);
    }
    
    // Position the object
    // If centerInScene is true, place at origin, otherwise use provided position
    const posX = properties.centerInScene ? 0 : (properties.position ? properties.position.x : 0);
    const posZ = properties.centerInScene ? 0 : (properties.position ? properties.position.z : 0);
    
    objectGroup.position.set(
      posX,
      properties.height / 2, // Half height to place bottom on ground
      posZ
    );
    
    // Add user data for object identification
    objectGroup.userData = {
      type: 'scanObject',
      isDraggable: properties.isDraggable !== false // Default to true if not specified
    };
    
    // Add to scene
    scanObjectObj = objectGroup;
    sceneObj.add(scanObjectObj);
    
    // Dispatch event to notify other components about the scan object
    window.dispatchEvent(new CustomEvent('scan-object-created', {
      detail: {
        object: scanObjectObj
      }
    }));
    
    // Create ground plane if requested
    if (properties.createGroundPlane !== false) {
      // Create ground plane under the object
      const groundSize = Math.max(properties.width, properties.length) * 2;
      const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
      const groundMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      
      const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
      groundPlane.rotation.x = -Math.PI / 2; // Rotate to horizontal
      groundPlane.position.y = 0.1; // Slightly above ground to avoid z-fighting
      objectGroup.add(groundPlane);
    }
    
    // Create secondary object if requested
    if (properties.createSecondaryObject !== false) {
      // Add secondary object for demo purposes
      const secondaryGeometry = new THREE.BoxGeometry(
        properties.width * 0.3, 
        properties.height * 0.4, 
        properties.length * 0.3
      );
      
      const secondaryMaterial = new THREE.MeshStandardMaterial({
        color: 0x00aa44,
        transparent: true,
        opacity: 0.7
      });
      
      const secondaryMesh = new THREE.Mesh(secondaryGeometry, secondaryMaterial);
      secondaryMesh.position.set(properties.width * 0.5, 0, properties.length * 0.5);
      objectGroup.add(secondaryMesh);
    }
    
    // Show success notification
    showNotification({
      message: '3D object created successfully',
      color: 'success',
      timeout: 3000
    });
    
    return scanObjectObj;
  } catch (error) {
    console.error('Error creating scan object:', error);
    
    // Show error notification
    showNotification({
      message: 'Error creating 3D object',
      color: 'error',
      timeout: 5000
    });
    
    return null;
  }
}

// Helper function to get intersection with ground
const getIntersection = (event) => {
  if (!rendererObj || !cameraObj || !groundObj) return null;
  
  // Get mouse position
  const mouse = new THREE.Vector2();
  const rect = rendererObj.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  // Raycasting
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, cameraObj);
  
  // Check for ground plane intersection
  const intersects = raycaster.intersectObject(groundObj);
  return intersects.length > 0 ? intersects[0] : null;
};

// Helper function to create visual markers
const createMarker = (point, color = 0xff9900) => {
  const markerGeometry = new THREE.SphereGeometry(1, 16, 16);
  const markerMaterial = new THREE.MeshBasicMaterial({ 
    color: color,
    transparent: true,
    opacity: 0.7
  });
  
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.position.set(point.x, point.y, point.z);
  
  sceneObj.add(marker);
  return marker;
};

// Create a prominent takeoff location marker with label
const createTakeoffMarker = (point) => {
  // Remove any existing takeoff marker
  if (takeoffMarkerObj) {
    sceneObj.remove(takeoffMarkerObj);
    takeoffMarkerObj = null;
  }
  
  // Create a group to hold the takeoff marker elements
  takeoffMarkerObj = new THREE.Group();
  
  // Create base pad (flat cylinder)
  const baseGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00, // Green color
    transparent: true,
    opacity: 0.7,
    roughness: 0.7,
    metalness: 0.3
  });
  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  baseMesh.position.set(point.x, 0.1, point.z); // Slightly above ground
  takeoffMarkerObj.add(baseMesh);
  
  // Add "H" label on top of pad
  const textCanvas = document.createElement('canvas');
  const ctx = textCanvas.getContext('2d');
  textCanvas.width = 128;
  textCanvas.height = 128;
  
  // Draw "H" on the canvas
  ctx.fillStyle = 'green';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 100px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', 64, 64);
  
  const textTexture = new THREE.CanvasTexture(textCanvas);
  const textMaterial = new THREE.MeshBasicMaterial({
    map: textTexture,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const textGeometry = new THREE.PlaneGeometry(2, 2);
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.rotation.x = -Math.PI / 2; // Rotate to face up
  textMesh.position.set(point.x, 0.21, point.z); // Just above the pad
  takeoffMarkerObj.add(textMesh);
  
  // Add vertical marker pole
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.7
  });
  const poleMesh = new THREE.Mesh(poleGeometry, poleMaterial);
  poleMesh.position.set(point.x, 2.5, point.z); // Half height up
  takeoffMarkerObj.add(poleMesh);
  
  // Add a label with "TAKEOFF" text
  const labelCanvas = document.createElement('canvas');
  const labelCtx = labelCanvas.getContext('2d');
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  
  labelCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  labelCtx.fillRect(0, 0, 256, 64);
  labelCtx.fillStyle = 'white';
  labelCtx.font = 'bold 24px Arial';
  labelCtx.textAlign = 'center';
  labelCtx.textBaseline = 'middle';
  labelCtx.fillText('TAKEOFF POINT', 128, 32);
  
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  const labelMaterial = new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true
  });
  
  const labelSprite = new THREE.Sprite(labelMaterial);
  labelSprite.position.set(point.x, 6, point.z); // Above the pole
  labelSprite.scale.set(5, 1.25, 1);
  takeoffMarkerObj.add(labelSprite);
  
  // Add pulsing animation to the base
  const pulse = () => {
    requestAnimationFrame(pulse);
    if (baseMesh) {
      const time = Date.now() * 0.001;
      const scaleFactor = 1 + 0.1 * Math.sin(time * 2);
      baseMesh.scale.set(scaleFactor, 1, scaleFactor);
    }
  };
  pulse();
  
  // Add the entire group to the scene
  sceneObj.add(takeoffMarkerObj);
  return takeoffMarkerObj;
};

// Helper function to show notifications
const showNotification = (options) => {
  window.dispatchEvent(new CustomEvent('show-notification', {
    detail: options
  }));
};

// Add variables for dragging functionality
let isDragging = false;
let selectedObject = null;
let dragPlane = new THREE.Plane();
let dragOffset = new THREE.Vector3();
let dragIntersection = new THREE.Vector3();

// Function to handle double-click
// Duplicate handleDoubleClick removed

// Function to get object intersection with raycaster
const getObjectIntersection = (event) => {
  if (!rendererObj || !cameraObj) return null;
  
  // Get mouse position
  const mouse = new THREE.Vector2();
  const rect = rendererObj.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  // Raycasting
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, cameraObj);
  
  // Check for object intersections - use intersectObjects instead of ray.intersectObjects
  const intersects = raycaster.intersectObjects(sceneObj.children, true);
  return intersects.length > 0 ? intersects[0] : null;
};

// Function to start dragging
const handleMouseDown = (event) => {
  if (!selectedObject) return;
  
  isDragging = true;
  
  // Get the intersection with the ground plane
  const intersection = getIntersection(event);
  
  if (intersection) {
    // Create a drag plane that's parallel to the ground
    dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      intersection.point
    );
    
    // Calculate offset from object position to intersection point
    dragOffset.copy(selectedObject.position).sub(intersection.point);
  }
};

// Function to handle dragging
const handleMouseMove = (event) => {
  if (!isDragging || !selectedObject) return;
  
  // Get mouse position
  const mouse = new THREE.Vector2();
  const rect = rendererObj.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  // Raycasting
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, cameraObj);
  
  // Find where the ray intersects the drag plane
  const didIntersect = raycaster.ray.intersectPlane(dragPlane, dragIntersection);
  
  if (didIntersect) {
    // Update object position, but keep y-value the same
    const newY = selectedObject.position.y;
    selectedObject.position.copy(dragIntersection).add(dragOffset);
    selectedObject.position.y = newY; // Keep the object at the same height
  }
};

// Function to end dragging
const handleMouseUp = () => {
  isDragging = false;
  
  // Re-enable orbit controls
  if (controlsObj) {
    controlsObj.enabled = true;
  }
};

// Function to cancel object selection
const handleKeyDown = (event) => {
  // Cancel selection with Escape key
  if (event.key === 'Escape' && selectedObject) {
    selectedObject = null;
    
    // Reset cursor
    if (sceneContainer.value) {
      sceneContainer.value.style.cursor = 'default';
    }
    
    // Re-enable orbit controls
    if (controlsObj) {
      controlsObj.enabled = true;
    }
  }
};

// Lifecycle hooks
onMounted(() => {
  nextTick(() => {
    createScene()
    
    // Add event listeners for Object mouse events and keyboard
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    
    // Listen for orbit target selection mode
    window.addEventListener('enter-orbit-target-selection', () => {
      selectionMode.value = 'orbit-target';
      console.log('Entered orbit target selection mode');
      
      // Change cursor to indicate selection mode
      if (sceneContainer.value) {
        sceneContainer.value.style.cursor = 'crosshair';
      }
      
      // Show instructions
      showNotification({
        message: 'Click on the map to select orbit target point',
        color: 'info',
        timeout: 5000
      });
    });
    
    // Listen for scan object creation 
    window.addEventListener('create-scan-object', (event) => {
      if (event.detail) {
        console.log('Received create-scan-object event with data:', event.detail);
        createScanObject(event.detail);
      }
    });
    
    // Listen for takeoff location set from other components
    window.addEventListener('takeoff-location-set', (event) => {
      if (event.detail && event.detail.position) {
        console.log('Received takeoff-location-set event with data:', event.detail);
        
        // Create visual marker if it doesn't exist yet
        if (!takeoffMarkerObj) {
          const position = event.detail.position;
          createTakeoffMarker({
            x: position.x,
            y: 0, // Ground level
            z: position.z
          });
        }
      }
    });
    
    // Listen for takeoff selection mode
    window.addEventListener('enter-takeoff-selection', () => {
      console.log('Entering takeoff selection mode');
      selectionMode.value = 'takeoff';
      
      // Change cursor to indicate selection mode
      if (sceneContainer.value) {
        sceneContainer.value.style.cursor = 'crosshair';
      }
      
      // Enable hover indicator for takeoff selection
      document.body.classList.add('takeoff-selection-mode');
      
      // Add mousemove listener for hovering indicator
      if (rendererObj && rendererObj.domElement) {
        rendererObj.domElement.addEventListener('mousemove', showTakeoffHoverIndicator);
      }
      
      // Show instructions
      showNotification({
        message: 'Click on the map to set takeoff location',
        color: 'info',
        timeout: 5000
      });
    });
    
    // Also listen for the alternative event name used in MissionSimulation.vue
    window.addEventListener('enter-takeoff-selection-mode', () => {
      console.log('Entering takeoff selection mode (from alt event)');
      selectionMode.value = 'takeoff';
      
      // Change cursor to indicate selection mode
      if (sceneContainer.value) {
        sceneContainer.value.style.cursor = 'crosshair';
      }
      
      // Enable hover indicator for takeoff selection
      document.body.classList.add('takeoff-selection-mode');
      
      // Add mousemove listener for hovering indicator
      if (rendererObj && rendererObj.domElement) {
        rendererObj.domElement.addEventListener('mousemove', showTakeoffHoverIndicator);
      }
      
      // Show instructions
      showNotification({
        message: 'Click on the map to set takeoff location',
        color: 'info',
        timeout: 5000
      });
    });
    
    // Remove hover indicator when exiting takeoff selection mode
    window.addEventListener('exit-takeoff-selection', () => {
      console.log('Exiting takeoff selection mode');
      selectionMode.value = 'none';
      
      // Change cursor back to default
      if (sceneContainer.value) {
        sceneContainer.value.style.cursor = 'default';
      }
      
      // Disable hover indicator
      document.body.classList.remove('takeoff-selection-mode');
      
      // Remove hover indicator
      removeTakeoffHoverIndicator();
      
      // Remove mousemove listener
      if (rendererObj && rendererObj.domElement) {
        rendererObj.domElement.removeEventListener('mousemove', showTakeoffHoverIndicator);
      }
    });
  })
})

onBeforeUnmount(() => {
  // Remove event listeners to prevent memory leaks
  if (rendererObj) {
    rendererObj.domElement.removeEventListener('dblclick', handleDoubleClick);
    rendererObj.domElement.removeEventListener('click', handleGroundClick);
  }
  
  // Remove window resize handler
  window.removeEventListener('resize', onResize);
  
  // Remove takeoff selection mode listeners
  window.removeEventListener('enter-takeoff-selection', () => {});
  window.removeEventListener('exit-takeoff-selection', () => {});
  window.removeEventListener('enter-takeoff-selection-mode', () => {});
  
  // Remove takeoff indicator if it exists
  const indicator = document.querySelector('.takeoff-selection-indicator');
  if (indicator) {
    indicator.remove();
  }
  
  // Remove orbit target selection mode listener
  window.removeEventListener('enter-orbit-target-selection', () => {});
  
  // Remove scan object creation listener
  window.removeEventListener('create-scan-object', () => {});
  
  // Remove dragging event listeners
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('keydown', handleKeyDown);
  
  // Stop animation loop
  cancelAnimationFrame(animationId);
  
  // Dispose of renderer
  if (rendererObj) {
    rendererObj.dispose();
  }
  
  // Clear the container
  if (sceneContainer.value) {
    sceneContainer.value.innerHTML = '';
  }
});

// Variables for hover indicator
let hoverIndicatorObj = null;

// Show hover indicator for takeoff location
const showTakeoffHoverIndicator = (event) => {
  // Only show if in takeoff selection mode
  if (selectionMode.value !== 'takeoff') return;
  
  // Get intersection with ground
  const intersection = getIntersection(event);
  if (!intersection) return;
  
  // Create or update hover indicator
  if (!hoverIndicatorObj) {
    // Create a simple indicator that shows where takeoff will be placed
    const hoverGroup = new THREE.Group();
    
    // Create base pad (flat cylinder) with transparency
    const baseGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.05, 32);
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: 0x33cc33, // Green
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = 0.025; // Just above ground
    hoverGroup.add(baseMesh);
    
    // Add a simple H in the center
    const markerGeometry = new THREE.RingGeometry(0.8, 1.2, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
    markerMesh.rotation.x = -Math.PI / 2; // Lay flat
    markerMesh.position.y = 0.06; // Above the base
    hoverGroup.add(markerMesh);
    
    // Add to scene
    hoverIndicatorObj = hoverGroup;
    sceneObj.add(hoverIndicatorObj);
  }
  
  // Update position to follow mouse
  hoverIndicatorObj.position.set(
    intersection.point.x,
    0,
    intersection.point.z
  );
  
  // Make visible
  hoverIndicatorObj.visible = true;
};

// Remove takeoff hover indicator
const removeTakeoffHoverIndicator = () => {
  if (hoverIndicatorObj) {
    sceneObj.remove(hoverIndicatorObj);
    hoverIndicatorObj = null;
  }
};

// Create a compass to show orientation
const createCompass = () => {
  if (!sceneObj) return;
  
  // Create a group for compass components
  const compassGroup = new THREE.Group();
  
  // Create arrows for each direction
  const arrowLength = 8;
  const arrowThickness = 0.3;
  
  // North arrow (blue)
  const northGeometry = new THREE.CylinderGeometry(arrowThickness, arrowThickness, arrowLength, 8);
  const northMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Blue
  const northArrow = new THREE.Mesh(northGeometry, northMaterial);
  northArrow.position.set(0, 0.1, -arrowLength/2);
  northArrow.rotation.x = Math.PI / 2;
  compassGroup.add(northArrow);
  
  // North arrow tip
  const northTipGeometry = new THREE.ConeGeometry(0.6, 1.5, 8);
  const northTip = new THREE.Mesh(northTipGeometry, northMaterial);
  northTip.position.set(0, 0.1, -arrowLength);
  northTip.rotation.x = Math.PI / 2;
  compassGroup.add(northTip);
  
  // North label
  const northCanvas = document.createElement('canvas');
  const northCtx = northCanvas.getContext('2d');
  northCanvas.width = 64;
  northCanvas.height = 64;
  northCtx.fillStyle = 'blue';
  northCtx.font = 'bold 48px Arial';
  northCtx.textAlign = 'center';
  northCtx.textBaseline = 'middle';
  northCtx.fillText('N', 32, 32);
  
  const northTexture = new THREE.CanvasTexture(northCanvas);
  const northLabelMaterial = new THREE.SpriteMaterial({ map: northTexture });
  const northLabel = new THREE.Sprite(northLabelMaterial);
  northLabel.position.set(0, 0.5, -arrowLength - 3);
  northLabel.scale.set(3, 3, 1);
  compassGroup.add(northLabel);
  
  // Position the compass in the bottom-right corner of the scene
  compassGroup.position.set(50, 5, 50);
  
  // Add to scene
  sceneObj.add(compassGroup);
};

</script>

<style scoped>
.main-scene-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scene-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1; /* Lower z-index so panels can appear above it */
  pointer-events: auto; /* Allow mouse events on the scene by default */
}

/* When in takeoff selection or dragging a UI panel, make scene ignore pointer events */
body.takeoff-selection-mode .scene-container,
body.panel-dragging .scene-container {
  pointer-events: auto !important; /* Make sure scene receives events during takeoff selection */
}

/* When in panel drag mode, make scene only receive click events, not drag */
body.panel-dragging .scene-container {
  pointer-events: none; /* Prevent scene from capturing events when dragging panels */
}

.hardware-info {
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 5px;
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  z-index: 100;
  min-width: 200px;
}

.info-item {
  margin-bottom: 5px;
}

.label {
  font-weight: bold;
  color: #3d85c6;
  margin-right: 5px;
}

.value {
  color: #ffffff;
}

.control-button {
  position: absolute;
  bottom: 30px;
  right: 30px;
  z-index: 100;
}

.fab-button {
  background-color: rgba(0, 0, 0, 0.7) !important;
}

/* Takeoff selection mode styles */
:global(.takeoff-selection-indicator) {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(33, 150, 243, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  z-index: 10000;
  pointer-events: none;
  display: none;
}

:global(body.takeoff-selection-mode .takeoff-selection-indicator) {
  display: block;
}

:global(body.takeoff-selection-mode) {
  cursor: crosshair !important;
}

:global(body.takeoff-selection-mode *) {
  cursor: crosshair !important;
}
</style> 
