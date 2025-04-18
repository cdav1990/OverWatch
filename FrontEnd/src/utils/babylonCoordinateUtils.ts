import { LocalCoord } from '../types/mission';
import { Vector3 } from '@babylonjs/core';

/**
 * Convert local ENU coordinates to Babylon.js coordinates
 * 
 * In Local ENU: X=East, Y=North, Z=Up
 * In Babylon.js: X=East, Y=Up, Z=North
 * 
 * @param enuCoords Local ENU coordinates {x: East, y: North, z: Up}
 * @returns Babylon.js Vector3 {x: East, y: Up, z: North}
 */
export function localENUToBabylon(enuCoords: LocalCoord): Vector3 {
  return new Vector3(
    enuCoords.x,  // East in both systems (X)
    enuCoords.z,  // Up in ENU (z) becomes Y in Babylon
    enuCoords.y   // North in ENU (y) becomes Z in Babylon
  );
}

/**
 * Convert Babylon.js coordinates to local ENU coordinates
 * 
 * In Babylon.js: X=East, Y=Up, Z=North
 * In Local ENU: X=East, Y=North, Z=Up
 * 
 * @param babylonCoords Babylon.js Vector3 {x: East, y: Up, z: North}
 * @returns Local ENU coordinates {x: East, y: North, z: Up}
 */
export function babylonToLocalENU(babylonCoords: Vector3): LocalCoord {
  return {
    x: babylonCoords.x,  // East in both systems (X)
    y: babylonCoords.z,  // North in Babylon (Z) becomes y in ENU
    z: babylonCoords.y   // Up in Babylon (Y) becomes z in ENU
  };
}

/**
 * Creates a quaternion for proper rotation in Babylon from heading/pitch/roll in degrees
 * 
 * @param heading Heading in degrees (0-360, 0=North, increases clockwise)
 * @param pitch Pitch in degrees (+90 = pointing up, -90 = pointing down)
 * @param roll Roll in degrees (0 = level, positive = right wing down)
 * @returns Euler angles object for Babylon rotation
 */
export function droneRotationToBabylon(heading: number, pitch: number, roll: number) {
  // Convert from degrees to radians
  const headingRad = (heading * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  const rollRad = (roll * Math.PI) / 180;
  
  // Heading in ENU needs special conversion for Babylon
  // In ENU, heading of 0 is North (+Y), increasing clockwise
  // In Babylon, we need to rotate around Y axis where 0 is -Z
  
  // Convert heading from ENU (0=North, CW) to Babylon (0=-Z, CW around Y axis)
  const babylonHeading = headingRad - Math.PI / 2;
  
  return {
    x: pitchRad,     // Pitch rotates around X axis
    y: babylonHeading, // Adjusted heading rotates around Y axis
    z: rollRad       // Roll rotates around Z axis
  };
} 