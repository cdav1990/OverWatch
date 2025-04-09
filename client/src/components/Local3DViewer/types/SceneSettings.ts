// SceneSettings.ts
// Type definition for scene settings used in the 3D viewer

export interface SceneSettings {
  // Grid Settings
  gridSize: number;
  gridDivisions: number;
  gridUnit: 'meters' | 'feet';
  gridVisible: boolean;
  gridFadeDistance: number;
  gridColorCenterLine: string;
  gridColorGrid: string;
  gridAutoScale: boolean;
  axesVisible: boolean;
  
  // Ground Settings
  hideGroundPlane: boolean;
  groundOpacity: number;
  showBelowGround: boolean;
  
  // Water Settings
  waterEnabled: boolean;
  waterColor: string;
  waterOpacity: number;
  waterWaveSpeed: number;
  waterWaveScale: number;
  
  // Camera Settings
  fov: number;
  cameraDamping: boolean;
  cameraInvertY: boolean;
  
  // Lighting and Environment
  backgroundColor: string;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  skyEnabled: boolean;
  sunPosition: [number, number, number];
  shadowsEnabled: boolean;
}

// Default values for initial scene setup
export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  // Grid defaults
  gridSize: 1000,
  gridDivisions: 20,
  gridUnit: 'meters',
  gridVisible: true,
  gridFadeDistance: 1000,
  gridColorCenterLine: '#4fc3f7',
  gridColorGrid: '#404040',
  gridAutoScale: false,
  axesVisible: true,
  
  // Ground defaults
  hideGroundPlane: false,
  groundOpacity: 0.3,
  showBelowGround: false,
  
  // Water defaults
  waterEnabled: false,
  waterColor: '#4fc3f7',
  waterOpacity: 0.6,
  waterWaveSpeed: 0.5,
  waterWaveScale: 1.0,
  
  // Camera defaults
  fov: 60,
  cameraDamping: true,
  cameraInvertY: false,
  
  // Lighting and environment defaults
  backgroundColor: '#121212',
  ambientLightIntensity: 0.5,
  directionalLightIntensity: 1.0,
  skyEnabled: true,
  sunPosition: [100, 10, 100],
  shadowsEnabled: true
};

// Theme presets
export interface SceneTheme {
  name: string;
  backgroundColor: string;
  gridColorGrid: string;
  gridColorCenterLine: string;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  waterEnabled?: boolean;
  waterColor?: string;
}

export const SCENE_THEMES: SceneTheme[] = [
  {
    name: "Professional Dark",
    backgroundColor: "#121212",
    gridColorGrid: "#303030",
    gridColorCenterLine: "#4fc3f7",
    ambientLightIntensity: 0.5,
    directionalLightIntensity: 1.0,
    waterEnabled: false
  },
  {
    name: "Maritime",
    backgroundColor: "#0a192f",
    gridColorGrid: "#172a45",
    gridColorCenterLine: "#64ffda",
    ambientLightIntensity: 0.4,
    directionalLightIntensity: 0.9,
    waterEnabled: true,
    waterColor: "#0277bd"
  },
  {
    name: "Clean Light",
    backgroundColor: "#f5f5f5",
    gridColorGrid: "#e0e0e0",
    gridColorCenterLine: "#2196f3",
    ambientLightIntensity: 0.7,
    directionalLightIntensity: 1.2,
    waterEnabled: false
  },
  {
    name: "High Contrast",
    backgroundColor: "#000000",
    gridColorGrid: "#333333",
    gridColorCenterLine: "#ff4081",
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 1.4,
    waterEnabled: false
  },
  {
    name: "Desert Terrain",
    backgroundColor: "#eadbc1",
    gridColorGrid: "#c0a875",
    gridColorCenterLine: "#bf360c",
    ambientLightIntensity: 0.8,
    directionalLightIntensity: 1.5,
    waterEnabled: false
  }
];

// Scale presets optimized for different operational needs
export interface GridPreset {
  name: string;
  gridSize: number;
  divisions: number;
  fadeDistance: number;
  unit: 'meters' | 'feet';
}

export const GRID_PRESETS: GridPreset[] = [
  { name: "Drone Operations", gridSize: 300, divisions: 30, fadeDistance: 300, unit: 'meters' },
  { name: "Building Scale", gridSize: 500, divisions: 50, fadeDistance: 500, unit: 'feet' },
  { name: "Maritime/Large", gridSize: 2000, divisions: 40, fadeDistance: 1500, unit: 'feet' },
  { name: "City Scale", gridSize: 5000, divisions: 50, fadeDistance: 4000, unit: 'meters' }
]; 