import { Scene, Vector3, StandardMaterial, Mesh, Color3, VertexData } from '@babylonjs/core';

interface FrustumDimensions {
  nearWidth: number;
  nearHeight: number;
  farWidth: number;
  farHeight: number;
  nearDistance: number;
  farDistance: number;
}

/**
 * Calculates camera frustum dimensions based on sensor size, focal length, and distances
 * 
 * @param sensorWidth Physical sensor width in mm
 * @param sensorHeight Physical sensor height in mm
 * @param focalLength Focal length in mm
 * @param nearDistance Near clipping plane distance in meters
 * @param farDistance Far clipping plane distance in meters
 * @returns Dimensions of the frustum at near and far planes
 */
export function calculateFrustumDimensions(
  sensorWidth: number,
  sensorHeight: number,
  focalLength: number,
  nearDistance: number,
  farDistance: number
): FrustumDimensions {
  // Convert focal length from mm to meters for consistent units
  const focalLengthMeters = focalLength / 1000;

  // Calculate field of view angles
  // FOV = 2 * atan(sensorSize / (2 * focalLength))
  const horizontalFOV = 2 * Math.atan(sensorWidth / (2000 * focalLengthMeters));
  const verticalFOV = 2 * Math.atan(sensorHeight / (2000 * focalLengthMeters));

  // Calculate frustum dimensions at near distance
  const nearWidth = 2 * nearDistance * Math.tan(horizontalFOV / 2);
  const nearHeight = 2 * nearDistance * Math.tan(verticalFOV / 2);

  // Calculate frustum dimensions at far distance
  const farWidth = 2 * farDistance * Math.tan(horizontalFOV / 2);
  const farHeight = 2 * farDistance * Math.tan(verticalFOV / 2);

  return {
    nearWidth,
    nearHeight,
    farWidth,
    farHeight,
    nearDistance,
    farDistance
  };
}

/**
 * Creates a camera frustum mesh in the Babylon.js scene
 * 
 * @param scene Babylon.js scene
 * @param frustumDimensions Dimensions of the frustum
 * @param name Name for the created mesh
 * @param opacity Opacity of the frustum (0-1)
 * @returns The created frustum mesh
 */
export function createFrustumMesh(
  scene: Scene,
  frustumDimensions: FrustumDimensions,
  name: string = 'cameraFrustum',
  opacity: number = 0.3
): Mesh {
  const {
    nearWidth,
    nearHeight,
    farWidth,
    farHeight,
    nearDistance,
    farDistance
  } = frustumDimensions;

  // Calculate coordinates of the 8 vertices of the frustum
  // Near plane
  const nearTopLeft = new Vector3(-nearWidth / 2, nearHeight / 2, nearDistance);
  const nearTopRight = new Vector3(nearWidth / 2, nearHeight / 2, nearDistance);
  const nearBottomLeft = new Vector3(-nearWidth / 2, -nearHeight / 2, nearDistance);
  const nearBottomRight = new Vector3(nearWidth / 2, -nearHeight / 2, nearDistance);

  // Far plane
  const farTopLeft = new Vector3(-farWidth / 2, farHeight / 2, farDistance);
  const farTopRight = new Vector3(farWidth / 2, farHeight / 2, farDistance);
  const farBottomLeft = new Vector3(-farWidth / 2, -farHeight / 2, farDistance);
  const farBottomRight = new Vector3(farWidth / 2, -farHeight / 2, farDistance);

  // Create an array of vertices
  const vertices = [
    // Origin (camera position)
    new Vector3(0, 0, 0),
    
    // Near plane vertices
    nearTopLeft, nearTopRight, nearBottomLeft, nearBottomRight,
    
    // Far plane vertices
    farTopLeft, farTopRight, farBottomLeft, farBottomRight
  ];

  // Create an array of faces (triangles)
  // Each face is defined by 3 vertex indices
  const indices = [
    // Near plane
    1, 3, 2, 1, 4, 3,
    
    // Far plane
    5, 6, 7, 6, 8, 7,
    
    // Connect near and far (sides)
    1, 2, 6, 1, 6, 5,    // Top
    3, 7, 4, 4, 7, 8,    // Bottom
    1, 5, 3, 3, 5, 7,    // Left
    2, 4, 6, 4, 8, 6,    // Right
    
    // Connect origin to near plane corners (optional, can be enabled for a full pyramid)
    // 0, 1, 2, 0, 2, 4, 0, 4, 3, 0, 3, 1
  ];

  // Create the custom mesh
  const frustumMesh = new Mesh(name, scene);
  
  // Create a vertex data object
  const vertexData = new VertexData();
  
  // Set the vertices and indices
  vertexData.positions = vertices.flatMap(v => [v.x, v.y, v.z]);
  vertexData.indices = indices.map(i => i - 1); // Adjust to 0-based indexing
  
  // Apply the vertex data to the mesh
  vertexData.applyToMesh(frustumMesh);

  // Create a material for the frustum
  const material = new StandardMaterial(`${name}Material`, scene);
  material.diffuseColor = new Color3(0.2, 0.6, 1); // Blue color
  material.alpha = opacity;
  material.backFaceCulling = false; // Show both sides of faces
  
  // Apply the material to the mesh
  frustumMesh.material = material;

  return frustumMesh;
} 