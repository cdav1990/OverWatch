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

  // NEW: Environment Map Settings
  environmentMap: string | null; // Environment preset name from @react-three/drei or null
  environmentIntensity: number; // Control the intensity of the HDRI environment lighting
  
  // Quality Settings
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra'; // Controls overall quality presets
}

// Default values for initial scene setup
export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  // Grid defaults - Optimized for smaller operational area to improve performance
  gridSize: 600, // Reduced from 800 to 600 feet for even better performance
  gridDivisions: 16, // Reduced from 20 to 16 for fewer grid lines
  gridUnit: 'feet',
  gridVisible: true,
  gridFadeDistance: 450, // Reduced from 600 to 450 for better performance
  gridColorCenterLine: '#FFFFFF', // White
  gridColorGrid: '#FFFFFF', // White
  gridAutoScale: false,
  axesVisible: true,
  
  // New Grid Defaults
  gridMajorLineInterval: 5,
  gridMinorColor: '#FFFFFF', // White
  gridMajorColor: '#FFFFFF', // White
  gridShowUnderWater: true,
  gridEnhancedVisibility: true,
  
  // Ground defaults
  hideGroundPlane: false,
  groundOpacity: 1.0,
  showBelowGround: false,
  
  // Water defaults - optimized for performance
  waterEnabled: true,
  waterColor: '#194987', // Keep darker blue for contrast
  waterOpacity: 0.7,     // Reduced opacity for better performance
  waterWaveSpeed: 0.1,   // Reduced speed for better performance
  waterWaveScale: 1.2,   // Significantly reduced scale for better performance
  
  // Camera defaults
  fov: 60,
  cameraDamping: true,
  cameraInvertY: false,
  
  // Lighting and environment defaults - Updated per requirements
  backgroundColor: '#222222',
  ambientLightIntensity: 1.0, // Changed from 0.4 to 1.0
  directionalLightIntensity: 0.9,
  skyEnabled: false,
  sunPosition: [-100, 150, -100],
  shadowsEnabled: true,

  // NEW: Default Environment Map Settings - Updated per requirements
  environmentMap: 'sunset', // Changed from 'city' to 'sunset'
  environmentIntensity: 1.5, // Changed from 0.8 to 1.5,

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
    gridMinorColor: "#CCCCCC", // Light gray for minor lines
    gridMajorColor: "#FFFFFF", // White for major lines 
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
    gridMinorColor: "#BBBBBB", // Light gray for minor lines
    gridMajorColor: "#FFFFFF", // White for major lines
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
    gridMinorColor: "#888888", // Dark gray for minor lines
    gridMajorColor: "#000000", // Black for major lines
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
    gridMinorColor: "#BBBBBB", // Light gray for minor lines
    gridMajorColor: "#FFFFFF", // White for major lines
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
    gridMinorColor: "#9B8256", // Darker tan for minor lines
    gridMajorColor: "#6D4C41", // Brown for major lines
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
  majorLineInterval?: number; // New property for major line interval
}

export const GRID_PRESETS: GridPreset[] = [
  { 
    name: "Maximum Performance (600')", 
    gridSize: 600, 
    divisions: 16, // 37.5' grid lines
    fadeDistance: 450, 
    unit: 'feet',
    majorLineInterval: 4 // 150' major grid lines
  },
  { 
    name: "Performance Optimized (800')", 
    gridSize: 800, 
    divisions: 20, // 40' grid lines
    fadeDistance: 600, 
    unit: 'feet',
    majorLineInterval: 5 // 200' major grid lines
  },
  { 
    name: "Optimized Drone Ops (1500')", 
    gridSize: 1500, 
    divisions: 30, // 50' grid lines
    fadeDistance: 1200, 
    unit: 'feet',
    majorLineInterval: 5 // 250' major grid lines
  },
  { 
    name: "Standard 10'/50'", 
    gridSize: 1000, 
    divisions: 100, // 100 divisions for 10' small grid in a 1000' area
    fadeDistance: 1000, 
    unit: 'feet',
    majorLineInterval: 5 // Every 5 grid lines (10' minor, 50' major) 
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
  },
  { 
    name: "City Scale", 
    gridSize: 5000, 
    divisions: 50, 
    fadeDistance: 4000, 
    unit: 'meters',
    majorLineInterval: 5
  },
  // New grid presets
  {
    name: "Industrial/Port",
    gridSize: 7500,
    divisions: 75,
    fadeDistance: 6000,
    unit: 'meters',
    majorLineInterval: 5
  },
  {
    name: "Regional Scale",
    gridSize: 10000,
    divisions: 100,
    fadeDistance: 8000,
    unit: 'meters',
    majorLineInterval: 10
  },
  {
    name: "Micro Detail",
    gridSize: 100,
    divisions: 100,
    fadeDistance: 200,
    unit: 'meters',
    majorLineInterval: 5
  },
  {
    name: "Aeronautical",
    gridSize: 18520, // 10 nautical miles in meters
    divisions: 100,
    fadeDistance: 15000,
    unit: 'meters',
    majorLineInterval: 10
  },
  {
    name: "High Contrast",
    gridSize: 5000,
    divisions: 50,
    fadeDistance: 4000,
    unit: 'meters',
    majorLineInterval: 5
  }
]; 