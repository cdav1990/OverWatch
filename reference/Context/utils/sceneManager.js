import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { DroneModel } from '../models/DroneModel'
import * as GeoUtils from './geoUtils'

let scene, camera, renderer, controls, drone, ground
let clock = new THREE.Clock()
let raycaster = new THREE.Raycaster()
let mouse = new THREE.Vector2()
let takeoffMarker = null
let arrowGroup = null
let originCoordinates = { lat: 0, lng: 0, alt: 0 } // Global origin coordinates

// ENU (East-North-Up) scene orientation
// In Three.js: X = East, Y = Up, Z = North
// Note: Three.js typically uses Y-up, so we need to transform accordingly
// For drones, we follow the ENU (East-North-Up) convention which is standard for navigation systems

export function initScene(canvas) {
  // Create scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  // Create camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 50, 50)
  camera.lookAt(0, 0, 0)

  // Create renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  })
  renderer.setSize(window.innerWidth, window.innerHeight)

  // Add controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // Add grid
  const gridHelper = new THREE.GridHelper(100, 100, 0xcccccc, 0xeeeeee)
  scene.add(gridHelper)

  // Add ground plane for raycasting
  const groundGeometry = new THREE.PlaneGeometry(100, 100)
  const groundMaterial = new THREE.MeshBasicMaterial({ 
    visible: false,
    side: THREE.DoubleSide
  })
  ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.name = 'ground'
  scene.add(ground)

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 20, 10)
  scene.add(directionalLight)

  // Add drone model
  drone = new DroneModel()
  scene.add(drone.getObject())

  // Add event listeners
  window.addEventListener('resize', onWindowResize)
  renderer.domElement.addEventListener('click', onGroundClick)

  // Start animation loop
  animate()
}

function animate() {
  requestAnimationFrame(animate)
  const deltaTime = clock.getDelta()
  const elapsedTime = clock.getElapsedTime()

  // Make the arrow flash/pulse
  if (arrowGroup) {
    // Oscillate opacity between 0.4 and 1 for flashing effect
    const opacity = 0.4 + (Math.sin(elapsedTime * 3) * 0.3 + 0.3)
    arrowGroup.children.forEach(child => {
      if (child.material) {
        child.material.opacity = opacity
      }
    })
    
    // Slight floating animation
    arrowGroup.position.y = 0.2 * Math.sin(elapsedTime * 2)
  }

  if (drone) {
    drone.update(deltaTime)
  }

  controls.update()
  renderer.render(scene, camera)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function onGroundClick(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera({ x, y }, camera)

  const intersects = raycaster.intersectObject(ground)
  if (intersects.length > 0) {
    const point = intersects[0].point
    
    // In our Three.js scene, X is East, Z is North, Y is Up
    // We need to pass the correct coordinates to the event
    const customEvent = new CustomEvent('ground-click', {
      detail: {
        position: {
          x: point.x, // East
          y: point.y, // Up 
          z: point.z  // North
        }
      }
    })
    window.dispatchEvent(customEvent)
  }
}

export function updateScene(waypoints = [], takeoffLocation = null) {
  // Clear existing takeoff marker
  if (takeoffMarker) {
    scene.remove(takeoffMarker)
    takeoffMarker = null
  }

  // Add takeoff location marker if exists
  if (takeoffLocation) {
    takeoffMarker = new THREE.Group()
    
    // Base cylinder
    const cylinderGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 32)
    const cylinderMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
    cylinder.position.y = 0.15
    takeoffMarker.add(cylinder)
    
    // Create arrow
    arrowGroup = new THREE.Group()
    
    const arrowBodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2, 12)
    const arrowHeadGeometry = new THREE.ConeGeometry(0.3, 0.6, 12)
    const arrowMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8
    })
    
    const arrowBody = new THREE.Mesh(arrowBodyGeometry, arrowMaterial)
    arrowBody.position.y = 1.0
    
    const arrowHead = new THREE.Mesh(arrowHeadGeometry, arrowMaterial)
    arrowHead.position.y = 2.3
    
    arrowGroup.add(arrowBody)
    arrowGroup.add(arrowHead)
    takeoffMarker.add(arrowGroup)
    
    // Alternative to TextGeometry: add a "H" using a simple shape
    // Add a small horizontal bar (the middle dash of H)
    const hBarGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.1)
    const hBarMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff })
    const hBar = new THREE.Mesh(hBarGeometry, hBarMaterial)
    hBar.position.set(0, 0.3, 0)
    
    // Add two vertical bars (the sides of H)
    const vBar1Geometry = new THREE.BoxGeometry(0.1, 0.6, 0.1)
    const vBar1 = new THREE.Mesh(vBar1Geometry, hBarMaterial)
    vBar1.position.set(-0.2, 0.3, 0)
    
    const vBar2Geometry = new THREE.BoxGeometry(0.1, 0.6, 0.1)
    const vBar2 = new THREE.Mesh(vBar2Geometry, hBarMaterial)
    vBar2.position.set(0.2, 0.3, 0)
    
    // Add all parts to a group for the "H"
    const letterH = new THREE.Group()
    letterH.add(hBar)
    letterH.add(vBar1)
    letterH.add(vBar2)
    letterH.position.y = 0.1
    takeoffMarker.add(letterH)
    
    // Compute global coordinates using precise geodeticToLocal conversion
    // In our ENU system: takeoffLocation.lat = East, takeoffLocation.lng = North
    const enuCoords = {
      east: takeoffLocation.lat,
      north: takeoffLocation.lng,
      up: 0
    };
    
    // Calculate geodetic coordinates from local ENU
    const globalCoords = GeoUtils.localToGeodetic(
      enuCoords.east, 
      enuCoords.north, 
      enuCoords.up,
      originCoordinates.lat,
      originCoordinates.lng,
      originCoordinates.alt
    );

    // Store the coordinates for future reference
    takeoffMarker.userData = {
      isTakeoff: true,
      enuCoords,
      globalCoords,
      formattedCoords: GeoUtils.formatCoordinates(globalCoords.lat, globalCoords.lon, 'dms')
    };

    // Log coordinate information for debugging
    console.log(`Takeoff Point Set:
- ENU: E:${enuCoords.east.toFixed(2)}m, N:${enuCoords.north.toFixed(2)}m, U:${enuCoords.up.toFixed(2)}m
- Geodetic: ${globalCoords.lat.toFixed(6)}°, ${globalCoords.lon.toFixed(6)}°, ${globalCoords.height.toFixed(1)}m
- Formatted: ${takeoffMarker.userData.formattedCoords.lat}, ${takeoffMarker.userData.formattedCoords.lon}`);
    
    // Position the takeoff marker (Three.js uses x = East, z = North, y = Up)
    takeoffMarker.position.set(takeoffLocation.lat, 0, takeoffLocation.lng)
    scene.add(takeoffMarker)
  }

  // Clear existing waypoint markers
  scene.children = scene.children.filter(
    child => !(child.userData && child.userData.isWaypoint)
  )

  // Add waypoint markers with improved visualization
  waypoints.forEach((waypoint, index) => {
    // Create waypoint marker group
    const waypointGroup = new THREE.Group()
    waypointGroup.userData = { isWaypoint: true, index }

    // ENU coordinates
    const enuCoords = {
      east: waypoint.position.lat,
      north: waypoint.position.lng,
      up: waypoint.height || 0
    };
    
    // Calculate geodetic coordinates
    const globalCoords = GeoUtils.localToGeodetic(
      enuCoords.east, 
      enuCoords.north, 
      enuCoords.up,
      originCoordinates.lat,
      originCoordinates.lng,
      originCoordinates.alt
    );
    
    // Store in waypoint userData
    waypointGroup.userData = {
      ...waypointGroup.userData,
      enuCoords,
      globalCoords,
      formattedCoords: GeoUtils.formatCoordinates(globalCoords.lat, globalCoords.lon, 'dms')
    };

    // Waypoint sphere
    const sphereGeometry = new THREE.SphereGeometry(0.15, 32, 32)
    const sphereMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4285f4,
      transparent: true,
      opacity: 0.8
    })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    
    // Height indicator line
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, waypoint.height || 0, 0)
    ])
    const lineMaterial = new THREE.LineDashedMaterial({ 
      color: 0x90a4ae,
      dashSize: 0.2,
      gapSize: 0.1
    })
    const line = new THREE.Line(lineGeometry, lineMaterial)
    line.computeLineDistances()

    // Add to group and position (Three.js: x = East, z = North, y = Up)
    waypointGroup.add(sphere)
    waypointGroup.add(line)
    waypointGroup.position.set(
      waypoint.position.lat,  // East
      0,                      // Ground level
      waypoint.position.lng   // North
    )
    sphere.position.y = waypoint.height || 0  // Up
    
    scene.add(waypointGroup)
  })

  // Add flight path
  if (waypoints.length > 1) {
    const points = waypoints.map(wp => 
      new THREE.Vector3(
        wp.position.lat,   // East
        wp.height || 0,    // Up
        wp.position.lng    // North
      )
    )
    
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(points)
    const pathMaterial = new THREE.LineBasicMaterial({ 
      color: 0x4285f4,
      linewidth: 1,
      transparent: true,
      opacity: 0.6
    })
    const path = new THREE.Line(pathGeometry, pathMaterial)
    path.userData = { isWaypoint: true }
    
    scene.add(path)

    // Update drone position to first waypoint if it exists
    if (drone && waypoints[0]) {
      drone.setPosition(new THREE.Vector3(
        waypoints[0].position.lat,
        waypoints[0].height || 0,
        waypoints[0].position.lng
      ))
    }
  }
}

export function cleanup() {
  window.removeEventListener('resize', onWindowResize)
  renderer.domElement.removeEventListener('click', onGroundClick)
  renderer.dispose()
}

// Set the origin coordinates and update all related conversions
export function setOriginCoordinates(lat, lng, alt) {
  originCoordinates = { lat, lng, alt }
  console.log(`Origin coordinates set to: ${lat}, ${lng}, ${alt}`)
}

/**
 * Gets the current Three.js scene object
 * @returns {THREE.Scene} The current scene
 */
export function getScene() {
  return scene
}

// Convert local scene coordinates to geodetic coordinates
export function localToGlobal(localCoords) {
  return GeoUtils.localToGeodetic(
    localCoords.x,    // East
    localCoords.z,    // North
    localCoords.y,    // Up
    originCoordinates.lat,
    originCoordinates.lng,
    originCoordinates.alt
  );
}

// Convert geodetic coordinates to local scene coordinates
export function globalToLocal(globalCoords) {
  const enuCoords = GeoUtils.geodeticToLocal(
    globalCoords.lat,
    globalCoords.lng,
    globalCoords.alt || 0,
    originCoordinates.lat,
    originCoordinates.lng,
    originCoordinates.alt
  );
  
  return {
    x: enuCoords.east,    // East
    y: enuCoords.up,      // Up
    z: enuCoords.north    // North
  };
} 