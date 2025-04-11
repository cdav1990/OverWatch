import React, { useEffect, useRef, useMemo } from 'react';
import { useLoader, useThree, ThreeEvent } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import { LocalCoord } from '../../../types/mission';
import { feetToMeters } from '../../../utils/sensorCalculations';

// Interface for props
interface ShipModelProps {
  position?: LocalCoord | [number, number, number]; 
  rotation?: LocalCoord | [number, number, number];
  scale?: number | [number, number, number];
  realWorldLength?: number; // For accurate scaling (in feet)
  heightOffset?: number; // Height offset in feet above ground plane
  // Add event handlers and userData
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  userData?: any;
}

// Default ship length (feet)
const DEFAULT_SHIP_LENGTH_FEET = 400;

const ShipModel: React.FC<ShipModelProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1,
  realWorldLength = DEFAULT_SHIP_LENGTH_FEET,
  heightOffset = 0, // Default to 0 feet (on ground)
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut,
  userData
}) => {
  const modelRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  // Format position properly for the primitive component
  const formattedPosition: [number, number, number] = Array.isArray(position) 
    ? position as [number, number, number]
    : [position.x, position.z, -position.y]; // Map local Z to THREE Y, negate local Y for THREE Z

  // Format rotation properly for the primitive component
  const formattedRotation: [number, number, number] = Array.isArray(rotation)
    ? rotation as [number, number, number]
    : [
        THREE.MathUtils.degToRad(rotation.x || 0),
        THREE.MathUtils.degToRad(rotation.z || 0), // Map local Z rot to THREE Y rot
        -THREE.MathUtils.degToRad(rotation.y || 0)  // Map local Y rot to THREE Z rot (negated)
      ];
  
  // Use the FBX loader to load the model - updated path to match your structure
  const fbx = useLoader(
    FBXLoader, 
    '/models/uss_gerald_ford/Model/uss_gerald_r_ford.fbx',
    (loader) => {
      // Set texture path
      loader.setPath('/models/uss_gerald_ford/Texture/');
    }
  );
  
  // Use memo to avoid recreating the model on re-renders
  const model = useMemo(() => {
    if (!fbx) return null;
    
    // Create a copy of the loaded model
    const modelCopy = fbx.clone();
    
    // Process the model - optimize materials, add shadows, etc.
    modelCopy.traverse((node: any) => {
      if (node.isMesh) {
        // Enable shadows
        node.castShadow = true;
        node.receiveShadow = true;
        
        // Ensure materials are properly applied
        if (node.material) {
          // Set consistent material properties
          if (Array.isArray(node.material)) {
            node.material.forEach((mat: any) => {
              mat.side = THREE.DoubleSide;
              mat.needsUpdate = true;
            });
          } else {
            node.material.side = THREE.DoubleSide;
            node.material.needsUpdate = true;
          }
        }
      }
    });
    
    return modelCopy;
  }, [fbx]);
  
  // Calculate model dimensions and appropriate scale
  const [modelDimensions, calculatedScale] = useMemo(() => {
    if (!model) return [null, null];
    
    // Create a bounding box to measure the model
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    
    // Log the raw model dimensions
    console.log('Raw model dimensions (model units):', {
      width: size.x,
      height: size.y,
      length: size.z
    });
    
    // Convert realWorldLength from feet to meters (our scene units)
    const targetLengthMeters = feetToMeters(realWorldLength);
    
    // Calculate scaling factor needed to achieve the target length
    // We use the maximum dimension as the model's "length"
    const maxDimension = Math.max(size.x, size.y, size.z);
    const scaleFactor = targetLengthMeters / maxDimension;
    
    console.log(`Scaling model to match ${realWorldLength} feet (${targetLengthMeters.toFixed(2)} meters)`);
    console.log(`Calculated scale factor: ${scaleFactor}`);
    
    return [size, scaleFactor];
  }, [model, realWorldLength]);
  
  // Add early detection of manual scaling for use in useEffect
  const scaleValue = typeof scale === 'number' ? scale : 1;
  const isLargeScale = scaleValue > 2;
  
  // Convert height offset from feet to meters
  const heightOffsetMeters = feetToMeters(heightOffset);
  
  // Add a new variable to track whether the model is anchored to its fixed position
  const isFixedPositionModel = useMemo(() => {
    // Check if model has specific coordinates that we want to enforce
    // The coordinates from our screenshots match these values
    if (typeof position === 'object' && !Array.isArray(position)) {
      const pos = position as LocalCoord;
      return Math.abs(pos.x - (-1150)) < 20 && Math.abs(pos.y - (-870)) < 20;
    }
    return false;
  }, [position]);

  // Special handling for fixed position models - bypass all automatic repositioning
  // by setting formatted position directly
  const actualFormattedPosition = useMemo(() => {
    if (isFixedPositionModel) {
      // For fixed position ships, create a precise position array with height offset applied
      return [
        -1150, // exact x position
        -25 * 0.3048, // negative 25 feet converted to meters
        870 // exact y position (negated for THREE coordinates)
      ] as [number, number, number];
    }
    return formattedPosition;
  }, [isFixedPositionModel, formattedPosition, heightOffsetMeters]);
  
  useEffect(() => {
    if (!modelRef.current || !model || !modelDimensions) return;
    
    // Calculate the bounding box to get proper dimensions and center
    const box = new THREE.Box3().setFromObject(modelRef.current);
    
    // Special handling for ship at fixed position
    if (isFixedPositionModel) {
      // For fixed position ship, don't do any automatic repositioning
      // The position is already set correctly in actualFormattedPosition
      console.log("Ship model at fixed position (-1150, -870) with height -25 feet. Skipping ANY auto-repositioning.");
      
      // Log the dimensions after scaling
      console.log('Ship model loaded with dimensions (after scaling) at fixed position:', {
        width: modelDimensions.x * (calculatedScale || 1),
        height: modelDimensions.y * (calculatedScale || 1),
        length: modelDimensions.z * (calculatedScale || 1),
        units: 'meters',
        heightOffset: heightOffsetMeters,
        position: {
          x: -1150,
          y: -870,
          z: 0
        }
      });
      return;
    }
    
    // For non-fixed position ships, apply normal positioning logic
    const center = box.getCenter(new THREE.Vector3());
    
    // MODIFIED: Apply ground anchoring only if heightOffset is 0
    // Otherwise, position the model at the specified height above ground
    if (heightOffset === 0) {
      // Ground the model
      modelRef.current.position.y -= (box.min.y - formattedPosition[1]);
    } else {
      // Position model at the specified height above ground
      // First ground it, then add the height offset
      modelRef.current.position.y -= (box.min.y - formattedPosition[1]);
      modelRef.current.position.y += heightOffsetMeters;
    }
    
    // Center the model on its X and Z axes for better stability when scaling
    // When model is very far from origin, ensure we don't overcompensate
    const distanceFromOrigin = Math.sqrt(
      formattedPosition[0] * formattedPosition[0] + 
      formattedPosition[2] * formattedPosition[2]
    );
    
    // Apply less aggressive centering when model is far from origin
    const centeringFactor = distanceFromOrigin > 500 ? 0.1 : 0.5;

    // Only apply centering for large scales or when model is close to origin
    if (isLargeScale || distanceFromOrigin < 100) {
      modelRef.current.position.x -= (center.x - formattedPosition[0]) * centeringFactor;
      modelRef.current.position.z -= (center.z - formattedPosition[2]) * centeringFactor;
    }
    
    // Log the dimensions after scaling
    console.log('Ship model loaded with dimensions (after scaling):', {
      width: modelDimensions.x * (calculatedScale || 1),
      height: modelDimensions.y * (calculatedScale || 1),
      length: modelDimensions.z * (calculatedScale || 1),
      units: 'meters',
      heightOffset: heightOffsetMeters,
      boundingBox: {
        min: { x: box.min.x, y: box.min.y, z: box.min.z },
        max: { x: box.max.x, y: box.max.y, z: box.max.z }
      }
    });
  }, [model, modelDimensions, calculatedScale, formattedPosition, heightOffset, heightOffsetMeters, isLargeScale, isFixedPositionModel]);
  
  // Return null if model hasn't loaded yet
  if (!model) return null;
  
  // Determine the final scale to apply with more predictable behavior
  let finalScale: [number, number, number];
  
  // IMPROVED: Create a more intuitive scaling experience with better defaults for this model
  // Default scale factor for different scale value ranges
  const getCustomNormalization = (scaleValue: number): number => {
    // Special case handling: the "sweet spot" range for models
    if (scaleValue >= 0.05 && scaleValue <= 0.2) {
      // Use direct values in the sweet spot range - no normalization needed
      return 1.0; 
    } else if (scaleValue < 0.05) {
      // Very small values - use smaller normalization
      return 0.2;
    } else if (scaleValue <= 1) {
      // Medium values - use medium normalization
      return 0.1;
    } else {
      // Large values - use smallest normalization for gradual scaling
      return 0.03;
    }
  };
  
  // IMPROVED: More intuitive manual scaling detection with proper type checking
  const isManualScaling = typeof scale === 'number' 
    ? (scale !== 1.0) // Any non-default scale is considered manual
    : Array.isArray(scale) 
      ? (scale as number[]).some(val => val !== 1.0)
      : false;
  
  // Detailed logging for debugging
  console.log(`ShipModel scale check: scale=${typeof scale === 'number' ? scale : JSON.stringify(scale)}, isManualScaling=${isManualScaling}`);
  
  if (calculatedScale !== null && !isManualScaling) {
    // If using the calculated real-world scale
    const scaleValue = calculatedScale || 1.0; // Default to 1.0 if null
    finalScale = [
      scaleValue,
      scaleValue,
      scaleValue
    ];
    console.log('Using calculated scale with realWorldLength:', finalScale);
  } else {
    // For manual scaling, apply adaptive normalization based on scale range
    // This makes the scaling behavior more intuitive across different ranges
    if (typeof scale === 'number') {
      // Handle single number scale
      const normFactor = getCustomNormalization(scale);
      const effectiveScale = scale * normFactor;
      
      // If we're in the sweet spot range, use exact values
      finalScale = [effectiveScale, effectiveScale, effectiveScale];
    } else if (Array.isArray(scale)) {
      // Handle array scale with proper type safety
      const scaleArray = scale as number[];
      finalScale = [
        scaleArray[0] * getCustomNormalization(scaleArray[0]),
        scaleArray[1] * getCustomNormalization(scaleArray[1]),
        scaleArray[2] * getCustomNormalization(scaleArray[2])
      ];
    } else {
      // Fallback for any other case
      finalScale = [1, 1, 1];
    }
    
    console.log('Using normalized manual scale:', finalScale, 'from original:', scale);
  }
  
  return (
    <primitive
      ref={modelRef}
      object={model}
      position={isFixedPositionModel ? actualFormattedPosition : formattedPosition}
      rotation={formattedRotation}
      scale={finalScale}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      userData={userData}
    />
  );
};

// Preload the model for better performance
useLoader.preload(FBXLoader, '/models/uss_gerald_ford/Model/uss_gerald_r_ford.fbx');

export default ShipModel;
