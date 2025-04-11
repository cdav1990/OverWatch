import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { withLOD } from './Local3DViewer';
import { useDetectGPU } from '@react-three/drei';

// Import GLTFLoader and DRACOLoader using dynamic imports
// @ts-ignore - Workaround for three.js module imports
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// @ts-ignore - Workaround for three.js module imports
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Define model quality levels
export enum ModelQuality {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Interface for model resources with LOD
interface ModelResource {
  id: string;
  name: string;
  resourcePaths: {
    [ModelQuality.HIGH]: string;
    [ModelQuality.MEDIUM]: string;
    [ModelQuality.LOW]: string;
  };
  scale?: number;
  distanceThresholds?: number[];
}

// Props for ModelWithLOD component
interface ModelWithLODProps {
  resource: ModelResource;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  visible?: boolean;
  onLoad?: () => void;
}

// ModelRegistry to track loaded models
export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, ModelResource> = new Map();
  
  private constructor() {}
  
  static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }
  
  registerModel(model: ModelResource): void {
    this.models.set(model.id, model);
  }
  
  getModel(id: string): ModelResource | undefined {
    return this.models.get(id);
  }
  
  getAllModels(): ModelResource[] {
    return Array.from(this.models.values());
  }
}

// Component for loading a model with LOD support
export const ModelWithLOD: React.FC<ModelWithLODProps> = ({ 
  resource, 
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  visible = true,
  onLoad
}) => {
  const { camera } = useThree();
  const gpuTier = useDetectGPU();
  const [loadingStatus, setLoadingStatus] = useState<Record<ModelQuality, boolean>>({
    [ModelQuality.HIGH]: false,
    [ModelQuality.MEDIUM]: false,
    [ModelQuality.LOW]: false
  });
  
  // Adjust distance thresholds based on GPU capabilities
  const distanceThresholds = useMemo(() => {
    const baseThresholds = resource.distanceThresholds || [0, 100, 300];
    
    // Adjust thresholds based on GPU tier
    if (gpuTier) {
      if (gpuTier.tier === 3) {
        // High-end GPU - extend distance thresholds for better detail
        return baseThresholds.map(d => d * 1.5);
      } else if (gpuTier.tier === 1) {
        // Low-end GPU - reduce thresholds to use lower detail sooner
        return baseThresholds.map(d => d * 0.6);
      } else if (gpuTier.tier === 0) {
        // Very low-end - use low detail for almost everything
        return baseThresholds.map(d => d * 0.3);
      }
    }
    
    return baseThresholds;
  }, [resource.distanceThresholds, gpuTier]);
  
  // Setup DRACO loader for compressed models
  const dracoLoader = useMemo(() => {
    const loader = new DRACOLoader();
    loader.setDecoderPath('/draco/');
    return loader;
  }, []);
  
  // Create LOD component with model loading
  const LODComponent = withLOD('group', {
    distanceThresholds,
    getDetailLevel: (level) => {
      // Determine quality level based on distance threshold
      let quality: ModelQuality;
      if (level === 0) quality = ModelQuality.HIGH;
      else if (level === 1) quality = ModelQuality.MEDIUM;
      else quality = ModelQuality.LOW;
      
      return (
        <ModelLoader 
          quality={quality}
          resourcePath={resource.resourcePaths[quality]}
          onLoad={() => {
            setLoadingStatus(prev => ({...prev, [quality]: true}));
            if (quality === ModelQuality.HIGH && onLoad) {
              onLoad();
            }
          }}
          scale={scale || resource.scale || 1}
        />
      );
    }
  });
  
  // Create proper Euler for rotation
  const eulerRotation = useMemo(() => {
    return new THREE.Euler(rotation[0], rotation[1], rotation[2]);
  }, [rotation]);
  
  return (
    <group position={position as THREE.Vector3Tuple} rotation={eulerRotation} visible={visible}>
      <LODComponent />
    </group>
  );
};

// Helper component to load a single detail level of a model
interface ModelLoaderProps {
  quality: ModelQuality;
  resourcePath: string;
  onLoad?: () => void;
  scale?: number;
}

const ModelLoader: React.FC<ModelLoaderProps> = ({ 
  quality, 
  resourcePath, 
  onLoad,
  scale = 1
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Load the model with the proper loader
  const gltf = useLoader(
    GLTFLoader,
    resourcePath,
    (loader) => {
      if (resourcePath.endsWith('.glb') || resourcePath.endsWith('.gltf')) {
        // Setup DRACO if needed
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        (loader as GLTFLoader).setDRACOLoader(dracoLoader);
      }
    }
  );
  
  // Apply optimizations once model is loaded
  useEffect(() => {
    if (gltf && groupRef.current) {
      // Clone the model to ensure we don't have shared references
      const modelClone = gltf.scene.clone(true);
      
      // Apply scale
      modelClone.scale.set(scale, scale, scale);
      
      // Performance optimizations based on quality level
      modelClone.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          // Only high quality models cast shadows
          object.castShadow = quality === ModelQuality.HIGH;
          object.receiveShadow = quality === ModelQuality.HIGH;
          
          // Optimize matrix updates for performance
          object.matrixAutoUpdate = false;
          
          // Apply simpler materials for low quality models
          if (quality === ModelQuality.LOW) {
            // Check if material is using textures and simplify if needed
            if (object.material instanceof THREE.MeshStandardMaterial) {
              // Create simplified material
              const simpleMaterial = new THREE.MeshLambertMaterial({
                color: object.material.color,
                opacity: object.material.opacity,
                transparent: object.material.transparent,
              });
              object.material = simpleMaterial;
            }
            
            // Simplify geometry if it has a lot of vertices
            if (object.geometry instanceof THREE.BufferGeometry) {
              const positions = object.geometry.attributes.position;
              if (positions && positions.count > 5000) {
                // For low quality, simply reduce the number of vertices by using a decimated version
                // In a production app, you'd have pre-decimated models rather than doing it on the fly
                const simplified = object.geometry.clone();
                // Instead of using BufferGeometryUtils.mergeVertices, we'll just use less detail
                // This is a simpler approach that doesn't require the additional import
                if (simplified.index) {
                  // If there's an index buffer, we'll create a strided version to reduce detail
                  const stride = Math.max(2, Math.floor(positions.count / 2000));
                  const newIndices = [];
                  for (let i = 0; i < simplified.index.count; i += stride) {
                    newIndices.push(simplified.index.array[i]);
                  }
                  simplified.setIndex(newIndices);
                }
                object.geometry = simplified;
              }
            }
          }
          
          // Medium quality optimizations
          if (quality === ModelQuality.MEDIUM) {
            // Use simpler materials but keep more detail
            if (object.material instanceof THREE.MeshStandardMaterial) {
              // Keep some textures but switch to a cheaper material
              const mediumMaterial = new THREE.MeshPhongMaterial({
                color: object.material.color,
                map: object.material.map,
                normalMap: object.material.normalMap,
                opacity: object.material.opacity,
                transparent: object.material.transparent,
              });
              object.material = mediumMaterial;
            }
          }
        }
      });
      
      // Add the optimized model to our group
      groupRef.current.add(modelClone);
      
      // Mark as loaded and trigger callback
      setIsLoaded(true);
      if (onLoad) onLoad();
    }
  }, [gltf, quality, scale, onLoad]);
  
  return <group ref={groupRef} />;
};

// Helper to register models with LOD support
export const registerModelWithLOD = (model: ModelResource): void => {
  ModelRegistry.getInstance().registerModel(model);
};

// Sample usage of model registration
// Call this during app initialization
export const registerDefaultModels = (): void => {
  // Register a ship model with LOD
  registerModelWithLOD({
    id: 'cargo-ship',
    name: 'Cargo Ship',
    resourcePaths: {
      [ModelQuality.HIGH]: '/models/ships/cargo_ship_high.glb',
      [ModelQuality.MEDIUM]: '/models/ships/cargo_ship_medium.glb',
      [ModelQuality.LOW]: '/models/ships/cargo_ship_low.glb',
    },
    scale: 1.0,
    distanceThresholds: [0, 150, 500],
  });
  
  // Register other common models
  registerModelWithLOD({
    id: 'drone',
    name: 'Drone',
    resourcePaths: {
      [ModelQuality.HIGH]: '/models/drones/drone_high.glb',
      [ModelQuality.MEDIUM]: '/models/drones/drone_medium.glb',
      [ModelQuality.LOW]: '/models/drones/drone_low.glb',
    },
    scale: 1.0,
    distanceThresholds: [0, 50, 200],
  });
  
  // You can add more models here
};

export default ModelWithLOD; 