import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Paper, Box, Typography, IconButton, Menu, MenuItem, Tooltip, Switch, FormControlLabel, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SettingsIcon from '@mui/icons-material/Settings';
import { styled } from '@mui/material/styles';
import { Rnd } from 'react-rnd';
import * as THREE from 'three';
import { Camera, Lens } from '../../types/hardware';
import { LocalCoord } from '../../types/mission';
import { calculateFieldOfView, getEffectiveFocalLength } from '../../utils/sensorCalculations';

interface CameraViewportWindowProps {
  mainScene: THREE.Scene | null;
  onClose: () => void;
  cameraDetails: Camera | null;
  lensDetails: Lens | null;
  dronePosition: LocalCoord;
  droneRotation?: { heading: number; pitch: number; roll: number } | null;
  gimbalPitch: number;
  shadowsEnabled: boolean;
  rosTopicName?: string;
  isSimulated?: boolean;
}

const ViewportContainer = styled(Paper)(({ theme }) => ({
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(10, 10, 10, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '4px',
  boxShadow: theme.shadows[5],
  zIndex: 1400,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0.5, 1),
  backgroundColor: 'rgba(40, 40, 40, 0.8)',
  cursor: 'move',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  height: '30px',
}));

const ContentArea = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: theme.palette.grey[300],
  overflow: 'hidden',
  position: 'relative',
  height: 'calc(100% - 30px)',
}));

const StatusIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  left: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.5, 1),
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  borderRadius: '4px',
  zIndex: 10,
}));

const ActionButtonsContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(1),
  right: theme.spacing(1),
  display: 'flex',
  gap: theme.spacing(1),
  zIndex: 10,
}));

// Main Camera Viewport Window Component
const CameraViewportWindow: React.FC<CameraViewportWindowProps> = ({
  mainScene,
  onClose,
  cameraDetails,
  lensDetails,
  dronePosition,
  droneRotation,
  gimbalPitch,
  shadowsEnabled,
  rosTopicName = "/camera/image_raw",
  isSimulated = true
}) => {
  const [viewportSize, setViewportSize] = useState({ width: 320, height: 240 });
  const [isSimulationMode, setIsSimulationMode] = useState(isSimulated);
  const [isConnected, setIsConnected] = useState(!isSimulationMode);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSimulationMode || !canvasRef.current || !mainScene) return;

    const canvasElement = canvasRef.current;
    if (canvasElement.width <= 0 || canvasElement.height <= 0) {
        console.warn("CameraViewportWindow: Canvas dimensions invalid, skipping setup.", canvasElement.width, canvasElement.height);
        return;
    }

    if (!cameraRef.current) {
        cameraRef.current = new THREE.PerspectiveCamera(75, canvasElement.width / canvasElement.height, 0.1, 10000);
    } else {
        cameraRef.current.aspect = canvasElement.width / canvasElement.height;
        cameraRef.current.updateProjectionMatrix();
    }
    const camera = cameraRef.current;

    if (!rendererRef.current) {
      rendererRef.current = new THREE.WebGLRenderer({
        canvas: canvasElement,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      });
      rendererRef.current.setSize(canvasElement.width, canvasElement.height);
      rendererRef.current.setPixelRatio(window.devicePixelRatio);
      rendererRef.current.outputColorSpace = THREE.SRGBColorSpace;
      rendererRef.current.shadowMap.enabled = shadowsEnabled;
      rendererRef.current.toneMapping = THREE.ACESFilmicToneMapping;
      rendererRef.current.toneMappingExposure = 1;
    } else {
       rendererRef.current.setSize(canvasElement.width, canvasElement.height);
       rendererRef.current.shadowMap.enabled = shadowsEnabled;
    }
    const renderer = rendererRef.current;

    const renderLoop = () => {
      if (!camera || !renderer || !mainScene) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      };

      updateCameraFromProps(camera);

      renderer.render(mainScene, camera);

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    renderLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isSimulationMode, 
    mainScene, 
    viewportSize.width, 
    viewportSize.height,
    dronePosition.x, dronePosition.y, dronePosition.z,
    droneRotation?.heading, droneRotation?.pitch, droneRotation?.roll,
    gimbalPitch,
    cameraDetails?.id,
    lensDetails?.id,
    shadowsEnabled
  ]);

  useEffect(() => {
    const renderer = rendererRef.current;
    return () => {
        if (renderer) {
            renderer.dispose();
            rendererRef.current = null;
            console.log("CameraViewportWindow Renderer disposed.");
        }
        if (animationFrameRef.current) {
             cancelAnimationFrame(animationFrameRef.current);
             animationFrameRef.current = null;
        }
    };
  }, []);

  const updateCameraFromProps = (camera: THREE.PerspectiveCamera) => {
    // Configure camera layers
    camera.layers.disableAll(); // Disable all layers first
    camera.layers.enable(0);    // Enable only layer 0 (main scene objects)

    // Set FOV and aspect based on camera and lens if available
    if (cameraDetails && lensDetails) {
      const focalLength = getEffectiveFocalLength(lensDetails);
      
      if (cameraDetails.sensorHeight > 0 && cameraDetails.sensorWidth > 0 && focalLength > 0) {
          camera.fov = calculateFieldOfView(focalLength, cameraDetails.sensorHeight);
          camera.aspect = viewportSize.width / viewportSize.height;
          camera.updateProjectionMatrix();
      } else {
          console.warn("Invalid sensor dimensions or focal length for camera FOV/Aspect calculation.");
          camera.fov = 75;
          camera.aspect = viewportSize.width / viewportSize.height;
          camera.updateProjectionMatrix();
      }
    } else {
      camera.fov = 75;
      camera.aspect = viewportSize.width / viewportSize.height;
      camera.updateProjectionMatrix();
    }

    // Position camera at drone position (adjusting Z/Y)
    camera.position.set(dronePosition.x, dronePosition.z, -dronePosition.y);

    // --- Rotation Logic (Apply drone orientation + gimbal) ---
    camera.rotation.set(0, 0, 0); // Reset rotation
    const headingRad = THREE.MathUtils.degToRad(droneRotation?.heading ?? 0);
    camera.rotateY(headingRad);
    const pitchRad = THREE.MathUtils.degToRad(droneRotation?.pitch ?? 0);
    camera.rotateX(pitchRad);
    const rollRad = THREE.MathUtils.degToRad(droneRotation?.roll ?? 0);
    // camera.rotateZ(rollRad); // Uncomment if camera rolls with drone
    const gimbalRad = THREE.MathUtils.degToRad(gimbalPitch);
    camera.rotateX(gimbalRad);

    camera.updateMatrixWorld(); // Ensure matrix is updated after rotations and position change
  };

  useEffect(() => {
    if (!isSimulationMode && rosTopicName) {
      console.log(`Attempting to connect to ROS topic: ${rosTopicName}`);
      setIsConnected(false);
      const timer = setTimeout(() => {
        console.log(`Simulated connection to ROS topic: ${rosTopicName}`);
        setIsConnected(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        console.log(`Disconnecting from ROS topic: ${rosTopicName}`);
        setIsConnected(false);
      };
    } else {
        setIsConnected(false);
    }
  }, [isSimulationMode, rosTopicName]);

  const handleResizeStop = (e: any, direction: any, ref: HTMLElement, delta: any, position: any) => {
    const newWidth = ref.offsetWidth;
    const newHeight = ref.offsetHeight;
    setViewportSize({ width: newWidth, height: newHeight - 30 });

    if (newWidth > 0 && (newHeight - 30) > 0) {
        if (rendererRef.current) {
          rendererRef.current.setSize(newWidth, newHeight - 30);
        }

        if (cameraRef.current) {
          cameraRef.current.aspect = newWidth / (newHeight - 30);
          cameraRef.current.updateProjectionMatrix();
        }
    } else {
        console.warn("CameraViewportWindow: Invalid dimensions on resize.", newWidth, newHeight - 30);
    }
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const toggleSimulationMode = () => {
    setIsSimulationMode(!isSimulationMode);
    handleMenuClose();
  };

  const handleCaptureImage = useCallback(() => {
    if (rendererRef.current && canvasRef.current) {
        try {
            if (cameraRef.current && mainScene) {
                rendererRef.current.render(mainScene, cameraRef.current);
            }

            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const dataURL = canvasRef.current.toDataURL('image/jpeg', 0.9);

            const link = document.createElement('a');
            link.download = `camera-snapshot-${timestamp}.jpg`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`Image saved as camera-snapshot-${timestamp}.jpg`);
        } catch (error) {
            console.error('Error capturing image:', error);
            alert(`Error capturing image: ${error instanceof Error ? error.message : String(error)}`);
        }
    } else {
        console.error("Cannot capture image: Renderer or Canvas not available.");
        alert("Cannot capture image: Viewport not ready.");
    }
  }, [mainScene]);

  return (
    <Rnd
      default={{
        x: 20,
        y: window.innerHeight - viewportSize.height - 50,
        width: viewportSize.width,
        height: viewportSize.height + 30,
      }}
      minWidth={160}
      minHeight={120 + 30}
      bounds="parent"
      dragHandleClassName="drag-handle"
      enableResizing={{
        top: true, right: true, bottom: true, left: true,
        topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
      }}
      style={{ zIndex: 1400 }}
      onResizeStop={handleResizeStop}
      size={{ width: viewportSize.width, height: viewportSize.height + 30 }}
      onResize={(e, direction, ref, delta, position) => {
      }}
    >
      <ViewportContainer>
        <Header className="drag-handle">
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Camera Viewport {isSimulationMode ? '(Simulated)' : (rosTopicName ? `- ${rosTopicName}` : '')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={isSimulationMode ? 'Simulation Mode Active' : (isConnected ? `Connected to ${rosTopicName}` : `Connecting to ${rosTopicName}...`)}>
                 <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    <Box
                      sx={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: isSimulationMode ? 'orange' : (isConnected ? 'lime' : 'red'),
                         boxShadow: `0 0 5px ${isSimulationMode ? 'orange' : (isConnected ? 'lime' : 'red')}`
                      }}
                    />
                 </Box>
             </Tooltip>
             <Tooltip title="Capture Image">
               <IconButton
                 size="small"
                 onClick={handleCaptureImage}
                 disabled={!isSimulationMode && !isConnected}
                 sx={{
                   color: 'rgba(255,255,255,0.7)',
                   '&:hover': { color: 'white' }
                 }}
               >
                 <PhotoCameraIcon fontSize="inherit" />
               </IconButton>
             </Tooltip>
            <Tooltip title="Settings">
              <IconButton
                onClick={handleSettingsClick}
                size="small"
                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } }}
              >
                <SettingsIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close Viewport">
                <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'red' } }}>
                  <CloseIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
          </Box>
          <Menu
             anchorEl={anchorEl}
             open={Boolean(anchorEl)}
             onClose={handleMenuClose}
             PaperProps={{
               sx: {
                 backgroundColor: 'rgba(30, 30, 30, 0.95)',
                 color: 'white',
                 border: '1px solid rgba(100, 100, 100, 0.5)',
                 minWidth: 180
               }
             }}
           >
             <MenuItem dense>
               <FormControlLabel
                 control={
                   <Switch
                     size="small"
                     checked={isSimulationMode}
                     onChange={toggleSimulationMode}
                   />
                 }
                 label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Simulation Mode</Typography>}
                 sx={{ margin: 0, width: '100%' }}
               />
             </MenuItem>
             {!isSimulationMode && (
               <MenuItem dense disabled>
                 <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                   Topic: {rosTopicName}
                 </Typography>
               </MenuItem>
             )}
           </Menu>
        </Header>
        <ContentArea>
           {(viewportSize.width > 0 && viewportSize.height > 0) ? (
                <canvas
                  ref={canvasRef}
                  width={viewportSize.width}
                  height={viewportSize.height}
                  style={{ display: 'block', width: '100%', height: '100%', background: '#222' }}
                  data-camera-viewport="main"
                />
           ) : (
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                    <Typography variant="caption">Initializing...</Typography>
                </Box>
           )}
        </ContentArea>
      </ViewportContainer>
    </Rnd>
  );
};

export default CameraViewportWindow; 