import React, { useState, useMemo } from 'react';
import { Paper, CircularProgress, Box as MuiBox, IconButton } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import SettingsIcon from '@mui/icons-material/Settings';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useMission } from '../../context/MissionContext';
import { useThreeJSState } from '../../context/ThreeJSStateContext';
import { LocalCoord } from '../../types/mission';
import DronePositionControlPanel from '../DronePositionControlPanel/DronePositionControlPanel';
import HardwareVisualizationSettings from '../HardwareVisualizationSettings/HardwareVisualizationSettings';
import AdvancedSceneSettings from '../SceneControls/AdvancedSceneSettings';
import SceneObjectEditModal from './modals/SceneObjectEditModal';
import { MissionScene } from './';
import ThreeJSOptimizer from './ThreeJSOptimizer';

// Import a CSS module for the transform controls overlay
import './transformControlsOverlay.css';

// Define props for Local3DViewer
interface Local3DViewerProps {
  height?: string | number;
  liveDronePosition?: LocalCoord | null;
  liveDroneRotation?: { heading: number; pitch: number; roll: number; } | null;
}

// Add an ErrorBoundary component to handle R3F errors
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error in 3D viewer:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <group>
          <mesh position={[0, 2, 0]}>
            <boxGeometry />
            <meshStandardMaterial color="red" />
          </mesh>
          <directionalLight position={[10, 10, 5]} />
          <ambientLight intensity={0.5} />
        </group>
      );
    }
    return this.props.children;
  }
}

// Main 3D viewer component
const Local3DViewer: React.FC<Local3DViewerProps> = ({ 
  height = '100%', 
  liveDronePosition, 
  liveDroneRotation 
}) => {
  const { state, dispatch } = useMission();
  const { forceRerender } = useThreeJSState();
  const { 
    sceneSettings, 
    editingSceneObjectId, 
    isCameraFrustumVisible,
    currentMission
  } = state;

  // State for panels and drone control
  const [isPositionPanelOpen, setIsPositionPanelOpen] = useState(false);
  const [manualDronePosition, setManualDronePosition] = useState<LocalCoord | null>(null);
  const [manualCameraFollow, setManualCameraFollow] = useState(true);
  const [isHardwareSettingsPanelOpen, setIsHardwareSettingsPanelOpen] = useState(false);
  const [isAdvancedSettingsPanelOpen, setIsAdvancedSettingsPanelOpen] = useState(false);
  const [hardwareVisualizationSettings, setHardwareVisualizationSettings] = useState({
    showNearFocusPlane: true,
    showFarFocusPlane: false,
    showFocusPlaneInfo: false,
    showDOFInfo: false,
    showFootprintInfo: false,
    showFocusPlaneLabels: false
  });

  // Determine the current drone position
  const actualCurrentDronePosition = useMemo(() => {
    if (manualDronePosition) return manualDronePosition;
    if (liveDronePosition) return liveDronePosition;
    if (currentMission?.takeoffPoint) return currentMission.takeoffPoint;
    return { x: 0, y: 0, z: 0 };
  }, [manualDronePosition, liveDronePosition, currentMission?.takeoffPoint]);

  // Handlers
  const handleDroneDoubleClick = () => {
    if (!isPositionPanelOpen) {
      // Initialize manual position with the current position when opening
      setManualDronePosition(actualCurrentDronePosition);
    }
    setIsPositionPanelOpen(!isPositionPanelOpen);
    forceRerender();
  };

  const handleManualPositionChange = (newPosition: LocalCoord) => {
    setManualDronePosition(newPosition);
    forceRerender();
  };

  const handleManualCameraFollowChange = (follows: boolean) => {
    setManualCameraFollow(follows);
    forceRerender();
  };

  // Render the main component
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        height: height,
        position: 'relative', 
        overflow: 'hidden', 
        borderRadius: 0,
        backgroundColor: sceneSettings.backgroundColor, 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Settings buttons */}
      <MuiBox sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 10,
        display: 'flex',
        gap: 1
      }}>
        <IconButton 
          onClick={() => {
            setIsAdvancedSettingsPanelOpen(prev => !prev);
            forceRerender();
          }}
          sx={{ 
            bgcolor: 'rgba(0,0,0,0.5)', 
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
          }}
          size="small"
        >
          <SettingsIcon />
        </IconButton>
        <IconButton 
          onClick={() => {
            setIsHardwareSettingsPanelOpen(prev => !prev);
            forceRerender();
          }}
          sx={{ 
            bgcolor: 'rgba(0,0,0,0.5)', 
            color: isCameraFrustumVisible ? '#4fc3f7' : 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
          }}
          size="small"
        >
          <TuneIcon />
        </IconButton>
      </MuiBox>
      
      {/* 3D Canvas with optimized settings */}
      <Canvas 
        shadows 
        camera={{ 
          position: [30, 30, 30],
          fov: sceneSettings.fov
        }}
        dpr={[1, 2]} // Limit pixel ratio for better performance
        performance={{ min: 0.5 }} // Allow frame rate to drop for performance
        gl={{ 
          antialias: true,
          alpha: false, // Disable alpha for performance
          stencil: false, // Disable stencil for performance
          depth: true, // Keep depth for proper rendering
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={
          <MuiBox sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}>
            <CircularProgress />
          </MuiBox>
        }>
          <ErrorBoundary>
            <ThreeJSOptimizer>
              <MissionScene 
                liveDronePosition={liveDronePosition} 
                liveDroneRotation={liveDroneRotation}
                manualDronePosition={manualDronePosition} 
                onDroneDoubleClick={handleDroneDoubleClick} 
                cameraFollowsDrone={manualCameraFollow} 
                visualizationSettings={hardwareVisualizationSettings}
              />
            </ThreeJSOptimizer>
          </ErrorBoundary>
        </Suspense>
      </Canvas>

      {/* Panels and modals */}
      <DronePositionControlPanel
        isOpen={isPositionPanelOpen}
        onClose={() => {
          setIsPositionPanelOpen(false);
          forceRerender();
        }}
        initialPosition={manualDronePosition || actualCurrentDronePosition}
        onPositionChange={handleManualPositionChange}
        initialCameraFollow={manualCameraFollow}
        onCameraFollowChange={handleManualCameraFollowChange}
      />

      <HardwareVisualizationSettings 
        isOpen={isHardwareSettingsPanelOpen}
        onClose={() => {
          setIsHardwareSettingsPanelOpen(false);
          forceRerender();
        }}
        onVisualizationSettingsChange={(settings) => {
          setHardwareVisualizationSettings(settings);
          forceRerender();
        }}
      />

      <SceneObjectEditModal
        objectId={editingSceneObjectId || ''}
        open={!!editingSceneObjectId}
        onClose={() => {
          dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: null });
          forceRerender();
        }}
      />

      {/* Advanced Scene Settings Panel - Positioned absolutely */}
      <MuiBox 
        sx={{ 
          position: 'absolute', 
          top: '55px', 
          right: '10px', 
          zIndex: 100,
          display: isAdvancedSettingsPanelOpen ? 'block' : 'none',
          transition: 'all 0.3s ease',
          maxWidth: '450px',
          width: '100%',
          opacity: isAdvancedSettingsPanelOpen ? 1 : 0,
          pointerEvents: isAdvancedSettingsPanelOpen ? 'auto' : 'none',
        }}
      >
        <AdvancedSceneSettings 
          settings={sceneSettings}
          onChange={(field, value) => {
            dispatch({ 
              type: 'UPDATE_SCENE_SETTINGS', 
              payload: { [field]: value } 
            });
            forceRerender();
          }}
          open={isAdvancedSettingsPanelOpen}
          onClose={() => {
            setIsAdvancedSettingsPanelOpen(false);
            forceRerender();
          }}
        />
      </MuiBox>
    </Paper>
  );
};

export default Local3DViewer; 