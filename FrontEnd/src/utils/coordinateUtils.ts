import { LatLng, LocalCoord } from '../types/mission';
import * as Cesium from 'cesium';

/**
 * Utility functions for coordinate transformations between geographic (lat/lng) and local 3D coordinates
 */

// Earth radius in meters
const EARTH_RADIUS = 6378137.0;

/**
 * Convert lat/lng to local ENU coordinates
 * @param latLng Geographic coordinates to convert
 * @param origin Origin point for the local coordinate system
 * @param altitude Altitude in meters (optional, defaults to 0)
 * @returns Local coordinates in meters
 */
export function latLngToLocal(latLng: LatLng, origin: LatLng, altitude: number = 0): LocalCoord {
  // Convert to Cesium Cartographic
  const cartOrigin = Cesium.Cartographic.fromDegrees(origin.longitude, origin.latitude, 0);
  const cartPoint = Cesium.Cartographic.fromDegrees(latLng.longitude, latLng.latitude, altitude);
  
  // Convert to ECEF coordinates
  const cartesianOrigin = Cesium.Cartographic.toCartesian(cartOrigin);
  const cartesianPoint = Cesium.Cartographic.toCartesian(cartPoint);
  
  // Create transform from ECEF to local ENU at the origin
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(cartesianOrigin);
  const inverseTransform = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());
  
  // Transform the point to local ENU
  const localPoint = Cesium.Matrix4.multiplyByPoint(
    inverseTransform,
    cartesianPoint,
    new Cesium.Cartesian3()
  );
  
  // Return as LocalCoord
  return {
    x: localPoint.x,
    y: localPoint.y,
    z: localPoint.z
  };
}

/**
 * Convert local ENU coordinates to lat/lng
 * @param local Local coordinates in meters
 * @param origin Origin point for the local coordinate system
 * @returns Geographic coordinates
 */
export function localToLatLng(local: LocalCoord, origin: LatLng): LatLng & { altitude: number } {
  // Convert origin to ECEF coordinates
  const cartOrigin = Cesium.Cartographic.fromDegrees(origin.longitude, origin.latitude, 0);
  const cartesianOrigin = Cesium.Cartographic.toCartesian(cartOrigin);
  
  // Create transform from local ENU to ECEF
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(cartesianOrigin);
  
  // Create local ENU point
  const localPoint = new Cesium.Cartesian3(local.x, local.y, local.z);
  
  // Transform local to ECEF
  const cartesianPoint = Cesium.Matrix4.multiplyByPoint(
    transform,
    localPoint,
    new Cesium.Cartesian3()
  );
  
  // Convert ECEF to Cartographic
  const cartPoint = Cesium.Cartographic.fromCartesian(cartesianPoint);
  
  // Return as LatLng with altitude
  return {
    latitude: Cesium.Math.toDegrees(cartPoint.latitude),
    longitude: Cesium.Math.toDegrees(cartPoint.longitude),
    altitude: cartPoint.height
  };
}

/**
 * Calculate the distance between two points in local coordinates
 * @param a First point
 * @param b Second point
 * @returns Distance in meters
 */
export function localDistance(a: LocalCoord, b: LocalCoord): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate the distance between two points in geographic coordinates
 * Using the Haversine formula
 * @param a First point
 * @param b Second point
 * @returns Distance in meters
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const lat1Rad = Cesium.Math.toRadians(a.latitude);
  const lat2Rad = Cesium.Math.toRadians(b.latitude);
  const lng1Rad = Cesium.Math.toRadians(a.longitude);
  const lng2Rad = Cesium.Math.toRadians(b.longitude);
  
  const dLat = lat2Rad - lat1Rad;
  const dLng = lng2Rad - lng1Rad;
  
  const a1 = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
           Math.cos(lat1Rad) * Math.cos(lat2Rad) *
           Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1));
  
  return EARTH_RADIUS * c;
}

/**
 * Convert a rectangle (bounding box) from Cesium to our format
 * @param rectangle Cesium Rectangle
 * @returns Region bounds
 */
export function cesiumRectangleToRegionBounds(rectangle: Cesium.Rectangle): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  return {
    north: Cesium.Math.toDegrees(rectangle.north),
    south: Cesium.Math.toDegrees(rectangle.south),
    east: Cesium.Math.toDegrees(rectangle.east),
    west: Cesium.Math.toDegrees(rectangle.west)
  };
}

/**
 * Get the center point of a region
 * @param bounds Region bounds
 * @returns Center point
 */
export function getRegionCenter(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): LatLng {
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2
  };
}

/**
 * Generate a UUID
 * @returns UUID string
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
} 