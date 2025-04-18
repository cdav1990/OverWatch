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
    DirectionalLight
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
import ViewerSettingsOverlay from './ViewerSettingsOverlay'; // Import the overlay component
import DronePositionControlPanel from '../DronePositionControlPanel/DronePositionControlPanelWithDOF'; // Import the control panel
import SettingsIcon from '@mui/icons-material/Settings'; // Gear Icon

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

const BabylonViewer: React.FC = () => {
    const reactCanvas = useRef<Nullable<HTMLCanvasElement>>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { state: missionState, dispatch } = useMission(); // Get dispatch
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
    const [dofVisualizer, setDofVisualizer] = useState<any>(null);
    // DOF visualization state
    const [showNearFocusPlane, setShowNearFocusPlane] = useState(true);
    const [showFarFocusPlane, setShowFarFocusPlane] = useState(false);
    const [showImageAreaAtFocus, setShowImageAreaAtFocus] = useState(true);
    const [showDOFLabels, setShowDOFLabels] = useState(true);
    // We'll get this from lens in hardware
    const [availableFStops, setAvailableFStops] = useState<number[]>([1.4, 2, 2.8, 4, 5.6, 8, 11, 16]);

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
        dispatch({ type: 'UPDATE_SCENE_SETTINGS', payload: { [setting]: value } });
    }, [dispatch]);

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
                dispatch({ 
                    type: 'SET_TAKEOFF_POINT', 
                    payload: newPosition 
                });
            }
        }
    }, [dispatch, missionState.currentMission]);

    // Handler for heading change from control panel
    const handleHeadingChange = useCallback((newHeading: number) => {
        if (droneGroupRef.current && sceneRef.current) {
            setDroneHeading(newHeading);
            
            // Convert heading to radians and apply to drone group
            const headingRad = (newHeading * Math.PI) / 180;
            droneGroupRef.current.rotation = new Vector3(0, headingRad, 0);
            
            // Update mission context with the gimbal pitch value
            dispatch({ 
                type: 'UPDATE_HARDWARE_FIELD', 
                payload: { field: 'gimbalPitch', value: newHeading }
            });
        }
    }, [dispatch]);

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
        
        dispatch({ 
            type: 'UPDATE_HARDWARE_FIELD', 
            payload: { field: 'gimbalPitch', value: pitch }
        });
    }, [dispatch]);

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
            dispatch({ 
                type: 'UPDATE_HARDWARE_FIELD', 
                payload: { field: 'fStop', value: aperture }
            });
        }
    }, [dispatch, missionState.hardware]);

    // Handler for focus distance change
    const handleFocusDistanceChange = useCallback((distance: number) => {
        if (missionState.hardware) {
            dispatch({ 
                type: 'UPDATE_HARDWARE_FIELD', 
                payload: { field: 'focusDistance', value: distance }
            });
        }
    }, [dispatch, missionState.hardware]);

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
        const initialBgColor = missionState.sceneSettings?.backgroundColor || '#222222';
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
        camera.wheelPrecision = 50; // Adjust zoom sensitivity

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

        // Shadow Generator with improved settings
        // Check if sunlight exists before creating shadow generator
        if (sunLight) {
            const shadowGenerator = new ShadowGenerator(2048, sunLight);
            shadowGenerator.useExponentialShadowMap = true;
            shadowGenerator.useBlurExponentialShadowMap = true;
            shadowGenerator.blurKernel = 32;
            shadowGenerator.darkness = 0.3;
            shadowGenerator.transparencyShadow = true;
            shadowGeneratorRef.current = shadowGenerator;
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
            droneGroupRef.current?.dispose();
            frustumNodeRef.current?.dispose();
            waterMaterialRef.current?.dispose();
            scene.onBeforeRenderObservable.clear(); // Clear observers added for water
            window.removeEventListener('resize', resizeHandler);
            scene.dispose();
            engine.dispose();
            console.log('[BabylonViewer] Scene cleanup complete.');
        };

    }, [loadDroneModel, missionState.sceneSettings?.backgroundColor, setupDroneInteraction]);

    // --- Effect for Rendering/Updating Mission Data & Applying Scene Settings ---
    useEffect(() => {
        const scene = sceneRef.current;
        const shadowGenerator = shadowGeneratorRef.current;
        if (!scene || !shadowGenerator || scene.isDisposed) {
            return; 
        }

        const settings = missionState.sceneSettings;
        if (settings) {
            // Background Color
            scene.clearColor = Color4.FromHexString(settings.backgroundColor + 'FF');
            
            // Environment Intensity
            scene.environmentIntensity = settings.environmentIntensity ?? 1.0;

            // Skybox Visibility
            if (skyboxMeshRef.current) {
                skyboxMeshRef.current.setEnabled(settings.skyEnabled ?? false);
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
            if (missionState.sceneSettings?.waterEnabled) {
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
                    const waterSize = missionState.sceneSettings?.gridSize || 200;
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
                    waterMeshRef.current.dispose();
                    waterMeshRef.current = null;
                }
                
                if (waterMaterialRef.current) {
                    scene.onBeforeRenderObservable.clear(); // Remove any animation observers
                    waterMaterialRef.current.getRenderList()?.forEach(mesh => {
                        waterMaterialRef.current?.removeFromRenderList(mesh);
                    });
                    waterMaterialRef.current.dispose();
                    waterMaterialRef.current = null;
                }
                
                // Show ground if water is disabled
                if (groundMeshRef.current) {
                    groundMeshRef.current.setEnabled(true);
                }
                
                // Clean up any remaining dock objects (redundant now but safe)
                ['mainDock', 'dockEdge', 'craneBase', 'craneTower', 'craneArm', 'industrialBackground'].forEach(name => {
                    const mesh = scene.getMeshByName(name);
                    if (mesh) mesh.dispose();
                });
                scene.meshes.forEach(mesh => {
                    if (mesh.name.includes('container') || mesh.name.includes('pillar')) {
                        mesh.dispose();
                    }
                });
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

        // --- Clear Previous Frustum Meshes ---
        frustumNode.getChildMeshes(true).forEach(mesh => mesh.dispose());
        
        // --- Calculate Frustum Geometry ---
        const nearDist = 0.1; 
        const farDist = Math.max(focusDistanceM * 1.5, 20); 
        const focusPlaneGeom = calculateFrustumDimensions(cameraDetails, lensDetails, focusDistanceM);
        const nearPlaneGeom = calculateFrustumDimensions(cameraDetails, lensDetails, nearDist);
        const farPlaneGeom = calculateFrustumDimensions(cameraDetails, lensDetails, farDist);

        // --- Create Frustum Meshes if Geometry is Available ---
        if (focusPlaneGeom && nearPlaneGeom && farPlaneGeom) {
            
            // --- Define Materials ---
            const focusPlaneColor = new Color3(0.1, 0.8, 0.1); // Green
            const focusPlaneMaterial = new StandardMaterial("focusPlaneMat", scene);
            focusPlaneMaterial.diffuseColor = focusPlaneColor;
            focusPlaneMaterial.alpha = 0.4; 
            focusPlaneMaterial.backFaceCulling = false; 
            focusPlaneMaterial.freeze(); 

            const lineColor = new Color3(0.2, 0.8, 1.0); // Cyan
            const lineMaterial = new StandardMaterial("frustumLineMat", scene);
            lineMaterial.diffuseColor = lineColor;
            lineMaterial.emissiveColor = lineColor; 
            lineMaterial.alpha = 0.6; 
            lineMaterial.disableLighting = true; 
            lineMaterial.freeze(); 

            // --- Calculate Corner Points ---
            const nearTL = new Vector3(-nearPlaneGeom.width / 2, nearPlaneGeom.height / 2, nearDist);
            const nearTR = new Vector3(nearPlaneGeom.width / 2, nearPlaneGeom.height / 2, nearDist);
            const nearBL = new Vector3(-nearPlaneGeom.width / 2, -nearPlaneGeom.height / 2, nearDist);
            const nearBR = new Vector3(nearPlaneGeom.width / 2, -nearPlaneGeom.height / 2, nearDist);
            const farTL = new Vector3(-farPlaneGeom.width / 2, farPlaneGeom.height / 2, farDist);
            const farTR = new Vector3(farPlaneGeom.width / 2, farPlaneGeom.height / 2, farDist);
            const farBL = new Vector3(-farPlaneGeom.width / 2, -farPlaneGeom.height / 2, farDist);
            const farBR = new Vector3(farPlaneGeom.width / 2, -farPlaneGeom.height / 2, farDist);

            // --- Create Meshes ---
            const lines = [
                [nearTL, farTL], [nearTR, farTR], [nearBL, farBL], [nearBR, farBR], // Edges
                [nearTL, nearTR], [nearTR, nearBR], [nearBR, nearBL], [nearBL, nearTL], // Near plane rect
                [farTL, farTR], [farTR, farBR], [farBR, farBL], [farBL, farTL] // Far plane rect
            ];
            const lineSystem = MeshBuilder.CreateLineSystem("frustumLines", { lines: lines, updatable: false }, scene);
            lineSystem.material = lineMaterial; 
            lineSystem.parent = frustumNode; 

            const focusPlane = MeshBuilder.CreatePlane("focusPlane", { width: focusPlaneGeom.width, height: focusPlaneGeom.height, updatable: false }, scene);
            focusPlane.position = new Vector3(0, 0, focusDistanceM); 
            focusPlane.material = focusPlaneMaterial; 
            focusPlane.parent = frustumNode;
            
        } else {
            // console.log('[BabylonViewer] Skipping frustum creation (missing camera/lens details).');
        }

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
        missionState.sceneSettings, 
        modelLoading, 
        loadDroneModel,
        gimbalPitch,
        cameraFollowsDrone,
        droneHeading // Added droneHeading as dependency
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
            if (lensDetails.aperture && Array.isArray(lensDetails.aperture)) {
                setAvailableFStops(lensDetails.aperture);
            }
            
            // Update the DOF visualization
            dofVisualizer.update(focusDistance, cameraDetails, lensDetails, fStop);
        }
    }, [dofVisualizer, missionState.hardware]);

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
            {missionState.sceneSettings && (
                <ViewerSettingsOverlay
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    settings={missionState.sceneSettings}
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
                        missionState.hardware?.fStop || 2.8
                    ) : 
                    { nearFocusDistanceM: 8, farFocusDistanceM: 12, totalDepthM: 4 }
                }
            />
        </Box>
    );
};

export default BabylonViewer; 