import React, { useEffect, useRef, useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import { LocalCoord } from '../../../types/mission';
import { feetToMeters } from '../../../utils/sensorCalculations';

interface ShipModelProps {
  position?: LocalCoord | [number, number, number]; 
  rotation?: LocalCoord | [number, number, number];
  scale?: number | [number, number, number];
  // Optional prop to specify real-world dimensions
  realWorldLength?: number; // in feet
}

// Real-world dimensions of USS Gerald R. Ford in feet
const GERALD_FORD_LENGTH_FEET = 1106;
const GERALD_FORD_WIDTH_FEET = 256;
const GERALD_FORD_HEIGHT_FEET = 250; // Approximate height including tower

const ShipModel: React.FC<ShipModelProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1,
  realWorldLength = GERALD_FORD_LENGTH_FEET  // Default to USS Gerald Ford length
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
  
  // Apply any necessary transformations after the model loads
  useEffect(() => {
    if (modelRef.current && model && modelDimensions) {
      // Center the model if needed
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      
      console.log('Ship model loaded with dimensions (after scaling):', {
        width: modelDimensions.x * (calculatedScale || 1),
        height: modelDimensions.y * (calculatedScale || 1),
        length: modelDimensions.z * (calculatedScale || 1),
        units: 'meters'
      });
    }
  }, [model, modelDimensions, calculatedScale]);
  
  // Return null if model hasn't loaded yet
  if (!model) return null;
  
  // Determine the final scale to apply
  // If a specific scale was provided, use it, otherwise use our calculated scale
  // If scale is a number, convert it to a triplet
  let finalScale: [number, number, number];
  if (calculatedScale !== null) {
    // If we have a calculated scale based on real-world dimensions, use that
    const baseScale = typeof scale === 'number' ? scale : 1;
    finalScale = [
      calculatedScale * baseScale,
      calculatedScale * baseScale,
      calculatedScale * baseScale
    ];
  } else {
    // Fallback to provided scale or default
    finalScale = Array.isArray(scale) 
      ? scale as [number, number, number] 
      : [scale, scale, scale];
  }
  
  return (
    <primitive
      ref={modelRef}
      object={model}
      position={formattedPosition}
      rotation={formattedRotation}
      scale={finalScale}
    />
  );
};

// Preload the model for better performance
useLoader.preload(FBXLoader, '/models/uss_gerald_ford/Model/uss_gerald_r_ford.fbx');

export default ShipModel;
