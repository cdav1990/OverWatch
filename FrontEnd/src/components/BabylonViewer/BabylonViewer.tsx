import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    Engine, Scene, ArcRotateCamera, Vector3, MeshBuilder, 
    StandardMaterial, Color3, Nullable, AxesViewer, SceneLoader, 
    ShadowGenerator, CubeTexture,
    TransformNode,
    Color4, Mesh,
    Vector2,
    AbstractMesh,
    PointerEventTypes,
    NoiseProceduralTexture,
    HemisphericLight, 
    DirectionalLight,
    HDRCubeTexture,
    ImageProcessingConfiguration,
    GlowLayer,
    SSAORenderingPipeline,
    DefaultRenderingPipeline,
    CascadedShadowGenerator,
    SSRRenderingPipeline,
    IblShadowsRenderPipeline,
    LinesMesh,
    VertexData
} from '@babylonjs/core';
import { WaterMaterial } from "@babylonjs/materials";
import '@babylonjs/loaders/glTF'; // Import GLTF loader
import { Box, CircularProgress, Typography, IconButton } from '@mui/material';
import { useMission } from '../../context/MissionContext'; // Import useMission
import { feetToMeters } from '../../utils/sensorCalculations'; // Corrected path
import { localENUToBabylon, babylonToLocalENU } from '../../utils/coordinates/coordinateTransformations';
import { Waypoint, LocalCoord } from '../../types/mission';
// Import hardware types if needed for camera params
import { Camera, Lens } from '../../types/hardware';
import { SceneSettings } from './types/SceneSettings'; // Import SceneSettings type
import DronePositionControlPanel from '../DronePositionControlPanel/DronePositionControlPanelWithDOF'; // Import the control panel
import SettingsIcon from '@mui/icons-material/Settings'; // Gear Icon
import { DOFVisualizer } from './DOFVisualizer';
import ViewerSettingsOverlayFixed from './ViewerSettingsOverlayFixed'; // Import the fixed version
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { patchSceneSettings } from '../../state/slices/sceneSlice';

// Simple styles object (MOVED TO TOP)
const styles = {
    loadingOverlay: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10,
    },
    errorOverlay: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 10,
        padding: 2,
    },
    settingsButton: {
        position: 'absolute' as const,
        top: 8,
        right: 8,
        zIndex: 10, // Ensure button is above canvas
        color: 'rgba(255, 255, 255, 0.7)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: '#fff',
        }
    }
};

// --- Placeholder for Frustum Calculation Logic ---
// Ideally, move this to a utility file (e.g., cameraUtils.ts)

function calculateFrustumDimensions(
    camera: Camera | null | undefined, 
    lens: Lens | null | undefined,
    distance: number
): { width: number, height: number, vfov: number, hfov: number } | null {
    // Ensure properties exist and parse them as numbers
    const sensorHeight = camera?.sensorHeight ? parseFloat(camera.sensorHeight.toString()) : NaN;
    const sensorWidth = camera?.sensorWidth ? parseFloat(camera.sensorWidth.toString()) : NaN;
    // Handle potential focal length range for zoom lenses (use min for now? or requires context)
    const focalLengthValue = Array.isArray(lens?.focalLength) ? lens.focalLength[0] : lens?.focalLength;
    const focalLength = focalLengthValue ? parseFloat(focalLengthValue.toString()) : NaN;

    if (isNaN(sensorHeight) || isNaN(sensorWidth) || isNaN(focalLength) || focalLength <= 0) {
        // console.warn('[calculateFrustumDimensions] Invalid camera/lens parameters:', { sensorHeight, sensorWidth, focalLength });
        return null;
    }

    // Calculate Field of View (FOV) in radians
    const vfov = 2 * Math.atan(sensorHeight / (2 * focalLength));
    const hfov = 2 * Math.atan(sensorWidth / (2 * focalLength));

    // Calculate dimensions at the given distance
    const height = 2 * distance * Math.tan(vfov / 2);
    const width = 2 * distance * Math.tan(hfov / 2);

    return { width, height, vfov, hfov };
}
// --- End Placeholder ---

// Define an extended water material type to accommodate all properties
type ExtendedWaterMaterial = WaterMaterial & {
    frothFactor?: number;
    frothMaxDistance?: number;
    refractionStrength?: number;
    reflectionStrength?: number;
    hasAnimationStarted?: () => boolean;
    enableAnimation?: () => void;
};

// Define a type for reflection probe
interface ReflectionProbe {
    dispose(): void;
}

const BabylonViewer: React.FC = () => {
    const reactCanvas = useRef<Nullable<HTMLCanvasElement>>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { state: missionState, dispatch: missionDispatch } = useMission(); // Get dispatch from mission context
    const reduxDispatch = useAppDispatch(); // Get Redux dispatch
    const settings = useAppSelector((s: any) => s.scene.settings); // Type assertion to avoid unknown type error
    const [modelLoading, setModelLoading] = useState(false); // State for model loading
    const sceneRef = useRef<Scene | null>(null); // Ref to store the scene object
    const shadowGeneratorRef = useRef<ShadowGenerator | null>(null); // Ref for shadow generator
    const droneGroupRef = useRef<TransformNode | null>(null); // Ref for the drone + frustum group
    const frustumNodeRef = useRef<TransformNode | null>(null); // Ref for the frustum elements
    const groundMeshRef = useRef<Mesh | null>(null); // Ref for ground
    const gridMeshRef = useRef<Mesh | null>(null); // Ref for grid lines mesh
    const skyboxMeshRef = useRef<Mesh | null>(null); // Ref for skybox
    const waterMeshRef = useRef<Mesh | null>(null); // Ref for water plane
    const waterMaterialRef = useRef<WaterMaterial | null>(null); // Ref for water material
    const hdrTextureRef = useRef<HDRCubeTexture | null>(null);
    const renderingPipelineRef = useRef<DefaultRenderingPipeline | null>(null);
    const ssaoRef = useRef<SSAORenderingPipeline | null>(null);
    const reflectionProbeRef = useRef<ReflectionProbe | null>(null);
    const glowLayerRef = useRef<GlowLayer | null>(null);
    const ssrPipelineRef = useRef<SSRRenderingPipeline | null>(null);
    const iblShadowsPipelineRef = useRef<IblShadowsRenderPipeline | null>(null);

    // State for settings overlay visibility
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // New state for drone position control panel
    const [isDroneControlPanelOpen, setIsDroneControlPanelOpen] = useState(false);
    const [dronePosition, setDronePosition] = useState<LocalCoord>({ x: 0, y: 0, z: 0 });
    const [droneHeading, setDroneHeading] = useState(0);
    const [cameraFollowsDrone, setCameraFollowsDrone] = useState(true);
    const [gimbalPitch, setGimbalPitch] = useState(0);
    const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
    const [isRecording, setIsRecording] = useState(false);
    const [isCameraViewportVisible, setIsCameraViewportVisible] = useState(false);
    const [dofVisualizer, setDofVisualizer] = useState<DOFVisualizer | null>(null);
    // DOF visualization state
    const [showNearFocusPlane, setShowNearFocusPlane] = useState(true);
    const [showFarFocusPlane, setShowFarFocusPlane] = useState(false);
    const [showImageAreaAtFocus, setShowImageAreaAtFocus] = useState(true);
    const [showDOFLabels, setShowDOFLabels] = useState(true);
    // We'll get this from lens in hardware
    const [availableFStops, setAvailableFStops] = useState<number[]>([1.4, 2, 2.8, 4, 5.6, 8, 11, 16]);

    // Add new refs for frustum meshes after the existing refs
    const frustumLinesRef = useRef<Nullable<LinesMesh>>(null);
    const focusPlaneRef = useRef<Nullable<Mesh>>(null);
    const nearPlaneRef = useRef<Nullable<Mesh>>(null);
    const farPlaneRef = useRef<Nullable<Mesh>>(null);
    const lineMaterialRef = useRef<Nullable<StandardMaterial>>(null);
    const focusPlaneMaterialRef = useRef<Nullable<StandardMaterial>>(null);

    // --- Function to load drone model (using useCallback) ---
    const loadDroneModel = useCallback(async () => {
        const scene = sceneRef.current;
        const shadowGenerator = shadowGeneratorRef.current;
        if (!scene || !shadowGenerator || scene.getEngine().isDisposed) return;

        if (scene.getMeshByName('__root__')) {
             console.log('[BabylonViewer] Drone model already exists, skipping reload.');
             setModelLoading(false);
             return;
        }

        setModelLoading(true);
        try {
            console.log('[BabylonViewer] Loading drone model...');
            const result = await SceneLoader.ImportMeshAsync(null, "/models/", "scene.gltf", scene);

            if (result.meshes && result.meshes.length > 0) {
                // Create a parent TransformNode if it doesn't exist
                if (!droneGroupRef.current) {
                    droneGroupRef.current = new TransformNode('droneGroup', scene);
                }
                
                result.meshes.forEach(mesh => {
                    // Ensure all meshes have proper material settings
                    if (mesh.material) {
                        // Fix transparency issues
                        mesh.material.backFaceCulling = true;
                        mesh.material.needDepthPrePass = false;
                        
                        // Force materials to be opaque
                        mesh.material.alpha = 1.0;
                        mesh.material.transparencyMode = 0; // OPAQUE mode
                        
                        // Enhance material properties
                        if (mesh.material instanceof StandardMaterial) {
                            mesh.material.specularPower = 64; // More focused highlights
                            mesh.material.specularColor = new Color3(0.2, 0.2, 0.2); // Subtle specular
                        }
                    }
                    
                    // Make sure drone casts shadows
                    shadowGenerator.addShadowCaster(mesh, true);
                    mesh.receiveShadows = true;
                    
                    // Ensure mesh is visible and enabled
                    mesh.isVisible = true;
                    mesh.setEnabled(true);
                });
                
                // Set a consistent scale for the drone
                const rootMesh = result.meshes.find(m => m.name === '__root__');
                if (rootMesh) {
                    rootMesh.scaling = new Vector3(0.15, 0.15, 0.15);
                    rootMesh.parent = droneGroupRef.current;
                }
                
                console.log('[BabylonViewer] Drone model loaded successfully.');
            } else {
                 console.warn('[BabylonViewer] Drone model loaded but no meshes found.');
            }
        } catch (e) {
            console.error('[BabylonViewer] Failed to load drone model:', e);
            setError('Failed to load drone model. Check console.');
        } finally {
            setModelLoading(false);
        }
    }, []);

    // --- Function to handle scene setting changes ---
    const handleSceneSettingChange = useCallback(<K extends keyof SceneSettings>(setting: K, value: SceneSettings[K]) => {
        reduxDispatch(patchSceneSettings({ [setting]: value }));
    }, [reduxDispatch]);

    // --- New function to handle drone double-click ---
    const setupDroneInteraction = useCallback(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        // Set up pointer events on the scene
        scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOUBLETAP) {
                const pickedMesh = pointerInfo.pickInfo?.pickedMesh;
                
                // Check if the picked mesh is part of the drone model
                if (pickedMesh) {
                    // Check if the mesh or any of its parents is the drone root
                    let currentMesh: AbstractMesh | null = pickedMesh;
                    let isDroneClick = false;
                    
                    while (currentMesh) {
                        if (currentMesh.name === '__root__' || 
                            currentMesh.name.includes('drone') || 
                            (currentMesh.parent && currentMesh.parent.name === 'droneGroup')) {
                            isDroneClick = true;
                            break;
                        }
                        currentMesh = currentMesh.parent as AbstractMesh;
                    }
                    
                    if (isDroneClick) {
                        console.log('[BabylonViewer] Drone double-clicked');
                        
                        // Get current drone position in local ENU coordinates
                        if (droneGroupRef.current) {
                            const babylonPos = droneGroupRef.current.position;
                            // Create the localPos using the result of babylonToLocalENU as source
                            const coords = babylonToLocalENU(new Vector3(babylonPos.x, babylonPos.y, babylonPos.z));
                            const localPos: LocalCoord = {
                                x: coords.x,
                                y: coords.y,
                                z: coords.z
                            };
                            setDronePosition(localPos);
                            
                            // Set initial values for the control panel
                            setGimbalPitch(missionState.hardware?.gimbalPitch ?? 0);
                            setIsDroneControlPanelOpen(true);
                        }
                    }
                }
            }
        });
    }, [missionState.hardware?.gimbalPitch]);

    // Handler for position change from control panel
    const handleDronePositionChange = useCallback((newPosition: LocalCoord) => {
        if (droneGroupRef.current && sceneRef.current) {
            setDronePosition(newPosition);
            
            // Convert from local ENU to Babylon coordinates
            const babylonPos = localENUToBabylon(newPosition);
            droneGroupRef.current.position = new Vector3(babylonPos.x, babylonPos.y, babylonPos.z);
            
            // Update mission context if needed - use SET_TAKEOFF_POINT for drone position
            if (missionState.currentMission) {
                missionDispatch({ 
                    type: 'SET_TAKEOFF_POINT', 
                    payload: newPosition 
                });
            }
        }
    }, [missionDispatch, missionState.currentMission]);

    // Handler for heading change from control panel
    const handleHeadingChange = useCallback((newHeading: number) => {
        if (droneGroupRef.current && sceneRef.current) {
            setDroneHeading(newHeading);
            
            // Convert heading to radians and apply to drone group
            const headingRad = (newHeading * Math.PI) / 180;
            droneGroupRef.current.rotation = new Vector3(0, headingRad, 0);
            
            // Update mission context with the gimbal pitch value
            missionDispatch({ 
                type: 'UPDATE_HARDWARE_FIELD', 
                payload: { field: 'gimbalPitch', value: newHeading }
            });
        }
    }, [missionDispatch]);

    // Handler for camera follow change from control panel
    const handleCameraFollowChange = useCallback((follows: boolean) => {
        setCameraFollowsDrone(follows);
        // Implementation for camera follows drone will go in the render effect
    }, []);

    // Handler for gimbal pitch change from control panel
    const handleGimbalPitchChange = useCallback((pitch: number) => {
        setGimbalPitch(pitch);
        
        if (frustumNodeRef.current) {
            const gimbalRad = pitch * (Math.PI / 180);
            frustumNodeRef.current.rotation = new Vector3(gimbalRad, Math.PI, 0);
        }
        
        missionDispatch({ 
            type: 'UPDATE_HARDWARE_FIELD', 
            payload: { field: 'gimbalPitch', value: pitch }
        });
    }, [missionDispatch]);

    // Handler for camera mode change from control panel
    const handleCameraModeChange = useCallback((mode: 'photo' | 'video') => {
        setCameraMode(mode);
        // Additional implementation as needed
    }, []);

    // Handler for camera trigger from control panel
    const handleTriggerCamera = useCallback(() => {
        // Implementation for capturing photo
        console.log('[BabylonViewer] Camera trigger activated');
        // Add implementation for photo capture
    }, []);

    // Handler for recording toggle from control panel
    const handleToggleRecording = useCallback(() => {
        setIsRecording(prev => !prev);
        // Implementation for video recording
        console.log('[BabylonViewer] Recording toggle:', !isRecording);
        // Add implementation for recording
    }, [isRecording]);

    // Handler for camera viewport toggle from control panel
    const handleToggleCameraViewport = useCallback((visible: boolean) => {
        setIsCameraViewportVisible(visible);
        // Implementation for showing/hiding camera viewport
    }, []);

    // Handler for DOF plane visibility
    const handleToggleNearFocusPlane = useCallback((visible: boolean) => {
        setShowNearFocusPlane(visible);
        if (dofVisualizer) {
            dofVisualizer.configure({ showNearFocusPlane: visible });
        }
    }, [dofVisualizer]);

    const handleToggleFarFocusPlane = useCallback((visible: boolean) => {
        setShowFarFocusPlane(visible);
        if (dofVisualizer) {
            dofVisualizer.configure({ showFarFocusPlane: visible });
        }
    }, [dofVisualizer]);

    const handleToggleImageAreaAtFocus = useCallback((visible: boolean) => {
        setShowImageAreaAtFocus(visible);
        if (dofVisualizer) {
            dofVisualizer.configure({ showImageAreaAtFocus: visible });
        }
    }, [dofVisualizer]);

    const handleToggleDOFLabels = useCallback((visible: boolean) => {
        setShowDOFLabels(visible);
        if (dofVisualizer) {
            dofVisualizer.configure({ showLabels: visible });
        }
    }, [dofVisualizer]);

    // Handler for aperture change
    const handleApertureChange = useCallback((aperture: number) => {
        if (missionState.hardware) {
            missionDispatch({ 
                type: 'UPDATE_HARDWARE_FIELD', 
                payload: { field: 'fStop', value: aperture }
            });
        }
    }, [missionDispatch, missionState.hardware]);

    // Handler for focus distance change
    const handleFocusDistanceChange = useCallback((distance: number) => {
        if (missionState.hardware) {
            missionDispatch({ 
                type: 'UPDATE_HARDWARE_FIELD', 
                payload: { field: 'focusDistance', value: distance }
            });
        }
    }, [missionDispatch, missionState.hardware]);

    // Add this updateFrustumGeometry function before the Effect for Scene Setup
    const updateFrustumGeometry = useCallback(() => {
        // Skip if scene, frustum node, or required refs are not available
        const scene = sceneRef.current;
        const frustumNode = frustumNodeRef.current;
        if (!scene || !frustumNode) return;

        // --- Calculate Frustum Geometry ---
        const cameraDetails = missionState.hardware?.cameraDetails;
        const lensDetails = missionState.hardware?.lensDetails;
        const focusDistanceM = missionState.hardware?.focusDistance ?? 10;
        const nearDist = 0.1; 
        const farDist = Math.max(focusDistanceM * 1.5, 20); 
        const focusPlaneGeom = calculateFrustumDimensions(cameraDetails, lensDetails, focusDistanceM);
        const nearPlaneGeom = calculateFrustumDimensions(cameraDetails, lensDetails, nearDist);
        const farPlaneGeom = calculateFrustumDimensions(cameraDetails, lensDetails, farDist);

        if (focusPlaneGeom && nearPlaneGeom && farPlaneGeom) {
            // Create materials if they don't exist
            if (!lineMaterialRef.current) {
                const lineColor = new Color3(0.2, 0.8, 1.0); // Cyan
                const lineMaterial = new StandardMaterial("frustumLineMat", scene);
                lineMaterial.diffuseColor = lineColor;
                lineMaterial.emissiveColor = lineColor; 
                lineMaterial.alpha = 0.6; 
                lineMaterial.disableLighting = true; 
                lineMaterial.freeze();
                lineMaterialRef.current = lineMaterial;
            }

            if (!focusPlaneMaterialRef.current) {
                const focusPlaneColor = new Color3(0.1, 0.8, 0.1); // Green
                const focusPlaneMaterial = new StandardMaterial("focusPlaneMat", scene);
                focusPlaneMaterial.diffuseColor = focusPlaneColor;
                focusPlaneMaterial.alpha = 0.4; 
                focusPlaneMaterial.backFaceCulling = false; 
                focusPlaneMaterial.freeze();
                focusPlaneMaterialRef.current = focusPlaneMaterial;
            }

            // --- Calculate Corner Points ---
            const nearTL = new Vector3(-nearPlaneGeom.width / 2, nearPlaneGeom.height / 2, nearDist);
            const nearTR = new Vector3(nearPlaneGeom.width / 2, nearPlaneGeom.height / 2, nearDist);
            const nearBL = new Vector3(-nearPlaneGeom.width / 2, -nearPlaneGeom.height / 2, nearDist);
            const nearBR = new Vector3(nearPlaneGeom.width / 2, -nearPlaneGeom.height / 2, nearDist);
            const farTL = new Vector3(-farPlaneGeom.width / 2, farPlaneGeom.height / 2, farDist);
            const farTR = new Vector3(farPlaneGeom.width / 2, farPlaneGeom.height / 2, farDist);
            const farBL = new Vector3(-farPlaneGeom.width / 2, -farPlaneGeom.height / 2, farDist);
            const farBR = new Vector3(farPlaneGeom.width / 2, -farPlaneGeom.height / 2, farDist);

            // Define the lines
            const lines = [
                [nearTL, farTL], [nearTR, farTR], [nearBL, farBL], [nearBR, farBR], // Edges
                [nearTL, nearTR], [nearTR, nearBR], [nearBR, nearBL], [nearBL, nearTL], // Near plane rect
                [farTL, farTR], [farTR, farBR], [farBR, farBL], [farBL, farTL] // Far plane rect
            ];

            // Create or update the line system
            if (!frustumLinesRef.current) {
                // Create new line system
                const lineSystem = MeshBuilder.CreateLineSystem(
                    "frustumLines", 
                    { lines: lines, updatable: true }, 
                    scene
                );
                lineSystem.material = lineMaterialRef.current;
                lineSystem.parent = frustumNode;
                frustumLinesRef.current = lineSystem;
            } else {
                // Update existing line system
                const positions: number[] = [];
                const indices: number[] = [];
                
                // Fill positions and indices arrays from lines
                let index = 0;
                lines.forEach(line => {
                    positions.push(
                        line[0].x, line[0].y, line[0].z,
                        line[1].x, line[1].y, line[1].z
                    );
                    indices.push(index, index + 1);
                    index += 2;
                });
                
                // Create vertex data and apply to mesh
                const vertexData = new VertexData();
                vertexData.positions = positions;
                vertexData.indices = indices;
                vertexData.applyToMesh(frustumLinesRef.current as Mesh, true);
            }

            // Create or update focus plane
            if (!focusPlaneRef.current) {
                // Create new focus plane
                const focusPlane = MeshBuilder.CreatePlane(
                    "focusPlane", 
                    { width: 1, height: 1, updatable: true }, 
                    scene
                );
                focusPlane.material = focusPlaneMaterialRef.current;
                focusPlane.parent = frustumNode;
                focusPlaneRef.current = focusPlane;
            }
            
            // Update focus plane dimensions and position
            if (focusPlaneRef.current) {
                focusPlaneRef.current.scaling.x = focusPlaneGeom.width;
                focusPlaneRef.current.scaling.y = focusPlaneGeom.height;
                focusPlaneRef.current.position.z = focusDistanceM;
            }
        }
    }, [missionState.hardware]);

    // Move setupToneMapping to component level
    const setupToneMapping = useCallback(() => {
        if (!sceneRef.current) return;

        const scene = sceneRef.current;
        const camera = scene.activeCamera;
        const qualityLevel = settings?.qualityLevel || 'medium';

        // Dispose existing pipelines
        if (renderingPipelineRef.current) {
            (renderingPipelineRef.current as DefaultRenderingPipeline).dispose();
            renderingPipelineRef.current = null;
        }

        if (ssrPipelineRef.current) {
            (ssrPipelineRef.current as SSRRenderingPipeline).dispose();
            ssrPipelineRef.current = null;
        }

        if (iblShadowsPipelineRef.current) {
            (iblShadowsPipelineRef.current as IblShadowsRenderPipeline).dispose();
            iblShadowsPipelineRef.current = null;
        }

        // Create the default pipeline with tone mapping - adjusted based on quality
        if (qualityLevel === 'low' || qualityLevel === 'minimal') {
            // No post-processing for lower quality levels
            return;
        } else {
            // Medium to Ultra Quality
            const pipeline = new DefaultRenderingPipeline("default", true, scene, camera ? [camera] : undefined);
            
            // Tone mapping - adjust based on preference
            pipeline.imageProcessing.toneMappingEnabled = true;
            pipeline.imageProcessing.toneMappingType = 1; // ACES
            pipeline.imageProcessing.exposure = 1.0;
            pipeline.imageProcessing.contrast = 1.1;
            
            // Bloom - enable on high/ultra
            if (qualityLevel === 'high' || qualityLevel === 'ultra') {
                pipeline.bloomEnabled = true;
                pipeline.bloomThreshold = 0.8;
                pipeline.bloomWeight = 0.3;
                pipeline.bloomKernel = 64;
                pipeline.bloomScale = 0.5;
                
                // Depth of Field
                pipeline.depthOfFieldEnabled = false; // We'll handle DOF separately with the visualizer
            }
            
            // SSR - only on ultra quality
            if (qualityLevel === 'ultra' && camera) {
                try {
                    const ssr = new SSRRenderingPipeline("ssr", scene, [camera]);
                    ssr.step = 32;
                    ssr.reflectionSpecularFalloffExponent = 1;
                    ssr.strength = 0.5;
                    ssr.thickness = 0.5;
                    ssrPipelineRef.current = ssr;
                    
                    console.log("[BabylonViewer] SSR pipeline initialized");
                } catch (error) {
                    console.error("[BabylonViewer] Failed to initialize SSR pipeline:", error);
                }
            }
            
            renderingPipelineRef.current = pipeline;
            console.log(`[BabylonViewer] DefaultRenderingPipeline initialized at quality level: ${qualityLevel}`);
        }

        // Create IBL Shadows pipeline for enhanced shadow quality with environment lighting
        try {
            if (qualityLevel === 'ultra' && camera) {
                // Use a simple version compatible with the API
                const ibl = new IblShadowsRenderPipeline("ibl", scene);
                iblShadowsPipelineRef.current = ibl;
                console.log('[BabylonViewer] IBL Shadows pipeline initialized');
            }
        } catch (error) {
            console.error('[BabylonViewer] Error initializing IBL Shadows pipeline:', error);
        }
    }, [settings?.qualityLevel]);

    // --- Effect for Scene Setup ---
    useEffect(() => {
        if (!reactCanvas.current) {
            setError('Canvas element not available.');
            setLoading(false);
            return;
        }

        const canvas = reactCanvas.current;
        const engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            adaptToDeviceRatio: true,
        });

        const scene = new Scene(engine);
        sceneRef.current = scene;
        // Apply initial background color from context or default
        const initialBgColor = settings?.backgroundColor || '#222222';
        scene.clearColor = Color4.FromHexString(initialBgColor + 'FF'); // Add alpha

        // Setup Camera
        const camera = new ArcRotateCamera(
            'camera',
            -Math.PI / 2, // Initial horizontal rotation (alpha)
            Math.PI / 3,  // Initial vertical rotation (beta)
            50,           // Initial distance (radius)
            Vector3.Zero(), // Target point
            scene
        );
        camera.attachControl(canvas, true);
        camera.lowerRadiusLimit = 5;  // Prevent zooming too close
        camera.upperRadiusLimit = 1000; // Limit max zoom out
        camera.wheelPrecision = 50;

        // --- Setup HDR Environment and Tone Mapping ---
        const setupHDREnvironment = () => {
            // Clear any existing HDR environment
            if (hdrTextureRef.current) {
                hdrTextureRef.current.dispose();
                hdrTextureRef.current = null;
            }

            if (settings?.hdrEnabled && settings.hdrFilePath) {
                try {
                    // Create HDR environment texture with correct path
                    const hdrPath = settings.hdrFilePath.startsWith('/') ? 
                        settings.hdrFilePath.substring(1) : settings.hdrFilePath;
                    
                    console.log('[BabylonViewer] Loading HDR from path:', hdrPath);
                    
                    const hdrTexture = new HDRCubeTexture(
                        hdrPath,
                        scene,
                        512, // Size of the HDR texture (can be adjusted for performance)
                        false, // No prefiltered texture
                        true, // Generate mipmaps
                        false, // Not inverted
                        false // Do not update directly
                    );

                    // Set rotation
                    hdrTexture.rotationY = settings.hdrRotation || 0;

                    // Use the HDR texture as environment texture of the scene
                    scene.environmentTexture = hdrTexture;
                    
                    // Set the environment intensity
                    scene.environmentIntensity = settings.hdrIntensity || 1.0;

                    // Store the HDR texture for later disposal
                    hdrTextureRef.current = hdrTexture;

                    console.log('[BabylonViewer] HDR environment loaded:', settings.hdrFilePath);
                } catch (err) {
                    console.error('[BabylonViewer] Error loading HDR environment:', err);
                    // Fallback to default environment
                    scene.environmentTexture = null;
                    scene.environmentIntensity = settings.environmentIntensity || 1.0;
                }
            } else {
                // Use standard environment texture if HDR is disabled
                scene.environmentTexture = null;
                scene.environmentIntensity = settings.environmentIntensity || 1.0;
            }
        };

        // Set up tone mapping and post-processing
        // Call setupToneMapping function that is now defined at component level
        
        // --- Improved Environment Setup (Skybox) ---
        try {
            console.log('[BabylonViewer] Setting up port environment...');
            // Use an industrial/port skybox texture
            const skyboxTexturePath = "/textures/skybox/harbor";
            const skyboxTexture = new CubeTexture(skyboxTexturePath, scene);
            scene.environmentTexture = skyboxTexture;
            
            // Create a realistic outdoor skybox that matches a dock/harbor environment
            skyboxMeshRef.current = scene.createDefaultSkybox(skyboxTexture, true, 1500);
            
            // Adjust environment intensity for realistic lighting
            scene.environmentIntensity = 0.8; // Slightly dimmed for industrial feel
            
            console.log('[BabylonViewer] Harbor environment setup complete.');
        } catch (e) {
            console.error('[BabylonViewer] Failed to load skybox texture:', e);
            // Fall back to a procedural sky
            scene.clearColor = new Color4(0.4, 0.6, 0.9, 1); // Sky blue color
        }

        // --- Re-add Enhanced Lighting Setup for Dock Environment ---
        // Clear existing lights first to avoid duplicates if effect re-runs
        scene.lights.forEach(light => light.dispose());
        scene.lights = []; // Clear the array

        // Main directional sunlight (afternoon sun)
        const sunLight = new DirectionalLight('sunLight', new Vector3(-0.7, -0.8, -0.2).normalize(), scene);
        sunLight.position = new Vector3(50, 80, 30);
        sunLight.intensity = 1.3;
        sunLight.diffuse = new Color3(1, 0.95, 0.8); // Warm afternoon sun color
        sunLight.specular = new Color3(1, 0.98, 0.9);
        sunLight.shadowMinZ = 1;
        sunLight.shadowMaxZ = 300;

        // Ambient/Hemisphere light for overall scene illumination
        const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);
        ambientLight.intensity = 0.5;
        ambientLight.diffuse = new Color3(0.85, 0.9, 1.0); // Slight blue tint for sky reflection
        ambientLight.groundColor = new Color3(0.2, 0.2, 0.25); // Darker ground reflections
        ambientLight.specular = new Color3(0.2, 0.2, 0.3);

        // Fill light from water reflection
        const fillLight = new DirectionalLight('waterReflection', new Vector3(0.3, -0.2, 0.8).normalize(), scene);
        fillLight.position = new Vector3(-20, 10, -30);
        fillLight.intensity = 0.3;
        fillLight.diffuse = new Color3(0.6, 0.7, 0.8); // Bluish reflection from water
        fillLight.specular = new Color3(0.4, 0.5, 0.6);

        // Create Cascaded Shadow Generator for higher quality shadows
        if (sunLight) {
            // Use Cascaded Shadow Generator for better quality and performance
            const csg = new CascadedShadowGenerator(2048, sunLight);
            csg.lambda = 0.9; // Distribution between cascades
            csg.filter = ShadowGenerator.FILTER_PCF; // Use PCF filtering for softer shadows
            csg.shadowMaxZ = 200; // Far plane for last cascade
            csg.frustumEdgeFalloff = 0.1; // Soften edges
            csg.usePercentageCloserFiltering = true; // Enable PCF 
            csg.stabilizeCascades = true; // Reduce shadow flickering
            csg.darkness = 0.3; // Shadow darkness

            // Store the shadow generator in the ref for later use
            shadowGeneratorRef.current = csg;
            
            console.log('[BabylonViewer] Cascaded shadow generator created.');
        } else {
            console.warn("[BabylonViewer] Sun light not available for shadow generator.");
            shadowGeneratorRef.current = null; // Ensure ref is null if no generator
        }

        // --- Ground Setup (Needed for water reflections/refractions) ---
        groundMeshRef.current = MeshBuilder.CreateGround('ground', { width: 500, height: 500 }, scene);
        const groundMaterial = new StandardMaterial('groundMat', scene);
        groundMaterial.diffuseColor = new Color3(0.2, 0.25, 0.3);
        groundMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
        groundMaterial.specularPower = 32;
        groundMaterial.alpha = 1.0; // Ensure ground is opaque
        groundMeshRef.current.material = groundMaterial;
        groundMeshRef.current.receiveShadows = true;
        // Hide ground initially, will be shown if water is disabled
        groundMeshRef.current.setEnabled(false);

        // --- Axes Helper ---
        new AxesViewer(scene, 5);

        // --- Initial Model Load (Drone) ---
        loadDroneModel();

        // --- Set up Drone Interaction ---
        setupDroneInteraction();

        // --- Render Loop ---
        engine.runRenderLoop(() => {
            if (!scene.isDisposed) {
                scene.render();
            }
        });

        // --- Handle Resize ---
        const resizeHandler = () => {
            engine.resize();
        };
        window.addEventListener('resize', resizeHandler);

        setLoading(false);

        // --- Cleanup ---
        return () => {
            console.log('[BabylonViewer] Cleaning up scene...');
            if (droneGroupRef.current) droneGroupRef.current.dispose();
            if (frustumNodeRef.current) frustumNodeRef.current.dispose();
            if (waterMaterialRef.current) waterMaterialRef.current.dispose();
            
            // Dispose of frustum meshes
            if (frustumLinesRef.current) frustumLinesRef.current.dispose();
            if (focusPlaneRef.current) focusPlaneRef.current.dispose();
            if (nearPlaneRef.current) nearPlaneRef.current.dispose();
            if (farPlaneRef.current) farPlaneRef.current.dispose();
            if (lineMaterialRef.current) lineMaterialRef.current.dispose();
            if (focusPlaneMaterialRef.current) focusPlaneMaterialRef.current.dispose();
            
            // Clean up HDR and post-processing
            if (hdrTextureRef.current) {
                hdrTextureRef.current.dispose();
            }
            
            // Clean up environment
            if (renderingPipelineRef.current) {
                (renderingPipelineRef.current as DefaultRenderingPipeline).dispose();
                renderingPipelineRef.current = null;
            }
            if (ssrPipelineRef.current) {
                (ssrPipelineRef.current as SSRRenderingPipeline).dispose();
                ssrPipelineRef.current = null;
            }
            if (iblShadowsPipelineRef.current) {
                (iblShadowsPipelineRef.current as IblShadowsRenderPipeline).dispose();
                iblShadowsPipelineRef.current = null;
            }
            if (sceneRef.current) {
                sceneRef.current.environmentTexture = null;
                sceneRef.current.environmentIntensity = 1.0;
                sceneRef.current.dispose();
            }
            
            if (engine) {
                engine.dispose();
            }
            
            // Disconnect observer
            resizeHandler();
        };

        // Call HDR and tone mapping setup
        setupHDREnvironment();
        setupToneMapping();

        // Update frustum geometry
        updateFrustumGeometry();

        // Create a resize observer for handling canvas resizing
        const observer = new ResizeObserver(() => {
            if (engine) {
                engine.resize();
            }
        });
        
        if (canvas) {
            observer.observe(canvas);
        }

    }, [loadDroneModel, settings?.backgroundColor, setupDroneInteraction, setupToneMapping, updateFrustumGeometry]);

    // --- Effect for Rendering/Updating Mission Data & Applying Scene Settings ---
    useEffect(() => {
        const scene = sceneRef.current;
        const shadowGenerator = shadowGeneratorRef.current;
        if (!scene || !shadowGenerator || scene.isDisposed) {
            return; 
        }

        if (settings) {
            // Background Color
            scene.clearColor = Color4.FromHexString(settings.backgroundColor + 'FF');
            
            // Environment Intensity
            scene.environmentIntensity = settings.environmentIntensity ?? 1.0;

            // Skybox Visibility - ensure it's set according to Redux state
            if (skyboxMeshRef.current) {
                skyboxMeshRef.current.setEnabled(settings.skyEnabled ?? true);
            }
            
            // Grid Visibility & Creation/Disposal
            if (settings.gridVisible) {
                if (!gridMeshRef.current || gridMeshRef.current.isDisposed()) {
                    // Create grid if it doesn't exist
                    console.log("[BabylonViewer] Creating grid...");
                    const gridMaterial = new StandardMaterial("gridMat", scene);
                    gridMaterial.diffuseColor = Color3.FromHexString(settings.gridColorGrid || '#FFFFFF');
                    gridMaterial.wireframe = true;
                    gridMaterial.alpha = 0.3;
                    gridMaterial.backFaceCulling = false;
                    gridMaterial.freeze();

                    gridMeshRef.current = MeshBuilder.CreateGround("sceneGrid", { 
                        width: settings.gridSize || 200, 
                        height: settings.gridSize || 200,
                        subdivisions: settings.gridDivisions || 10
                    }, scene);
                    gridMeshRef.current.material = gridMaterial;
                    gridMeshRef.current.position.y = 0.01; // Slightly above ground
                    gridMeshRef.current.isPickable = false;
                } else {
                     // Ensure grid is enabled if it exists
                     gridMeshRef.current.setEnabled(true);
                }
            } else {
                // If grid should not be visible, disable or dispose it
                if (gridMeshRef.current && !gridMeshRef.current.isDisposed()) {
                    console.log("[BabylonViewer] Disabling grid...");
                    gridMeshRef.current.setEnabled(false);
                }
            }

            // --- Water Material Configuration for Harbor Waters ---
            // Check if water is enabled in settings
            if (settings?.waterEnabled) {
                if (!waterMaterialRef.current) {
                    console.log("[BabylonViewer] Creating harbor water material...");
                    try {
                        waterMaterialRef.current = new WaterMaterial("harborWater", scene, new Vector2(1024, 1024));
                        
                        // Harbor water settings - murkier and less transparent
                        waterMaterialRef.current.backFaceCulling = true;
                        waterMaterialRef.current.alpha = 0.95; // Less transparent
                        
                        // Smaller waves for calmer harbor waters
                        waterMaterialRef.current.waveLength = 0.15;
                        waterMaterialRef.current.waveHeight = 0.15;
                        waterMaterialRef.current.waveSpeed = 0.3;
                        
                        // Murky blue-green harbor water color
                        waterMaterialRef.current.waterColor = new Color3(0.12, 0.27, 0.35);
                        waterMaterialRef.current.colorBlendFactor = 0.5; // More water color, less reflection
                        
                        // Create a noise texture for subtle wave patterns
                        try {
                            const noiseTexture = new NoiseProceduralTexture("harborWaterNoise", 512, scene);
                            noiseTexture.animationSpeedFactor = 0.03; // Slower animation for calm harbor
                            noiseTexture.persistence = 0.9;
                            noiseTexture.brightness = 0.4;
                            noiseTexture.octaves = 4;
                            
                            waterMaterialRef.current.bumpTexture = noiseTexture;
                            waterMaterialRef.current.bumpHeight = 0.7; // Subtle bump
                        } catch (err: unknown) {
                            const errorMessage = err instanceof Error ? err.message : "Unknown error";
                            console.log("[BabylonViewer] Using default water bump texture:", errorMessage);
                        }
                        
                        // Add reflections from scene objects
                        if (skyboxMeshRef.current) {
                            waterMaterialRef.current.addToRenderList(skyboxMeshRef.current);
                        }
                        
                        // Get all scene meshes for rendering in water reflections/refractions
                        scene.meshes.forEach(mesh => {
                            // Only add drone and potentially other non-dock elements
                            if (mesh.name !== "waterMesh" && 
                                !mesh.name.includes("water") &&
                                !mesh.name.includes("Dock") && 
                                !mesh.name.includes("container") &&
                                !mesh.name.includes("pillar") &&
                                !mesh.name.includes("crane") &&
                                !mesh.name.includes("Background") && 
                                mesh.isVisible && 
                                mesh.isEnabled()) {
                                waterMaterialRef.current?.addToRenderList(mesh);
                            }
                        });
                        
                        // Subtle wind for harbor waters
                        scene.onBeforeRenderObservable.add(() => {
                            const time = Date.now() * 0.00005; // Very slow wind changes
                            if (waterMaterialRef.current) {
                                waterMaterialRef.current.windDirection = new Vector2(
                                    Math.sin(time) * 0.3 + 0.7, // Predominantly from one direction
                                    Math.cos(time * 0.5) * 0.1 + 0.9
                                );
                            }
                        });
                        
                        // Water specular setup for realistic sun reflections
                        waterMaterialRef.current.specularColor = new Color3(0.9, 0.9, 0.9);
                        waterMaterialRef.current.specularPower = 512; // Sharper specular for realistic sun reflection
                        
                        const extendedMaterial = waterMaterialRef.current as ExtendedWaterMaterial;
                        if (extendedMaterial.refractionStrength !== undefined) {
                            extendedMaterial.refractionStrength = 0.3; // Reduced refraction for murky water
                        }
                        if (extendedMaterial.reflectionStrength !== undefined) {
                            extendedMaterial.reflectionStrength = 0.6; // Moderate reflections
                        }
                        
                    } catch (e) {
                        console.error("[BabylonViewer] Error creating harbor water:", e);
                        waterMaterialRef.current = null;
                    }
                }
                
                // Create water plane for harbor
                if (!waterMeshRef.current || waterMeshRef.current.isDisposed()) {
                    const waterSize = settings.gridSize || 200;
                    waterMeshRef.current = MeshBuilder.CreateGround("waterMesh", { 
                        width: waterSize * 4,  // Extended water for harbor view
                        height: waterSize * 4, 
                        subdivisions: 120      // Detailed enough for harbor waves
                    }, scene);
                    
                    waterMeshRef.current.position.y = 0;
                    waterMeshRef.current.receiveShadows = true;
                    waterMeshRef.current.isPickable = false;
                }
                
                // Apply material to water
                if (waterMaterialRef.current && waterMeshRef.current) {
                    waterMeshRef.current.material = waterMaterialRef.current;
                    waterMeshRef.current.setEnabled(true);
                    
                    // Update render targets frequently for smooth reflections
                    if (waterMaterialRef.current.reflectionTexture) {
                        waterMaterialRef.current.reflectionTexture.refreshRate = 1;
                    }
                    if (waterMaterialRef.current.refractionTexture) {
                        waterMaterialRef.current.refractionTexture.refreshRate = 1;
                    }
                }
                
                // Hide original ground when water is enabled
                if (groundMeshRef.current) {
                    groundMeshRef.current.setEnabled(false);
                }
            } else {
                // Clean up if water is disabled
                if (waterMeshRef.current && !waterMeshRef.current.isDisposed()) {
                    waterMeshRef.current.setEnabled(false);
                    waterMeshRef.current.dispose();
                    waterMeshRef.current = null;
                }
                
                if (waterMaterialRef.current) {
                    scene.onBeforeRenderObservable.clear(); // Remove any animation observers
                    const renderList = waterMaterialRef.current.getRenderList();
                    if (renderList) {
                        for (const mesh of renderList) {
                            waterMaterialRef.current.removeFromRenderList(mesh);
                        }
                    }
                    waterMaterialRef.current.dispose();
                    waterMaterialRef.current = null;
                }
                
                // Show ground if water is disabled
                if (groundMeshRef.current) {
                    groundMeshRef.current.setEnabled(true);
                }
            }

            // Setup HDR Environment and Tone Mapping if there's a scene
            if (scene) {
                // Find the functions in the current scope
                const setupHDREnvironment = () => {
                    // Clear any existing HDR environment
                    if (hdrTextureRef.current) {
                        hdrTextureRef.current.dispose();
                        hdrTextureRef.current = null;
                    }

                    if (settings?.hdrEnabled && settings.hdrFilePath) {
                        try {
                            // Create HDR environment texture with correct path
                            const hdrPath = settings.hdrFilePath.startsWith('/') ? 
                                settings.hdrFilePath.substring(1) : settings.hdrFilePath;
                            
                            console.log('[BabylonViewer] Loading HDR from path:', hdrPath);
                            
                            const hdrTexture = new HDRCubeTexture(
                                hdrPath,
                                scene,
                                512, // Size of the HDR texture
                                false, // No prefiltered texture
                                true, // Generate mipmaps
                                false, // Not inverted
                                false // Do not update directly
                            );

                            // Set rotation
                            hdrTexture.rotationY = settings.hdrRotation || 0;

                            // Use the HDR texture as environment texture of the scene
                            scene.environmentTexture = hdrTexture;
                            
                            // Set the environment intensity
                            scene.environmentIntensity = settings.hdrIntensity || 1.0;

                            // Store the HDR texture for later disposal
                            hdrTextureRef.current = hdrTexture;

                            console.log('[BabylonViewer] HDR environment loaded:', settings.hdrFilePath);
                        } catch (err) {
                            console.error('[BabylonViewer] Error loading HDR environment:', err);
                            // Fallback to default environment
                            scene.environmentTexture = null;
                            scene.environmentIntensity = settings.environmentIntensity || 1.0;
                        }
                    } else {
                        // Use standard environment texture if HDR is disabled
                        scene.environmentTexture = null;
                        scene.environmentIntensity = settings.environmentIntensity || 1.0;
                    }
                };

                const setupToneMapping = () => {
                    // Dispose existing pipelines if they exist
                    if (renderingPipelineRef.current) {
                        (renderingPipelineRef.current as DefaultRenderingPipeline).dispose();
                        renderingPipelineRef.current = null;
                    }
                    
                    if (ssrPipelineRef.current) {
                        (ssrPipelineRef.current as SSRRenderingPipeline).dispose();
                        ssrPipelineRef.current = null;
                    }
                    
                    if (iblShadowsPipelineRef.current) {
                        (iblShadowsPipelineRef.current as IblShadowsRenderPipeline).dispose();
                        iblShadowsPipelineRef.current = null;
                    }

                    if (settings?.toneMapping) {
                        // Create default rendering pipeline
                        const pipeline = new DefaultRenderingPipeline(
                            "toneMappingPipeline", 
                            true, // HDR support
                            scene, 
                            [scene.activeCamera as ArcRotateCamera] // Cameras to apply the pipeline to
                        );

                        // Enable tone mapping
                        pipeline.imageProcessing.toneMappingEnabled = true;

                        // Set tone mapping type based on settings
                        switch (settings.toneMappingType) {
                            case 'ACES':
                                pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
                                break;
                            case 'Reinhard':
                                pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_STANDARD;
                                break;
                            case 'Cineon':
                                pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
                                break;
                            case 'Hejl-Dawson':
                                // Standard fallback since HEJLDAWSON is not available
                                pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_STANDARD;
                                break;
                            default:
                                pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
                        }

                        // Set exposure and contrast
                        pipeline.imageProcessing.exposure = settings.exposure || 1.4;
                        pipeline.imageProcessing.contrast = settings.contrast || 1.1;

                        // Enable bloom if available in settings
                        if (settings.bloomEnabled) {
                            pipeline.bloomEnabled = true;
                            pipeline.bloomThreshold = settings.bloomThreshold || 0.8;
                            pipeline.bloomWeight = settings.bloomIntensity || 0.5;
                            pipeline.bloomKernel = settings.bloomKernel || 64;
                            pipeline.bloomScale = settings.bloomScale || 0.5;
                        } else {
                            pipeline.bloomEnabled = false;
                        }

                        renderingPipelineRef.current = pipeline;
                        
                        // Add SSR (Screen Space Reflections) if enabled and high quality
                        if (settings.qualityLevel === 'high' || settings.qualityLevel === 'ultra') {
                            try {
                                // Create SSR pipeline for enhanced reflections
                                const ssr = new SSRRenderingPipeline("ssr", scene, [scene.activeCamera as ArcRotateCamera]);
                                ssr.step = 0.02; // Default is 0.01, higher is better performance
                                ssr.maxSteps = 128; // Default is 1000, lower is better performance
                                ssr.maxDistance = 100; // Maximum distance for reflections
                                ssr.strength = 0.8; // Default is 1
                                ssrPipelineRef.current = ssr;
                                
                                // Create IBL Shadows pipeline for enhanced shadow quality with environment lighting
                                const ibl = new IblShadowsRenderPipeline("ibl", scene);
                                iblShadowsPipelineRef.current = ibl;
                                
                                console.log('[BabylonViewer] Advanced rendering pipelines initialized');
                            } catch (error) {
                                console.error('[BabylonViewer] Error initializing advanced rendering pipelines:', error);
                            }
                        }
                        
                        console.log('[BabylonViewer] Tone mapping setup complete');
                    } else {
                        // Clean up if tone mapping is disabled
                        if (renderingPipelineRef.current) {
                            (renderingPipelineRef.current as DefaultRenderingPipeline).dispose();
                            renderingPipelineRef.current = null;
                        }
                        
                        if (ssrPipelineRef.current) {
                            (ssrPipelineRef.current as SSRRenderingPipeline).dispose();
                            ssrPipelineRef.current = null;
                        }
                        
                        if (iblShadowsPipelineRef.current) {
                            (iblShadowsPipelineRef.current as IblShadowsRenderPipeline).dispose();
                            iblShadowsPipelineRef.current = null;
                        }
                    }
                };

                // Call the functions to apply changes when settings update
                setupHDREnvironment();
                setupToneMapping();
            }
            
            // Update water if settings change
            if (waterMaterialRef.current) {
                // (existing water update code)
            }

            // Handle shadow toggling in the scene settings update useEffect
            if (settings?.shadowsEnabled !== undefined) {
                if (shadowGeneratorRef.current) {
                    const map = (shadowGeneratorRef.current as ShadowGenerator | CascadedShadowGenerator).getShadowMap();
                    if (map) {
                        const scene = map.getScene();
                        if (scene) {
                            scene.shadowsEnabled = settings.shadowsEnabled;
                        }
                    }
                    
                    if (settings.shadowsEnabled) {
                        // Update shadow quality if needed
                        if (settings.shadowQuality === 'high' && shadowGeneratorRef.current instanceof CascadedShadowGenerator) {
                            shadowGeneratorRef.current.filteringQuality = ShadowGenerator.QUALITY_HIGH;
                            shadowGeneratorRef.current.frustumEdgeFalloff = 0.05; // Sharper edges
                        } else if (settings.shadowQuality === 'medium' && shadowGeneratorRef.current instanceof CascadedShadowGenerator) {
                            shadowGeneratorRef.current.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
                            shadowGeneratorRef.current.frustumEdgeFalloff = 0.1; // Medium edges
                        } else if (shadowGeneratorRef.current instanceof CascadedShadowGenerator) {
                            shadowGeneratorRef.current.filteringQuality = ShadowGenerator.QUALITY_LOW;
                            shadowGeneratorRef.current.frustumEdgeFalloff = 0.2; // Softer edges
                        }
                    }

                    console.log(`[BabylonViewer] Shadows ${settings.shadowsEnabled ? 'enabled' : 'disabled'}.`);
                }
            }
        }

        // --- Get Data from Context ---
        const currentMission = missionState.currentMission;
        const hardware = missionState.hardware;
        const cameraDetails = hardware?.cameraDetails;
        const lensDetails = hardware?.lensDetails;
        const focusDistanceM = hardware?.focusDistance ?? 10;
        // Use gimbal pitch from state
        const currentGimbalPitch = gimbalPitch !== undefined ? gimbalPitch : (hardware?.gimbalPitch ?? 0);

        // --- Create or Get Drone Group Node ---
        if (!droneGroupRef.current || droneGroupRef.current.isDisposed()) {
            droneGroupRef.current = new TransformNode('droneGroup', scene);
        } 
        const droneGroup = droneGroupRef.current;
        
        // Position Group Node based on mission or default
        let droneGroupPosition = new Vector3(0, feetToMeters(20), 0); // Default position
        if (currentMission) {
            const droneENUPosition = currentMission.takeoffPoint ?? { x: 0, y: 0, z: feetToMeters(20) };
            droneGroupPosition = localENUToBabylon(droneENUPosition);
        }
        droneGroup.position = droneGroupPosition;

        // Apply drone heading
        const headingRad = (droneHeading * Math.PI) / 180;
        droneGroup.rotation = new Vector3(0, headingRad, 0); // Apply heading to the group

        // --- Parent Drone Model to Group (if model exists) ---
        const droneRoot = scene.getMeshByName('__root__');
        if (droneRoot && droneRoot.parent !== droneGroup) {
            droneRoot.parent = droneGroup;
            droneRoot.position = Vector3.Zero(); // Position relative to parent
            // Reset model's local rotation as per user request
            droneRoot.rotation = Vector3.Zero(); 
            droneRoot.scaling = new Vector3(0.15, 0.15, 0.15);
        }

        // --- Create or Get Frustum Node ---
        if (!frustumNodeRef.current || frustumNodeRef.current.isDisposed()) {
            frustumNodeRef.current = new TransformNode("frustumNode", scene);
            frustumNodeRef.current.parent = droneGroup; 
            frustumNodeRef.current.position = new Vector3(0, -0.41, 0); // Local offset from drone center
        } 
        const frustumNode = frustumNodeRef.current;

        // Apply gimbal pitch and 180-degree Y-axis rotation for alignment
        const gimbalRad = currentGimbalPitch * (Math.PI / 180);
        frustumNode.rotation = new Vector3(gimbalRad, Math.PI, 0); // Rotate around X-axis for pitch and Y-axis for alignment

        // --- Update Frustum Meshes ---
        updateFrustumGeometry();

        // Add drone meshes to water reflection AFTER group is positioned and exists
        if (waterMaterialRef.current && droneGroup) {
            const droneMeshes = droneGroup.getChildMeshes(false) as AbstractMesh[];
            const renderList = waterMaterialRef.current.getRenderList() || [];
            droneMeshes.forEach(mesh => {
                if (!renderList.includes(mesh)) {
                    waterMaterialRef.current?.addToRenderList(mesh);
                }
            });
        }

        // --- Render Waypoints ---
        if (currentMission) {
            const waypointMaterial = scene.getMaterialByName("waypointMat") as StandardMaterial || new StandardMaterial("waypointMat", scene);
            waypointMaterial.diffuseColor = new Color3(0.2, 0.6, 1); 
            waypointMaterial.alpha = 0.8; 

            // Clear previous waypoints 
            scene.meshes.forEach(mesh => {
                if (mesh.name.startsWith('waypointMarker_')) {
                    mesh.dispose();
                }
            });

            currentMission.pathSegments.forEach(segment => {
                segment.waypoints.forEach((waypoint: Waypoint, index: number) => {
                    if (waypoint.local) {
                        const waypointBabylonPosition = localENUToBabylon(waypoint.local);
                        const waypointMarker = MeshBuilder.CreateSphere(`waypointMarker_${segment.id}_${index}`, { diameter: 0.5 }, scene);
                        waypointMarker.position = waypointBabylonPosition;
                        waypointMarker.material = waypointMaterial;
                        waypointMarker.receiveShadows = true;
                        if (shadowGeneratorRef.current) {
                             shadowGeneratorRef.current.addShadowCaster(waypointMarker);
                        }
                    } else {
                         // console.warn(`[BabylonViewer] Waypoint ${segment.id}-${index} is missing local coordinates.`);
                    }
                });
            });
        }

        // Handle camera following drone if enabled
        if (cameraFollowsDrone && droneGroupRef.current && scene.activeCamera) {
            const camera = scene.activeCamera as ArcRotateCamera;
            const dronePos = droneGroupRef.current.position;
            
            camera.setTarget(dronePos);
        }

    }, [
        missionState.currentMission, 
        missionState.hardware, 
        settings, 
        modelLoading, 
        loadDroneModel,
        gimbalPitch,
        cameraFollowsDrone,
        droneHeading
    ]);

    // --- DOF Visualization Setup ---
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !frustumNodeRef.current) return;
        
        // Import the DOFVisualizer class and create if needed
        import('./DOFVisualizer').then(({ DOFVisualizer }) => {
            if (!dofVisualizer) {
                const newVisualizer = new DOFVisualizer(scene, frustumNodeRef.current!);
                setDofVisualizer(newVisualizer);
                
                // Configure initial state
                newVisualizer.configure({
                    showNearFocusPlane,
                    showFarFocusPlane,
                    showImageAreaAtFocus,
                    showLabels: showDOFLabels
                });
            }
        }).catch(error => {
            console.error('Error importing DOFVisualizer:', error);
        });
        
        // Cleanup when component unmounts
        return () => {
            if (dofVisualizer) {
                dofVisualizer.dispose();
            }
        };
    }, [dofVisualizer, showNearFocusPlane, showFarFocusPlane, 
        showImageAreaAtFocus, showDOFLabels]);

    // Update DOF Visualization when hardware changes
    useEffect(() => {
        if (!dofVisualizer) return;
        
        const hardware = missionState.hardware;
        const cameraDetails = hardware?.cameraDetails;
        const lensDetails = hardware?.lensDetails;
        const focusDistance = hardware?.focusDistance;
        const fStop = hardware?.fStop;
        
        if (cameraDetails && lensDetails && focusDistance && fStop) {
            // Update available f-stops from lens if present
            if (lensDetails && (lensDetails as any).aperture && Array.isArray((lensDetails as any).aperture)) {
                setAvailableFStops((lensDetails as any).aperture);
            }
            
            // Update the DOF visualization
            dofVisualizer.update(focusDistance, cameraDetails, lensDetails, fStop);
        }
    }, [dofVisualizer, missionState.hardware]);

    // Add debug layer activation
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;
        
        // Add keyboard listener for debug layer
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'i') {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Explicitly return JSX for React.FC compatibility
    return (
        <Box sx={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden',
            zIndex: 1 // Adjusted zIndex
        }}>
            {(loading || modelLoading) && ( // Show loading if either viewer or model is loading
                <Box sx={styles.loadingOverlay}>
                    <CircularProgress />
                    <Typography sx={{ mt: 1, color: 'white' }}>
                        {loading ? 'Initializing 3D Viewer...' : 'Loading Drone Model...'}
                    </Typography>
                </Box>
            )}
            {error && (
                <Box sx={styles.errorOverlay}>
                    <Typography color="error">Error: {error}</Typography>
                </Box>
            )}
            <IconButton 
                sx={styles.settingsButton}
                onClick={() => setIsSettingsOpen(true)}
                size="small"
                title="Viewer Settings"
            >
                <SettingsIcon fontSize="small" />
            </IconButton>
            <canvas
                ref={reactCanvas}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    outline: 'none',
                    // No absolute positioning to avoid covering the SubNavigation
                }}
                touch-action="none" // Recommended for pointer events
            />
            {/* UI Overlays can be added here later */}
            {settings && (
                <ViewerSettingsOverlayFixed
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    settings={settings}
                    onChange={handleSceneSettingChange}
                />
            )}
            
            {/* Drone Position Control Panel */}
            <DronePositionControlPanel
                isOpen={isDroneControlPanelOpen}
                onClose={() => setIsDroneControlPanelOpen(false)}
                initialPosition={dronePosition}
                onPositionChange={handleDronePositionChange}
                initialHeading={droneHeading}
                onHeadingChange={handleHeadingChange}
                initialCameraFollow={cameraFollowsDrone}
                onCameraFollowChange={handleCameraFollowChange}
                gimbalPitch={gimbalPitch}
                onGimbalPitchChange={handleGimbalPitchChange}
                cameraMode={cameraMode}
                onCameraModeChange={handleCameraModeChange}
                isRecording={isRecording}
                onTriggerCamera={handleTriggerCamera}
                onToggleRecording={handleToggleRecording}
                isCameraViewportVisible={isCameraViewportVisible}
                onToggleCameraViewport={handleToggleCameraViewport}
                showNearFocusPlane={showNearFocusPlane}
                onToggleNearFocusPlane={handleToggleNearFocusPlane}
                showFarFocusPlane={showFarFocusPlane}
                onToggleFarFocusPlane={handleToggleFarFocusPlane}
                showImageAreaAtFocus={showImageAreaAtFocus}
                onToggleImageAreaAtFocus={handleToggleImageAreaAtFocus}
                showDOFLabels={showDOFLabels}
                onToggleDOFLabels={handleToggleDOFLabels}
                aperture={missionState.hardware?.fStop || 2.8}
                onApertureChange={handleApertureChange}
                availableFStops={availableFStops}
                focusDistance={missionState.hardware?.focusDistance || 10}
                onFocusDistanceChange={handleFocusDistanceChange}
                dofInfo={dofVisualizer ? 
                    dofVisualizer.calculateDOF(
                        missionState.hardware?.focusDistance || 10, 
                        missionState.hardware?.cameraDetails, 
                        missionState.hardware?.lensDetails, 
                        parseFloat(missionState.hardware?.fStop?.toString() || "2.8")
                    ) : 
                    { nearFocusDistanceM: 8, farFocusDistanceM: 12, totalDepthM: 4 }
                }
            />
        </Box>
    );
};

export default BabylonViewer; 