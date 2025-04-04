import * as THREE from 'three'

export class DroneModel {
  constructor() {
    this.group = new THREE.Group()
    this.createDroneBody()
    this.createPropellers()
    this.createLights()
  }

  createDroneBody() {
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.4)
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    this.group.add(body)

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.05)
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 })
    
    // Front-back arm
    const armFB = new THREE.Mesh(armGeometry, armMaterial)
    this.group.add(armFB)
    
    // Left-right arm
    const armLR = new THREE.Mesh(armGeometry, armMaterial)
    armLR.rotation.y = Math.PI / 2
    this.group.add(armLR)
  }

  createPropellers() {
    const propellerGeometry = new THREE.BoxGeometry(0.1, 0.01, 0.6)
    const propellerMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 })
    
    // Create 4 propellers
    const positions = [
      { x: 0.4, z: 0.4 },
      { x: -0.4, z: 0.4 },
      { x: 0.4, z: -0.4 },
      { x: -0.4, z: -0.4 }
    ]

    this.propellers = positions.map(pos => {
      const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial)
      propeller.position.set(pos.x, 0.1, pos.z)
      this.group.add(propeller)
      return propeller
    })
  }

  createLights() {
    // Status LED
    const ledGeometry = new THREE.SphereGeometry(0.02, 8, 8)
    const ledMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const led = new THREE.Mesh(ledGeometry, ledMaterial)
    led.position.y = 0.06
    this.group.add(led)
  }

  update(deltaTime) {
    // Rotate propellers
    this.propellers.forEach((propeller, index) => {
      const direction = index % 2 === 0 ? 1 : -1
      propeller.rotation.y += direction * deltaTime * 10
    })
  }

  setPosition(position) {
    this.group.position.copy(position)
  }

  getObject() {
    return this.group
  }
} 