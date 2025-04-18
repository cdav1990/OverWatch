import { Vector3 } from '@babylonjs/core';

/**
 * Represents coordinates in a local East-North-Up (ENU) frame.
 * Origin (0,0,0) is typically the mission's takeoff point.
 */
export interface LocalENUCoordinate {
    x: number; // East
    y: number; // North
    z: number; // Up
}

/**
 * Converts Local ENU coordinates (X=East, Y=North, Z=Up)
 * to Babylon.js scene coordinates (X=East, Y=Up, Z=-North).
 * @param localCoord The coordinate in the local ENU frame.
 * @returns A Babylon.js Vector3 representing the position in the scene.
 */
export function localENUToBabylon(localCoord: LocalENUCoordinate): Vector3 {
    // ENU X (East) maps to Babylon X (East)
    // ENU Y (North) maps to Babylon -Z (South)
    // ENU Z (Up) maps to Babylon Y (Up)
    return new Vector3(
        localCoord.x,
        localCoord.z,
        -localCoord.y
    );
}

/**
 * Converts Babylon.js scene coordinates (X=East, Y=Up, Z=-North/South)
 * back to Local ENU coordinates (X=East, Y=North, Z=Up).
 * @param babylonVector The coordinate in the Babylon.js scene.
 * @returns A LocalENUCoordinate object.
 */
export function babylonToLocalENU(babylonVector: Vector3): LocalENUCoordinate {
    // Babylon X (East) maps to ENU X (East)
    // Babylon Y (Up) maps to ENU Z (Up)
    // Babylon Z (South/-North) maps to ENU Y (North)
    return {
        x: babylonVector.x,
        y: -babylonVector.z, // Note the negation
        z: babylonVector.y
    };
}

// Add other necessary coordinate transformations here as needed
// (e.g., WGS84 to Local ENU, potentially using a geodesy library) 