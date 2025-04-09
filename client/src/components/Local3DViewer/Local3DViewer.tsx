import React, { useState, useMemo, useEffect } from 'react';
import { Paper, CircularProgress, Box as MuiBox, IconButton, Typography, Fade, LinearProgress } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
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
import PathGenerationIndicator from '../LoadingIndicator/PathGenerationIndicator';

// Import a CSS module for the transform controls overlay
import './transformControlsOverlay.css';

// Define props for Local3DViewer
interface Local3DViewerProps {
  height?: string | number;
  liveDronePosition?: LocalCoord | null;
  liveDroneRotation?: { heading: number; pitch: number; roll: number; } | null;
  loadingMessage?: string; // Optional custom loading message
}

// Add an enhanced ErrorBoundary component with retry functionality
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, errorMessage: string}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { 
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { 
      hasError: true, 
      errorMessage: error.message || 'An error occurred in the 3D viewer'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error in 3D viewer:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <MuiBox 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            zIndex: 1000,
            padding: 3
          }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            3D Viewer Error
          </Typography>
          <Typography variant="body2" align="center" sx={{ maxWidth: '80%', mb: 3 }}>
            {this.state.errorMessage}
          </Typography>
          <IconButton 
            color="primary" 
            onClick={this.handleRetry}
            sx={{ 
              backgroundColor: 'rgba(79, 195, 247, 0.15)',
              '&:hover': {
                backgroundColor: 'rgba(79, 195, 247, 0.3)',
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Typography variant="caption" sx={{ mt: 1 }}>
            Click to retry
          </Typography>
        </MuiBox>
      );
    }
    return this.props.children;
  }
}

// Main 3D viewer component
const Local3DViewer: React.FC<Local3DViewerProps> = ({ 
  height = '100%', 
  liveDronePosition, 
  liveDroneRotation,
  loadingMessage
}) => {
  const { state, dispatch } = useMission();
  const { forceRerender } = useThreeJSState();
  const { 
    sceneSettings, 
    editingSceneObjectId, 
    isCameraFrustumVisible,
    currentMission,
    isPerformingHeavyOperation
  } = state;

  // State for panels and drone control
  const [isPositionPanelOpen, setIsPositionPanelOpen] = useState(false);
  const [manualDronePosition, setManualDronePosition] = useState<LocalCoord | null>(null);
  const [manualCameraFollow, setManualCameraFollow] = useState(true);
  const [isHardwareSettingsPanelOpen, setIsHardwareSettingsPanelOpen] = useState(false);
  const [isAdvancedSettingsPanelOpen, setIsAdvancedSettingsPanelOpen] = useState(false);
  const [isSceneLoading, setIsSceneLoading] = useState(true);
  const [rendererReady, setRendererReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(10); // Start at 10% to show initial activity
  const [loadingModelName, setLoadingModelName] = useState<string | null>(null);
  const [hardwareVisualizationSettings, setHardwareVisualizationSettings] = useState({
    showNearFocusPlane: true,
    showFarFocusPlane: false,
    showFocusPlaneInfo: false,
    showDOFInfo: false,
    showFootprintInfo: false,
    showFocusPlaneLabels: false
  });

  // Example setup of PX4 camera control handlers (add this inside the component)
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dronePosition, setDronePosition] = useState<LocalCoord>({ x: 0, y: 0, z: 10 });
  const [cameraFollows, setCameraFollows] = useState(true);
  const [gimbalPitch, setGimbalPitch] = useState(-45); // -45 degree angle (downwards)
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);

  // Start and complete loading state
  useEffect(() => {
    setIsSceneLoading(true);
    setLoadingProgress(10);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        // Cap progress at 90% until fully loaded
        const nextProgress = prev + Math.random() * 5;
        return Math.min(nextProgress, rendererReady ? 100 : 90);
      });
    }, 200);
    
    const loadingTimer = setTimeout(() => {
      if (rendererReady) {
        setLoadingProgress(100);
        // Small delay before hiding the loading screen for a smooth transition
        setTimeout(() => setIsSceneLoading(false), 500);
      }
    }, 1500); // Minimum load time for UI stability
    
    return () => {
      clearTimeout(loadingTimer);
      clearInterval(progressInterval);
    };
  }, [rendererReady]);
  
  // Watch for heavy operations to show loading message
  useEffect(() => {
    if (isPerformingHeavyOperation) {
      // Reset loading state when starting a heavy operation
      setIsSceneLoading(true);
      setLoadingProgress(30); // Start at 30% for model loading
      setLoadingModelName("Loading model...");
      
      // Simulate progress
      const heavyOpInterval = setInterval(() => {
        setLoadingProgress(prev => {
          const nextProgress = prev + Math.random() * 3;
          return Math.min(nextProgress, 95); // Cap at 95% until operation completes
        });
      }, 300);
      
      return () => clearInterval(heavyOpInterval);
    } else if (loadingModelName) {
      // When heavy operation ends, finalize loading
      setLoadingProgress(100);
      setTimeout(() => {
        setIsSceneLoading(false);
        setLoadingModelName(null);
      }, 500);
    }
  }, [isPerformingHeavyOperation]);

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

  const handleSceneInit = () => {
    setRendererReady(true);
  };

  // PX4 camera control handlers
  const handleGimbalPitchChange = (pitch: number) => {
    setGimbalPitch(pitch);
    
    // Send MAVLink command to PX4 for gimbal control
    // Example: sendMavlinkMessage({
    //   type: 'COMMAND_LONG',
    //   command: 'MAV_CMD_DO_MOUNT_CONTROL',
    //   param1: pitch, // Pitch in degrees
    //   param2: 0,     // Roll (not changing)
    //   param3: 0,     // Yaw (not changing)
    //   param7: 2,     // MAV_MOUNT_MODE_MAVLINK_TARGETING
    // });
    
    console.log(`Setting gimbal pitch to ${pitch}°`);
  };

  const handleCameraModeChange = (mode: 'photo' | 'video') => {
    setCameraMode(mode);
    
    // Send MAVLink command to set camera mode
    // Example: sendMavlinkMessage({
    //   type: 'COMMAND_LONG',
    //   command: 'MAV_CMD_SET_CAMERA_MODE',
    //   param2: mode === 'photo' ? 0 : 1, // 0 for photo mode, 1 for video mode
    // });
    
    console.log(`Switching camera to ${mode} mode`);
  };

  const handleTriggerCamera = () => {
    // Send MAVLink command to trigger camera
    // Example: sendMavlinkMessage({
    //   type: 'COMMAND_LONG',
    //   command: 'MAV_CMD_DO_DIGICAM_CONTROL',
    //   param5: 1, // 1 to trigger camera
    // });
    
    console.log('Capturing photo');
  };

  const handleToggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    // Send MAVLink command to start/stop recording
    // Example: sendMavlinkMessage({
    //   type: 'COMMAND_LONG',
    //   command: 'MAV_CMD_VIDEO_START_CAPTURE',
    //   param1: newRecordingState ? 1 : 0, // 1 to start, 0 to stop
    // });
    
    console.log(newRecordingState ? 'Starting video recording' : 'Stopping video recording');
  };

  // Determine loading message
  const displayLoadingMessage = loadingMessage || 
    (loadingModelName ? loadingModelName : 
      isPerformingHeavyOperation ? "Processing mission data..." : "Loading 3D scene...");

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
      {/* Heavy operation indicator */}
      {isPerformingHeavyOperation && !isSceneLoading && (
        <MuiBox sx={{ 
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 1,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <CircularProgress size={16} color="primary" />
          <Typography variant="caption" color="white">
            Processing...
          </Typography>
        </MuiBox>
      )}
      
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
      
      {/* Enhanced loading indicator with fade transition */}
      <Fade in={isSceneLoading} timeout={{ enter: 300, exit: 500 }}>
        <MuiBox sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'rgba(21, 21, 21, 0.9)',
          zIndex: 50,
          padding: 4
        }}>
          <MuiBox sx={{ textAlign: 'center', width: '80%', maxWidth: '400px' }}>
            <CircularProgress 
              color="primary" 
              size={50} 
              thickness={4}
              variant="determinate"
              value={loadingProgress}
            />
            <Typography variant="h6" color="primary" sx={{ mt: 3, fontWeight: 500 }}>
              {displayLoadingMessage}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={loadingProgress} 
              sx={{ 
                mt: 2, 
                height: 6, 
                borderRadius: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#4fc3f7'
                }
              }} 
            />
            <Typography variant="caption" color="white" sx={{ mt: 1, opacity: 0.7, display: 'block' }}>
              {loadingProgress >= 100 ? 'Complete!' : `${Math.round(loadingProgress)}% complete`}
            </Typography>
          </MuiBox>
        </MuiBox>
      </Fade>
      
      {/* 3D Canvas with optimized settings */}
      <Canvas 
        key={`canvas-${sceneSettings.waterEnabled}-${sceneSettings.hideGroundPlane}-${sceneSettings.gridVisible}`}
        shadows={sceneSettings.shadowsEnabled ?? true}
        camera={{ 
          position: [30, 30, 30],
          fov: sceneSettings.fov,
          near: 0.1,
          far: 10000, // Extended far plane for large scale scenes
        }}
        dpr={[1, 2]} // Limit pixel ratio for better performance
        performance={{ 
          min: 0.5, // Allow frame rate to drop for performance
          max: 1 // Cap at native refresh rate
        }}
        gl={{ 
          antialias: true,
          alpha: false, // Disable alpha for performance
          stencil: false, // Disable stencil for performance
          depth: true, // Keep depth for proper rendering
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: true // Handle large scale differences better
        }}
        onCreated={({ gl }) => {
          // Performance optimizations
          gl.setPixelRatio(window.devicePixelRatio || 1);
          
          // Wait for the next frame to ensure the renderer is actually ready
          requestAnimationFrame(() => handleSceneInit());
        }}
      >
        <Suspense fallback={null}>
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
        gimbalPitch={gimbalPitch}
        onGimbalPitchChange={handleGimbalPitchChange}
        cameraMode={cameraMode}
        onCameraModeChange={handleCameraModeChange}
        isRecording={isRecording}
        onTriggerCamera={handleTriggerCamera}
        onToggleRecording={handleToggleRecording}
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