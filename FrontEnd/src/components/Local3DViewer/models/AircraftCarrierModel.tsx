import React, { useEffect, useRef, useMemo } from 'react';
import { useLoader, useThree, ThreeEvent } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import { LocalCoord } from '../../../types/mission';
import { feetToMeters } from '../../../utils/sensorCalculations';

interface AircraftCarrierModelProps {
  position?: LocalCoord | [number, number, number];
  rotation?: LocalCoord | [number, number, number];
  scale?: number | [number, number, number];
  // Optional prop to specify real-world dimensions
  realWorldLength?: number; // in feet
  heightOffset?: number; // Height offset in feet above ground plane (-50 to +50)
  // Add event handlers and userData
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  userData?: any;
}

// Default aircraft carrier dimensions (approximate Ford-class)
const DEFAULT_CARRIER_LENGTH_FEET = 1106;
// const DEFAULT_CARRIER_WIDTH_FEET = 256; // At flight deck - might not be needed if using length for scaling

const AircraftCarrierModel: React.FC<AircraftCarrierModelProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1, // Default scale to 1, rely on realWorldLength initially
  realWorldLength = DEFAULT_CARRIER_LENGTH_FEET,
  heightOffset = 0, // Default to 0 feet offset for a ship
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

  // Use the FBX loader to load the model
  const fbx = useLoader(
    FBXLoader,
    '/models/CVN Aircraft Carrier/Model/USS Gerald Ford 1.1.fbx', // Updated path
    (loader) => {
      // Set texture path to the textures directory
      loader.setPath('/models/CVN Aircraft Carrier/textures/'); // Updated path
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

  // --- START: Material Fixing Logic ---
  useEffect(() => {
    const currentModel = modelRef.current;
    if (currentModel) {
      console.log(`[Material Check] Traversing aircraft carrier model: ${currentModel.name || 'Unnamed'}`);
      currentModel.traverse((obj: any) => {
        if (obj.isMesh && obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          let materialsChanged = false; // Flag to check if we actually changed anything

          const updatedMaterials = materials.map((material: THREE.Material) => {
            // Check if the material instance itself has the type 'unknown'
            // or if its constructor name points to an issue (sometimes type isn't set correctly)
            if (material.type === 'unknown' || material.constructor.name === 'UnknownMaterial') {
              console.warn(`[Material Fix] Replacing unknown material on carrier mesh "${obj.name}" with MeshStandardMaterial.`);
              materialsChanged = true;
              // Using MeshStandardMaterial might give better results with lighting/post-processing
              const fallbackMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888, // Neutral gray
                metalness: 0.5, // Ships are metallic
                roughness: 0.6,
                side: THREE.DoubleSide, // Keep double side if needed
                name: 'FallbackMaterial' // Give it a name for debugging
              });
              // Dispose of the old material if possible (helps with memory)
              material.dispose();
              return fallbackMaterial;
            }
            return material; // Keep the original material if it's known
          });

          // Only update the material property if changes were made
          if (materialsChanged) {
            if (Array.isArray(obj.material)) {
              obj.material = updatedMaterials;
            } else {
              obj.material = updatedMaterials[0];
            }
            // Important: Tell Three.js the material needs an update
            // Check if obj.material is an array or single object before accessing needsUpdate
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m: THREE.Material) => { if (m) m.needsUpdate = true; });
            } else if (obj.material) {
              obj.material.needsUpdate = true;
            }
          }
        }
      });
    }
  }, [model]); // Re-run this effect when the 'model' object changes (i.e., after loading)
  // --- END: Material Fixing Logic ---

  // Calculate model dimensions and appropriate scale
  const [modelDimensions, calculatedScaleFactor] = useMemo(() => {
    if (!model) return [null, null];

    // Create a bounding box to measure the model
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());

    // Log the raw model dimensions
    console.log('Raw carrier model dimensions (model units):', {
      width: size.x,
      height: size.y,
      length: size.z
    });

    // Convert realWorldLength from feet to meters (our scene units)
    const targetLengthMeters = feetToMeters(realWorldLength);

    // Calculate scaling factor needed to achieve the target length
    // Assuming the model's longest dimension corresponds to the real-world length
    // IMPORTANT: We might need to inspect the raw dimensions to confirm which axis (x, y, or z) represents length
    const dominantAxisLength = Math.max(size.x, size.y, size.z); // Initial guess: use max dimension
    // If we know the model's orientation, we might use size.x or size.z specifically.
    // For now, let's assume the longest dimension is the one we want to scale.

    if (dominantAxisLength === 0) {
        console.warn('Carrier model dominant axis length is zero, cannot calculate scale.');
        return [size, 1]; // Avoid division by zero, return default scale 1
    }

    const scaleFactor = targetLengthMeters / dominantAxisLength;

    console.log(`Scaling carrier model to match ${realWorldLength} feet (${targetLengthMeters.toFixed(2)} meters)`);
    console.log(`Calculated scale factor: ${scaleFactor}`);

    return [size, scaleFactor];
  }, [model, realWorldLength]);

  // Add early detection of manual scaling for use in useEffect
  // const scaleValue = typeof scale === 'number' ? scale : 1;
  // const isLargeScale = scaleValue > 2; // Define what "large scale" means for the carrier if needed

  // Convert height offset from feet to meters
  const heightOffsetMeters = feetToMeters(heightOffset);

  // Apply any necessary transformations after the model loads
  useEffect(() => {
    if (modelRef.current && model && modelDimensions && calculatedScaleFactor) {
        // Calculate the bounding box of the *potentially scaled* object for accurate positioning
        const tempScale = calculatedScaleFactor; // Use the calculated scale factor for measurement
        modelRef.current.scale.set(tempScale, tempScale, tempScale); // Temporarily apply scale
        modelRef.current.updateMatrixWorld(true); // Ensure transforms are up-to-date

        const box = new THREE.Box3().setFromObject(modelRef.current);
        // const center = box.getCenter(new THREE.Vector3()); // Center might not be needed for ship
        const size = box.getSize(new THREE.Vector3());

        // Reset scale before applying final position/scale adjustments
        modelRef.current.scale.set(1, 1, 1); // Reset scale temporarily
        modelRef.current.updateMatrixWorld(true);

        // Position the model based on height offset
        // Ground the model first (adjust its y position so its bottom is at formattedPosition[1])
        // then add the height offset.
        const groundY = formattedPosition[1]; // The target ground level
        const modelBottomY = box.min.y; // The lowest point of the scaled model
        const initialYPosition = groundY - modelBottomY + heightOffsetMeters;

        modelRef.current.position.y = initialYPosition;

        // Note: Centering logic from DockModel might not be desired for a ship,
        // as we likely want its position prop to define a specific point (e.g., stern or midship).
        // Omitting the X/Z centering for now.

        console.log('Carrier model loaded with dimensions (after scaling):', {
            width: modelDimensions.x * calculatedScaleFactor,
            height: modelDimensions.y * calculatedScaleFactor,
            length: modelDimensions.z * calculatedScaleFactor,
            units: 'meters',
            appliedScaleFactor: calculatedScaleFactor,
            heightOffset: heightOffsetMeters,
            finalPositionY: initialYPosition,
            boundingBoxMinY: box.min.y,
            boundingBoxMaxY: box.max.y
        });
    }
}, [model, modelDimensions, calculatedScaleFactor, formattedPosition, heightOffsetMeters]); // Dependencies updated


  // Return null if model hasn't loaded yet
  if (!model || !calculatedScaleFactor) return null;

  // Determine the final scale to apply
  let finalScale: [number, number, number];

  // Check if manual scaling is being used
  const isManualScaling = (typeof scale === 'number' && scale !== 1.0) ||
                          (Array.isArray(scale) && scale.some(val => val !== 1.0));

  console.log(`AircraftCarrierModel scale check: scale=${typeof scale === 'number' ? scale : JSON.stringify(scale)}, isManualScaling=${isManualScaling}`);


  if (!isManualScaling && calculatedScaleFactor !== null) {
    // Use the calculated real-world scale factor
    finalScale = [calculatedScaleFactor, calculatedScaleFactor, calculatedScaleFactor];
    console.log('Using calculated scale with realWorldLength:', finalScale);
  } else {
    // Use the manual scale provided
    if (typeof scale === 'number') {
      finalScale = [scale, scale, scale];
    } else if (Array.isArray(scale)) {
      // Ensure it's a tuple of three numbers
      finalScale = scale.length === 3 ? [scale[0], scale[1], scale[2]] : [1, 1, 1];
    } else {
      // Fallback if scale prop is invalid type
      finalScale = [1, 1, 1];
    }
    console.log('Using manual scale:', finalScale);
  }

  return (
    <primitive
      ref={modelRef}
      object={model}
      position={formattedPosition}
      rotation={formattedRotation}
      scale={finalScale} // Apply the final determined scale
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      userData={userData}
    />
  );
};

// Preload the model for better performance
useLoader.preload(FBXLoader, '/models/CVN Aircraft Carrier/Model/USS Gerald Ford 1.1.fbx'); // Updated path

export default AircraftCarrierModel; 