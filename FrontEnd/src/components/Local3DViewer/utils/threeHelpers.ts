import * as THREE from 'three';
import { LocalCoord } from '../../../types/mission';

/**
 * Converts a LocalCoord (ENU) to Three.js coordinates
 * @param coord LocalCoord in East-North-Up format
 * @returns THREE.Vector3 in Three.js coordinates (x=East, y=Up, z=-North)
 */
export const localCoordToThree = (coord: LocalCoord): THREE.Vector3 => {
  return new THREE.Vector3(coord.x, coord.z, -coord.y);
};

/**
 * Converts Three.js coordinates to LocalCoord (ENU)
 * @param vector THREE.Vector3 in Three.js coordinates (x=East, y=Up, z=-North)
 * @returns LocalCoord in East-North-Up format
 */
export const threeToLocalCoord = (vector: THREE.Vector3): LocalCoord => {
  return {
    x: vector.x,
    y: -vector.z,
    z: vector.y
  };
};

/**
 * Converts an array of LocalCoord points to Three.js Vector3 points
 * @param points Array of LocalCoord points
 * @returns Array of THREE.Vector3 points
 */
export const mapLocalCoordsToThree = (points: LocalCoord[]): THREE.Vector3[] => {
  return points.map(localCoordToThree);
};

/**
 * Validates numeric values to ensure they're not NaN or Infinity
 * @param value Number to validate
 * @param defaultValue Default value to return if invalid
 * @returns Valid number or default value
 */
export const validateNumber = (value: number, defaultValue: number = 0): number => {
  return (isNaN(value) || !isFinite(value)) ? defaultValue : value;
};

/**
 * Creates a face normal from three vertices
 * @param a First vertex
 * @param b Second vertex
 * @param c Third vertex
 * @returns Normal vector (normalized)
 */
export const calculateFaceNormal = (
  a: THREE.Vector3, 
  b: THREE.Vector3, 
  c: THREE.Vector3
): THREE.Vector3 => {
  const normal = new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(b, a),
    new THREE.Vector3().subVectors(c, a)
  ).normalize();
  
  return normal;
};

/**
 * Creates a rotation to align with a normal vector
 * @param normal Normal vector to align with
 * @returns Euler rotation angles
 */
export const normalToRotation = (normal: THREE.Vector3): THREE.Euler => {
  const quaternion = new THREE.Quaternion();
  const defaultUp = new THREE.Vector3(0, 0, 1); // Z-up
  quaternion.setFromUnitVectors(defaultUp, normal);
  return new THREE.Euler().setFromQuaternion(quaternion);
};

/**
 * Finds the nearest point on a plane
 * @param point Point to project
 * @param planeNormal Plane normal vector
 * @param planePoint Point on the plane
 * @returns Nearest point on the plane
 */
export const projectPointOnPlane = (
  point: THREE.Vector3,
  planeNormal: THREE.Vector3,
  planePoint: THREE.Vector3
): THREE.Vector3 => {
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
  const projectedPoint = new THREE.Vector3();
  return plane.projectPoint(point, projectedPoint);
};

/**
 * Creates a safe geometry that includes error handling
 * @param createGeometryFn Function that creates a THREEGeometry
 * @param fallbackGeometry Fallback geometry to use if creation fails
 * @returns A valid THREE.BufferGeometry
 */
export const createSafeGeometry = (
  createGeometryFn: () => THREE.BufferGeometry,
  fallbackGeometry: THREE.BufferGeometry = new THREE.BoxGeometry(1, 1, 1)
): THREE.BufferGeometry => {
  try {
    return createGeometryFn();
  } catch (error) {
    console.error('Error creating geometry:', error);
    return fallbackGeometry;
  }
}; 