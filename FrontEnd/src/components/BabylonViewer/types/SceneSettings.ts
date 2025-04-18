// SceneSettings.ts for BabylonViewer
// Type definition for scene settings used in the Babylon.js 3D viewer

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
  
  // New Grid Settings
  gridMajorLineInterval: number; // Number of grid divisions for major (thicker) grid lines
  gridMinorColor: string; // Color for minor grid lines
  gridMajorColor: string; // Color for major grid lines
  gridShowUnderWater: boolean; // Whether to show grid under transparent water
  gridEnhancedVisibility: boolean; // Enhanced visibility mode for grid
  
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

  // Environment Map Settings
  environmentMap: string | null; // Environment preset name or null
  environmentIntensity: number; // Control the intensity of the environment lighting
  
  // Quality Settings
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra'; // Controls overall quality presets
}

// Default values for initial scene setup
export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  // Grid defaults - Optimized for smaller operational area to improve performance
  gridSize: 600, 
  gridDivisions: 16, 
  gridUnit: 'feet',
  gridVisible: true,
  gridFadeDistance: 450, 
  gridColorCenterLine: '#FFFFFF', 
  gridColorGrid: '#FFFFFF', 
  gridAutoScale: false,
  axesVisible: true,
  
  // New Grid Defaults
  gridMajorLineInterval: 5,
  gridMinorColor: '#FFFFFF', 
  gridMajorColor: '#FFFFFF', 
  gridShowUnderWater: true,
  gridEnhancedVisibility: true,
  
  // Ground defaults
  hideGroundPlane: false,
  groundOpacity: 1.0,
  showBelowGround: false,
  
  // Water defaults
  waterEnabled: false,
  waterColor: '#194987', 
  waterOpacity: 0.7,
  waterWaveSpeed: 0.1,
  waterWaveScale: 1.2,
  
  // Camera defaults
  fov: 60,
  cameraDamping: true,
  cameraInvertY: false,
  
  // Lighting and environment defaults
  backgroundColor: '#222222',
  ambientLightIntensity: 1.0, 
  directionalLightIntensity: 0.9,
  skyEnabled: false,
  sunPosition: [-100, 150, -100],
  shadowsEnabled: true,

  // Environment Map Settings
  environmentMap: 'sunset', 
  environmentIntensity: 1.5,

  // Quality defaults
  qualityLevel: 'medium',
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
  // Add support for new grid settings in themes
  gridMinorColor?: string;
  gridMajorColor?: string;
  gridEnhancedVisibility?: boolean;
}

export const SCENE_THEMES: SceneTheme[] = [
  {
    name: "Professional Dark",
    backgroundColor: "#121212",
    gridColorGrid: "#303030",
    gridColorCenterLine: "#4fc3f7",
    gridMinorColor: "#CCCCCC", 
    gridMajorColor: "#FFFFFF", 
    gridEnhancedVisibility: true,
    ambientLightIntensity: 0.5,
    directionalLightIntensity: 1.0,
    waterEnabled: false
  },
  {
    name: "Maritime",
    backgroundColor: "#0a192f",
    gridColorGrid: "#172a45",
    gridColorCenterLine: "#64ffda",
    gridMinorColor: "#BBBBBB", 
    gridMajorColor: "#FFFFFF", 
    gridEnhancedVisibility: true,
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
    gridMinorColor: "#888888", 
    gridMajorColor: "#000000", 
    gridEnhancedVisibility: true,
    ambientLightIntensity: 0.7,
    directionalLightIntensity: 1.2,
    waterEnabled: false
  },
  {
    name: "High Contrast",
    backgroundColor: "#000000",
    gridColorGrid: "#333333",
    gridColorCenterLine: "#ff4081",
    gridMinorColor: "#BBBBBB", 
    gridMajorColor: "#FFFFFF", 
    gridEnhancedVisibility: true,
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 1.4,
    waterEnabled: false
  },
  {
    name: "Desert Terrain",
    backgroundColor: "#eadbc1",
    gridColorGrid: "#c0a875",
    gridColorCenterLine: "#bf360c",
    gridMinorColor: "#9B8256", 
    gridMajorColor: "#6D4C41", 
    gridEnhancedVisibility: true,
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
  majorLineInterval?: number;
}

export const GRID_PRESETS: GridPreset[] = [
  { 
    name: "Maximum Performance (600')", 
    gridSize: 600, 
    divisions: 16, 
    fadeDistance: 450, 
    unit: 'feet',
    majorLineInterval: 4 
  },
  { 
    name: "Performance Optimized (800')", 
    gridSize: 800, 
    divisions: 20, 
    fadeDistance: 600, 
    unit: 'feet',
    majorLineInterval: 5 
  },
  { 
    name: "Optimized Drone Ops (1500')", 
    gridSize: 1500, 
    divisions: 30, 
    fadeDistance: 1200, 
    unit: 'feet',
    majorLineInterval: 5 
  },
  { 
    name: "Standard 10'/50'", 
    gridSize: 1000, 
    divisions: 100, 
    fadeDistance: 1000, 
    unit: 'feet',
    majorLineInterval: 5 
  },
  { 
    name: "Drone Operations", 
    gridSize: 300, 
    divisions: 30, 
    fadeDistance: 300, 
    unit: 'meters',
    majorLineInterval: 5 
  },
  { 
    name: "Building Scale", 
    gridSize: 500, 
    divisions: 50, 
    fadeDistance: 500, 
    unit: 'feet',
    majorLineInterval: 5
  },
  { 
    name: "Maritime/Large", 
    gridSize: 2000, 
    divisions: 40, 
    fadeDistance: 1500, 
    unit: 'feet',
    majorLineInterval: 4
  }
]; 