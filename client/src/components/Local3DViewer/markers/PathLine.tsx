import React, { useMemo } from 'react';
import { Line, Cylinder, Sphere } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { PathSegment, PathType, Waypoint } from '../../../types/mission';

interface PathLineProps {
  segment: PathSegment;
  selected: boolean;
  onClick: () => void;
}

// Path color settings for different types of path segments
const PATH_COLORS = {
  DEFAULT: '#3498db', // Blue
  SELECTED: '#f39c12', // Orange
  TAKEOFF: '#2ecc71', // Green
  LANDING: '#e74c3c', // Red
  EMERGENCY: '#e74c3c', // Red
  TRANSITION: '#9b59b6', // Purple
  HOVER: '#f1c40f', // Yellow
  LIDAR: '#16a085', // Teal for LiDAR missions
};

// Enhanced PathLine component with improved visualization
const PathLine: React.FC<PathLineProps> = ({ 
  segment, 
  selected, 
  onClick 
}) => {
  const { waypoints, type, groundProjections, metadata } = segment;

  if (waypoints.length < 2 || !waypoints[0].local) {
    return null; // Need at least 2 waypoints with local coords
  }
  
  // Check if this is a ground projection path by looking at the first waypoint
  const isGroundProjection = waypoints[0].displayOptions?.isGroundProjection === true;

  // Determine mission type
  const isLidarMission = metadata?.isLidarMission === true;
  const isPhotogrammetryPath = !isLidarMission && (
    type === PathType.GRID || 
    metadata?.isPhotogrammetry === true ||
    waypoints.some(wp => wp.actions?.some(a => a.type === 'TAKE_PHOTO'))
  );

  // Map waypoints to 3D positions (convert from ENU to Three.js coordinate system)
  const points = waypoints
    .filter(wp => wp.local)
    .map(wp => wp.local!)
    .map(local => new THREE.Vector3(local.x, local.z, -local.y));
  
  // For LiDAR missions, we only care about the corner waypoints
  const cornerPoints = useMemo(() => {
    if (!isLidarMission || points.length < 4) return points;
    
    // For a grid pattern, we only need the corners
    // This is a simple extraction that works for rectangular grids
    // For more complex patterns, a more sophisticated algorithm would be needed
    const xCoords = points.map(p => p.x);
    const zCoords = points.map(p => p.z);
    
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);
    
    // Find points that are at the corners (approximately)
    // We use a small epsilon to account for floating point errors
    const epsilon = 0.1;
    return points.filter(p => 
      (Math.abs(p.x - minX) < epsilon || Math.abs(p.x - maxX) < epsilon) &&
      (Math.abs(p.z - minZ) < epsilon || Math.abs(p.z - maxZ) < epsilon)
    );
  }, [points, isLidarMission]);
  
  // Generate path points - either straight lines or curved, or corner-to-corner for LiDAR
  const pathPoints = useMemo(() => {
    if (points.length < 2) return points;
    
    if (isLidarMission) {
      // For LiDAR missions, use corner-to-corner paths
      // If we don't have enough corners, fall back to all points
      return cornerPoints.length >= 4 ? cornerPoints : points;
    } else if (isPhotogrammetryPath) {
      // For photogrammetry paths, use straight lines for precision
      return points;
    } else {
      // For non-photogrammetry paths, use curves for aesthetics
      const curve = new THREE.CatmullRomCurve3(points, false, type === PathType.BEZIER ? 'catmullrom' : 'centripetal', 0.5);
      
      // Generate more points for smoother curve
      const numPoints = Math.max(points.length * 15, 50);
      return curve.getPoints(numPoints);
    }
  }, [points, cornerPoints, type, isPhotogrammetryPath, isLidarMission]);
  
  // Create path colors based on waypoint phases and altitude
  const { colors, lineWidth, opacity } = useMemo(() => {
    // Default values
    const baseColor = selected 
      ? PATH_COLORS.SELECTED 
      : isLidarMission 
        ? PATH_COLORS.LIDAR 
        : PATH_COLORS.DEFAULT;
        
    const defaultOpacity = selected ? 1.0 : 0.8;
    const defaultWidth = selected ? 3.0 : isLidarMission ? 2.5 : 2.0;
    
    // If segment has no waypoints with phases, use default colors
    const hasPhases = waypoints.some(wp => wp.displayOptions?.phase);
    
    if (!hasPhases) {
      // For LiDAR missions, always use the LiDAR color
      if (isLidarMission) {
        return { 
          colors: Array(pathPoints.length).fill(baseColor),
          lineWidth: defaultWidth,
          opacity: defaultOpacity
        };
      }
      
      // Create gradient based on altitude
      const minAltitude = Math.min(...waypoints.filter(wp => wp.local).map(wp => wp.local!.z));
      const maxAltitude = Math.max(...waypoints.filter(wp => wp.local).map(wp => wp.local!.z));
      const altRange = maxAltitude - minAltitude;
      
      if (altRange < 1) {
        // Single color for flat paths
        return { 
          colors: Array(pathPoints.length).fill(baseColor),
          lineWidth: defaultWidth,
          opacity: defaultOpacity
        };
      }
      
      // Generate color gradient based on altitude
      return {
        colors: pathPoints.map((pt, i) => {
          const normalizedAlt = (pt.y - minAltitude) / altRange;
          
          // Generate color: blue at low altitude to orange at high altitude
          if (selected) {
            // Selected: yellow to orange
            return new THREE.Color(1, Math.max(0.6, 1 - normalizedAlt * 0.4), normalizedAlt * 0.2);
          } else if (isLidarMission) {
            // LiDAR: teal to green
            return new THREE.Color(
              0.1, 
              0.6 + normalizedAlt * 0.2, 
              0.5 + normalizedAlt * 0.2
            );
          } else {
            // Normal: light blue to deep blue
            return new THREE.Color(
              0.2 + normalizedAlt * 0.1, 
              0.5 + normalizedAlt * 0.3, 
              0.8 + normalizedAlt * 0.2
            );
          }
        }),
        lineWidth: defaultWidth,
        opacity: defaultOpacity
      };
    } else {
      // Use phase-based coloring
      return {
        colors: pathPoints.map((pt, i) => {
          // LiDAR missions override with LiDAR color
          if (isLidarMission) return PATH_COLORS.LIDAR;
          
          // Find closest waypoint to determine phase
          const pointIndex = Math.floor(i * (waypoints.length - 1) / pathPoints.length);
          const phase = waypoints[pointIndex]?.displayOptions?.phase;
          
          if (phase === 'takeoff') return PATH_COLORS.TAKEOFF;
          if (phase === 'landing') return PATH_COLORS.LANDING;
          if (phase === 'emergency') return PATH_COLORS.EMERGENCY;
          if (phase === 'transition') return PATH_COLORS.TRANSITION;
          if (phase === 'hover') return PATH_COLORS.HOVER;
          
          return baseColor;
        }),
        lineWidth: defaultWidth,
        opacity: defaultOpacity
      };
    }
  }, [pathPoints, waypoints, selected, isLidarMission]);
  
  // Generate direction indicators
  const directionIndicators = useMemo(() => {
    // For LiDAR missions, we only place indicators at corners
    if (isLidarMission) {
      // Skip indicators for LiDAR missions or use only at corners
      const indicators = [];
      
      // Skip the last waypoint (no direction from it)
      for (let i = 0; i < cornerPoints.length - 1; i++) {
        const point = cornerPoints[i];
        const nextPoint = cornerPoints[i + 1];
        
        // Calculate direction
        const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
        
        // Create arrow (cylinder pointing in direction)
        indicators.push({
          position: point.clone(),
          direction: direction,
          color: typeof colors[i] === 'string' ? colors[i] : colors[Math.min(i, colors.length-1)].getHex(),
          length: 2.0, // Larger for LiDAR
          radius: 0.7  // Larger for LiDAR
        });
      }
      
      return indicators;
    }
    // For photogrammetry paths, place indicators only at actual waypoints
    else if (isPhotogrammetryPath) {
      const indicators = [];
      
      // Skip the last waypoint (no direction from it)
      for (let i = 0; i < points.length - 1; i++) {
        const point = points[i];
        const nextPoint = points[i + 1];
        
        // Calculate direction
        const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
        
        // Create arrow (cylinder pointing in direction)
        indicators.push({
          position: point.clone(),
          direction: direction,
          color: typeof colors[i] === 'string' ? colors[i] : colors[Math.min(i, colors.length-1)].getHex(),
          length: 1.5,
          radius: 0.5
        });
      }
      
      return indicators;
    } 
    else {
      // For non-photogrammetry curved paths, distribute indicators evenly
      if (pathPoints.length < 4) return [];
      
      const indicators = [];
      
      // Place arrows at regular intervals, more frequent for longer paths
      const totalLength = curvePointsLength(pathPoints);
      const numArrows = Math.min(10, Math.max(2, Math.floor(totalLength / 40)));
      const interval = pathPoints.length / (numArrows + 1);
      
      for (let i = 1; i <= numArrows; i++) {
        const index = Math.floor(interval * i);
        
        if (index >= pathPoints.length - 1) continue;
        
        const point = pathPoints[index];
        const nextPoint = pathPoints[index + 1];
        
        // Calculate direction
        const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
        
        // Create arrow (cylinder pointing in direction)
        indicators.push({
          position: point.clone(),
          direction: direction,
          color: typeof colors[index] === 'string' ? colors[index] : colors[Math.min(index, colors.length-1)].getHex(),
          length: 1.5,
          radius: 0.5
        });
      }
      
      return indicators;
    }
  }, [pathPoints, points, cornerPoints, colors, isPhotogrammetryPath, isLidarMission]);
  
  // Create separate ground projection path if available
  const groundProjectionPoints = groundProjections && groundProjections.length >= 2 
    ? groundProjections
        .filter(wp => wp.local)
        .map(wp => wp.local!)
        .map(local => new THREE.Vector3(local.x, local.z, -local.y))
    : [];
    
  const hasGroundProjections = groundProjectionPoints.length >= 2;
  
  // Determine if any waypoint has a hold time for visualization
  const waypointsWithHold = waypoints.filter(wp => (wp.holdTime ?? 0) > 0);

  // For LiDAR missions, we want to highlight the corner points
  const cornerMarkers = useMemo(() => {
    if (!isLidarMission) return [];
    
    return cornerPoints.map((point, index) => ({
      position: point.clone(),
      radius: 1.0,
      color: selected ? PATH_COLORS.SELECTED : PATH_COLORS.LIDAR
    }));
  }, [cornerPoints, isLidarMission, selected]);
  
  return (
    <>
      {/* Main flight path */}
      <Line
        points={pathPoints}
        vertexColors={colors.map(c => typeof c === 'string' ? new THREE.Color(c) : c)}
        lineWidth={lineWidth}
        transparent={true}
        opacity={opacity}
        dashed={isLidarMission} // Use dashed lines for LiDAR missions
        dashSize={isLidarMission ? 2 : 0.5}
        dashScale={isLidarMission ? 1.5 : 1.0}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />
      
      {/* Ground projection path if available */}
      {hasGroundProjections && (
        <Line
          points={groundProjectionPoints}
          color="#ffff00" // Yellow for ground projections
          lineWidth={1.5}
          dashed={true}
          dashSize={0.5}
          dashScale={1.0}
          transparent={true}
          opacity={0.6}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        />
      )}
      
      {/* Direction indicators (arrows) */}
      {directionIndicators.map((arrow, index) => (
        <DirectionIndicator 
          key={`arrow-${index}`}
          position={arrow.position}
          direction={arrow.direction}
          color={arrow.color}
          length={arrow.length}
          radius={arrow.radius}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        />
      ))}
      
      {/* Corner markers for LiDAR missions */}
      {cornerMarkers.map((marker, index) => (
        <CornerMarker
          key={`corner-${index}`}
          position={marker.position}
          radius={marker.radius}
          color={marker.color}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        />
      ))}
      
      {/* Hover indicators for waypoints with hold time */}
      {waypointsWithHold.map((wp, index) => {
        if (!wp.local) return null;
        
        return (
          <HoverIndicator
            key={`hover-${index}`}
            position={new THREE.Vector3(wp.local.x, wp.local.z, -wp.local.y)}
            size={1.2}
            color={selected ? '#f39c12' : isLidarMission ? PATH_COLORS.LIDAR : '#3498db'}
            holdTime={wp.holdTime || 0}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          />
        );
      })}
    </>
  );
};

// Helper component for direction indicators
interface DirectionIndicatorProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  color: string | number;
  length: number;
  radius: number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

const DirectionIndicator: React.FC<DirectionIndicatorProps> = ({
  position,
  direction,
  color,
  length,
  radius,
  onClick
}) => {
  // Calculate quaternion to orient cylinder along direction vector
  const quaternion = useMemo(() => {
    // Default orientation is along Y axis
    const defaultDir = new THREE.Vector3(0, 1, 0);
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);
  
  return (
    <group position={position} quaternion={quaternion}>
      <Cylinder
        args={[0, radius, length, 4, 1]} // Cone-like shape
        position={[0, length/2, 0]}
        onClick={onClick}
      >
        <meshBasicMaterial
          color={color}
          transparent={true}
          opacity={0.8}
        />
      </Cylinder>
    </group>
  );
};

// Helper component for LiDAR corner markers
interface CornerMarkerProps {
  position: THREE.Vector3;
  radius: number;
  color: string | number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

const CornerMarker: React.FC<CornerMarkerProps> = ({
  position,
  radius,
  color,
  onClick
}) => {
  return (
    <Sphere
      args={[radius, 8, 8]}
      position={position}
      onClick={onClick}
    >
      <meshBasicMaterial
        color={color}
        transparent={true}
        opacity={0.9}
      />
    </Sphere>
  );
};

// Helper component for hover indicators
interface HoverIndicatorProps {
  position: THREE.Vector3;
  size: number;
  color: string;
  holdTime: number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

const HoverIndicator: React.FC<HoverIndicatorProps> = ({
  position,
  size,
  color,
  holdTime,
  onClick
}) => {
  // Create a circular indicator for hover points
  return (
    <group position={position}>
      <mesh rotation={[Math.PI/2, 0, 0]} onClick={onClick}>
        <ringGeometry args={[size - 0.2, size, 32]} />
        <meshBasicMaterial color={color} transparent={true} opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Helper function to calculate the length of a curve from points
function curvePointsLength(points: THREE.Vector3[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += points[i].distanceTo(points[i-1]);
  }
  return length;
}

export default PathLine; 