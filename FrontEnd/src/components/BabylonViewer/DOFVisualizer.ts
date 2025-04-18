import {
    Scene,
    Vector3,
    StandardMaterial,
    Color3,
    MeshBuilder,
    TransformNode,
    DynamicTexture,
    Mesh
} from '@babylonjs/core';
import { Camera, Lens } from '../../types/hardware';
import { metersToFeet } from '../../utils/sensorCalculations';

/**
 * DOFVisualizer class for creating and managing depth of field visualizations in Babylon.js
 */
export class DOFVisualizer {
    private scene: Scene;
    private parentNode: TransformNode;
    private nearFocusPlane: Mesh | null = null;
    private farFocusPlane: Mesh | null = null;
    private focusPlane: Mesh | null = null;
    private labels: { [key: string]: Mesh } = {};
    
    private hFov: number = 0;
    private vFov: number = 0;
    
    // Configuration
    private showNearFocusPlane: boolean = true;
    private showFarFocusPlane: boolean = false;
    private showImageAreaAtFocus: boolean = true;
    private showLabels: boolean = true;

    /**
     * Create a new DOF visualizer
     * @param scene The Babylon scene
     * @param parentNode The parent transform node to attach visualization to
     */
    constructor(scene: Scene, parentNode: TransformNode) {
        this.scene = scene;
        this.parentNode = parentNode;
    }

    /**
     * Configure the DOF visualization settings
     */
    configure(config: {
        showNearFocusPlane?: boolean;
        showFarFocusPlane?: boolean;
        showImageAreaAtFocus?: boolean;
        showLabels?: boolean;
    }): void {
        if (config.showNearFocusPlane !== undefined) {
            this.showNearFocusPlane = config.showNearFocusPlane;
            if (this.nearFocusPlane) {
                this.nearFocusPlane.setEnabled(this.showNearFocusPlane);
            }
        }
        
        if (config.showFarFocusPlane !== undefined) {
            this.showFarFocusPlane = config.showFarFocusPlane;
            if (this.farFocusPlane) {
                this.farFocusPlane.setEnabled(this.showFarFocusPlane);
            }
        }
        
        if (config.showImageAreaAtFocus !== undefined) {
            this.showImageAreaAtFocus = config.showImageAreaAtFocus;
            if (this.focusPlane) {
                this.focusPlane.setEnabled(this.showImageAreaAtFocus);
            }
        }
        
        if (config.showLabels !== undefined) {
            this.showLabels = config.showLabels;
            Object.values(this.labels).forEach(label => {
                label.setEnabled(this.showLabels);
            });
        }
    }

    /**
     * Calculate FOV angles based on camera and lens properties
     */
    private calculateFOV(camera: Camera, lens: Lens): { hFov: number, vFov: number } {
        // Default values
        const defaultFOV = { hFov: Math.PI / 3, vFov: Math.PI / 4 };
        
        if (!camera || !lens) {
            return defaultFOV;
        }
        
        try {
            // Get sensor dimensions and focal length
            const sensorWidth = camera.sensorWidth ? parseFloat(camera.sensorWidth.toString()) : NaN;
            const sensorHeight = camera.sensorHeight ? parseFloat(camera.sensorHeight.toString()) : NaN;
            
            // Handle potential focal length range for zoom lenses
            const focalLengthValue = Array.isArray(lens.focalLength) ? lens.focalLength[0] : lens.focalLength;
            const focalLength = focalLengthValue ? parseFloat(focalLengthValue.toString()) : NaN;
            
            if (isNaN(sensorWidth) || isNaN(sensorHeight) || isNaN(focalLength) || focalLength <= 0) {
                console.warn('[DOFVisualizer] Invalid camera/lens parameters', { sensorWidth, sensorHeight, focalLength });
                return defaultFOV;
            }
            
            // Calculate FOV in radians
            const hFov = 2 * Math.atan(sensorWidth / (2 * focalLength));
            const vFov = 2 * Math.atan(sensorHeight / (2 * focalLength));
            
            return { hFov, vFov };
        } catch (error) {
            console.error('[DOFVisualizer] Error calculating FOV:', error);
            return defaultFOV;
        }
    }

    /**
     * Calculate depth of field values based on camera parameters and aperture
     */
    calculateDOF(
        focusDistanceM: number,
        camera: Camera | null,
        lens: Lens | null,
        aperture: number
    ): { nearFocusDistanceM: number, farFocusDistanceM: number, totalDepthM: number } {
        // Default values
        const defaultDOF = {
            nearFocusDistanceM: focusDistanceM * 0.8,
            farFocusDistanceM: focusDistanceM * 1.2,
            totalDepthM: focusDistanceM * 0.4
        };

        if (!camera || !lens || !focusDistanceM || !aperture) {
            return defaultDOF;
        }

        try {
            // Circle of confusion in mm (typically 0.03mm for full frame)
            const circleOfConfusion = 0.03;

            // Get focal length in mm
            const focalLengthValue = Array.isArray(lens.focalLength) ? lens.focalLength[0] : lens.focalLength;
            const focalLength = focalLengthValue ? parseFloat(focalLengthValue.toString()) : NaN;

            if (isNaN(focalLength) || focalLength <= 0) {
                return defaultDOF;
            }

            // Convert to mm for calculation
            const focusDistanceMM = focusDistanceM * 1000;

            // Calculate hyperfocal distance
            const hyperfocalDistance = (focalLength * focalLength) / (aperture * circleOfConfusion) + focalLength;

            // Calculate near and far limits
            let nearLimit, farLimit;

            if (focusDistanceMM >= hyperfocalDistance) {
                nearLimit = hyperfocalDistance / 2;
                farLimit = Infinity;
            } else {
                nearLimit = (focusDistanceMM * (hyperfocalDistance - focalLength)) / 
                           (hyperfocalDistance + focusDistanceMM - (2 * focalLength));
                farLimit = (focusDistanceMM * (hyperfocalDistance - focalLength)) /
                          (hyperfocalDistance - focusDistanceMM);
            }

            // Convert back to meters
            const nearLimitM = nearLimit / 1000;
            const farLimitM = farLimit === Infinity ? Infinity : farLimit / 1000;
            const totalDOFM = farLimitM === Infinity ? Infinity : farLimitM - nearLimitM;

            return {
                nearFocusDistanceM: nearLimitM,
                farFocusDistanceM: farLimitM,
                totalDepthM: totalDOFM
            };
        } catch (error) {
            console.error('[DOFVisualizer] Error calculating DOF:', error);
            return defaultDOF;
        }
    }

    /**
     * Create or update the DOF visualization
     */
    update(
        focusDistanceM: number,
        camera: Camera | null,
        lens: Lens | null,
        aperture: number
    ): void {
        if (!this.scene || !this.parentNode || !camera || !lens) {
            return;
        }
        
        // Clear previous visualization
        this.dispose();
        
        // Calculate DOF values
        const dofValues = this.calculateDOF(focusDistanceM, camera, lens, aperture);
        
        // Calculate FOV
        const fovAngles = this.calculateFOV(camera, lens);
        this.hFov = fovAngles.hFov;
        this.vFov = fovAngles.vFov;
        
        // Create materials
        const nearFocusMaterial = new StandardMaterial("nearFocusMaterial", this.scene);
        nearFocusMaterial.diffuseColor = new Color3(0, 0.8, 0);
        nearFocusMaterial.alpha = 0.3;
        nearFocusMaterial.backFaceCulling = false;
        
        const farFocusMaterial = new StandardMaterial("farFocusMaterial", this.scene);
        farFocusMaterial.diffuseColor = new Color3(0, 0.6, 0.8);
        farFocusMaterial.alpha = 0.3;
        farFocusMaterial.backFaceCulling = false;
        
        const focusPlaneMaterial = new StandardMaterial("focusPlaneMaterial", this.scene);
        focusPlaneMaterial.diffuseColor = new Color3(0.1, 0.6, 1);
        focusPlaneMaterial.alpha = 0.2;
        focusPlaneMaterial.backFaceCulling = false;
        
        try {
            // Create near focus plane
            if (dofValues.nearFocusDistanceM > 0) {
                const nearFocusHeight = 2 * Math.tan(this.vFov / 2) * dofValues.nearFocusDistanceM;
                const nearFocusWidth = 2 * Math.tan(this.hFov / 2) * dofValues.nearFocusDistanceM;
                
                this.nearFocusPlane = MeshBuilder.CreatePlane(
                    "nearFocusPlane", 
                    { width: nearFocusWidth, height: nearFocusHeight }, 
                    this.scene
                );
                this.nearFocusPlane.position = new Vector3(0, 0, -dofValues.nearFocusDistanceM);
                this.nearFocusPlane.material = nearFocusMaterial;
                this.nearFocusPlane.parent = this.parentNode;
                this.nearFocusPlane.setEnabled(this.showNearFocusPlane);
                
                // Create near focus label
                if (this.showLabels) {
                    this.createLabel(
                        "nearFocusLabel",
                        `Near Focus: ${metersToFeet(dofValues.nearFocusDistanceM).toFixed(1)}ft`,
                        new Vector3(-nearFocusWidth / 2 - 1.5, 0, -dofValues.nearFocusDistanceM),
                        new Vector3(0, Math.PI / 2, 0)
                    );
                }
            }
            
            // Create far focus plane (if not infinity)
            if (dofValues.farFocusDistanceM !== Infinity && dofValues.farFocusDistanceM > 0) {
                const farFocusHeight = 2 * Math.tan(this.vFov / 2) * dofValues.farFocusDistanceM;
                const farFocusWidth = 2 * Math.tan(this.hFov / 2) * dofValues.farFocusDistanceM;
                
                this.farFocusPlane = MeshBuilder.CreatePlane(
                    "farFocusPlane", 
                    { width: farFocusWidth, height: farFocusHeight }, 
                    this.scene
                );
                this.farFocusPlane.position = new Vector3(0, 0, -dofValues.farFocusDistanceM);
                this.farFocusPlane.material = farFocusMaterial;
                this.farFocusPlane.parent = this.parentNode;
                this.farFocusPlane.setEnabled(this.showFarFocusPlane);
                
                // Create far focus label
                if (this.showLabels) {
                    this.createLabel(
                        "farFocusLabel",
                        `Far Focus: ${metersToFeet(dofValues.farFocusDistanceM).toFixed(1)}ft`,
                        new Vector3(-farFocusWidth / 2 - 1.5, 0, -dofValues.farFocusDistanceM),
                        new Vector3(0, Math.PI / 2, 0)
                    );
                }
            }
            
            // Create focus plane (image area at focus distance)
            const focusPlaneHeight = 2 * Math.tan(this.vFov / 2) * focusDistanceM;
            const focusPlaneWidth = 2 * Math.tan(this.hFov / 2) * focusDistanceM;
            
            this.focusPlane = MeshBuilder.CreatePlane(
                "focusPlane", 
                { width: focusPlaneWidth, height: focusPlaneHeight }, 
                this.scene
            );
            this.focusPlane.position = new Vector3(0, 0, -focusDistanceM);
            this.focusPlane.material = focusPlaneMaterial;
            this.focusPlane.parent = this.parentNode;
            this.focusPlane.setEnabled(this.showImageAreaAtFocus);
            
            // Create focus distance label
            if (this.showLabels) {
                this.createLabel(
                    "focusDistanceLabel",
                    `Focus: ${metersToFeet(focusDistanceM).toFixed(1)}ft`,
                    new Vector3(0, focusPlaneHeight / 2 + 0.5, -focusDistanceM),
                    new Vector3(0, 0, 0)
                );
                
                // Create DOF info label
                const dofText = dofValues.totalDepthM === Infinity ? 
                    "DOF: ∞" : 
                    `DOF: ${metersToFeet(dofValues.totalDepthM).toFixed(1)}ft`;
                
                this.createLabel(
                    "dofInfoLabel",
                    dofText,
                    new Vector3(0, focusPlaneHeight / 2 + 1, -focusDistanceM),
                    new Vector3(0, 0, 0)
                );
                
                // Create footprint size label
                this.createLabel(
                    "footprintLabel",
                    `${metersToFeet(focusPlaneWidth).toFixed(1)}ft × ${metersToFeet(focusPlaneHeight).toFixed(1)}ft`,
                    new Vector3(0, -focusPlaneHeight / 2 - 0.5, -focusDistanceM),
                    new Vector3(0, 0, 0)
                );
            }
            
        } catch (error) {
            console.error('[DOFVisualizer] Error creating visualization:', error);
        }
    }
    
    /**
     * Create a text label in 3D space
     */
    private createLabel(
        name: string,
        text: string,
        position: Vector3,
        rotation: Vector3,
        width: number = 4,
        height: number = 1
    ): void {
        const texture = new DynamicTexture(`${name}Texture`, { width: 512, height: 128 }, this.scene, false);
        texture.hasAlpha = true;
        texture.drawText(text, 5, 80, "bold 36px Arial", "white", "transparent", true);
        
        const material = new StandardMaterial(`${name}Material`, this.scene);
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.backFaceCulling = false;
        material.useAlphaFromDiffuseTexture = true;
        
        const plane = MeshBuilder.CreatePlane(
            name, 
            { width, height }, 
            this.scene
        );
        plane.position = position;
        plane.rotation = rotation;
        plane.material = material;
        plane.parent = this.parentNode;
        
        this.labels[name] = plane;
    }
    
    /**
     * Clean up all visualization elements
     */
    dispose(): void {
        if (this.nearFocusPlane) {
            this.nearFocusPlane.dispose();
            this.nearFocusPlane = null;
        }
        
        if (this.farFocusPlane) {
            this.farFocusPlane.dispose();
            this.farFocusPlane = null;
        }
        
        if (this.focusPlane) {
            this.focusPlane.dispose();
            this.focusPlane = null;
        }
        
        // Dispose all labels
        Object.values(this.labels).forEach(label => {
            label.dispose();
        });
        
        this.labels = {};
    }
} 