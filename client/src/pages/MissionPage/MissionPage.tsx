import React, { useEffect, useState, useRef } from 'react';
import { Box, Container, Typography, Paper, ToggleButtonGroup, ToggleButton, TextField, Stack, Button, IconButton, LinearProgress, Switch, FormControlLabel, Tabs, Tab, Divider, List, ListItem, ListItemAvatar, ListItemText, ListItemSecondaryAction, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMission } from '../../context/MissionContext';
import Local3DViewer from '../../components/Local3DViewer';
import { GCP, AltitudeReference, LocalCoord, PathSegment, Waypoint, LatLng } from '../../types/mission'; // Import more types
import { generateUUID, latLngToLocal, localToLatLng } from '../../utils/coordinateUtils'; // Import converters
import { generateRasterPathSegment, RasterParams } from '../../utils/pathUtils';
import { feetToMeters } from '../../utils/sensorCalculations'; // Import converter for feet to meters
import { MissionArea } from '../../context/MissionContext'; // Import MissionArea interface
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import UploadIcon from '@mui/icons-material/Upload'; // Import Upload icon
import PanToolIcon from '@mui/icons-material/PanTool'; // Icon for Loiter/Hold
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import DeleteIcon from '@mui/icons-material/Delete';
import MissionPlanningStep from './Steps/MissionPlanningStep'; // Import our renamed component

// MAVLink Commands (Examples)
const MAV_CMD_NAV_WAYPOINT = 16;
const MAV_CMD_NAV_LOITER_UNLIM = 17;
const MAV_CMD_DO_SET_MODE = 176;
// MAVLink Flight Modes (Examples - values depend on specific firmware, e.g., ArduPilot)
const COPTER_FLIGHT_MODE_LOITER = 5;

// Inner component with access to context
const MissionPageContent: React.FC = () => {
  const { state, dispatch } = useMission();
  const { currentMission, isSimulating, isLive, simulationSpeed, simulationProgress, activeControlPane } = state;

  // --- ADD LOG --- Log currentMission on component mount/update
  useEffect(() => {
    console.log('[MissionPageContent] Component Mount/Update. Current Mission:', currentMission);
  }, [currentMission]);
  // --- END LOG ---

  // Determine the current operating mode based on isLive state
  const currentMode = isLive ? 'live' : 'simulation';

  // State for Raster Pattern Inputs
  const [horizontalDistance, setHorizontalDistance] = useState<string>('50');
  const [rowSpacing, setRowSpacing] = useState<string>('10');
  const [numRows, setNumRows] = useState<string>('5');
  const [startAltitude, setStartAltitude] = useState<string>('20');
  // New state for raster options
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [snakePattern, setSnakePattern] = useState<boolean>(true);

  // State for Drone Position (Placeholder for now)
  const [dronePos, setDronePos] = useState<[number, number, number]>([0, 0.5, 0]);

  // State for the starting position of the raster pattern
  const [rasterStartPos, setRasterStartPos] = useState<LocalCoord>({ x: 0, y: 0, z: 0 }); // Default start point on ground

  // State for LIVE drone telemetry (Local Coordinates)
  const [liveDronePosition, setLiveDronePosition] = useState<LocalCoord | null>(null);
  const [liveDroneRotation, setLiveDroneRotation] = useState({ heading: 0, pitch: 0, roll: 0 });

  // Ref for the mock telemetry interval
  const telemetryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Force Local 3D view on component mount
  useEffect(() => {
    dispatch({ type: 'SET_VIEW_MODE', payload: 'LOCAL_3D' });
  }, [dispatch]);

  // Add default GCPs if mission exists and has no GCPs
  useEffect(() => {
    // Only run if there's a mission and it has no GCPs yet
    if (currentMission && (!currentMission.gcps || currentMission.gcps.length === 0)) {
      console.log("Adding default GCPs to mission context...");
      
      // Position GCPs with GCP-A at the center (0,0,0)
      const feetToMeters = 0.3048;
      const sideLength = 15 * feetToMeters; // 15 feet in meters
      
      const defaultSurveyPoints: Array<{ name: string; x: number; y: number; z: number }> = [
        { name: 'GCP-A', x: 0, y: 0, z: 0 }, // Origin GCP - Center of the scene
        { name: 'GCP-B', x: sideLength, y: 0, z: 0 }, // To the right (East) of GCP-A
        { name: 'GCP-C', x: 0, y: sideLength, z: 0 }, // To the front (North) of GCP-A
      ];

      const defaultGcps: GCP[] = defaultSurveyPoints.map(point => ({
        id: generateUUID(), // Use the project's UUID generator
        name: point.name,
        lat: 0, // Dummy global coordinate
        lng: 0, // Dummy global coordinate
        altitude: 0, // Dummy global coordinate
        local: { x: point.x, y: point.y, z: point.z },
        color: point.name === 'GCP-A' ? '#ff0000' : '#00ff00', // Make GCP-A red for visibility
        size: point.name === 'GCP-A' ? 1.5 : 1, // Make GCP-A larger
      }));

      // Dispatch ADD_GCP for each default GCP
      defaultGcps.forEach(gcp => {
        dispatch({ type: 'ADD_GCP', payload: gcp });
      });
      
      // If we have a takeoff point, make sure it's at the center (GCP-A location)
      if (!currentMission.takeoffPoint) {
        dispatch({ 
          type: 'SET_TAKEOFF_POINT', 
          payload: { x: 0, y: 0, z: 0 } 
        });
      }
    }
  }, [currentMission, dispatch]);

  // Handler to generate the raster path
  const handleGeneratePath = () => {
    if (!currentMission) {
      console.error("Cannot generate path without a current mission.");
      // Optionally show an error message to the user
      return;
    }

    const rowLengthNum = parseFloat(horizontalDistance);
    const rowSpacingNum = parseFloat(rowSpacing);
    const numRowsNum = parseInt(numRows, 10);
    const altitudeNum = parseFloat(startAltitude);

    // Basic Input Validation
    if (isNaN(rowLengthNum) || rowLengthNum <= 0 ||
        isNaN(rowSpacingNum) || rowSpacingNum <= 0 ||
        isNaN(numRowsNum) || numRowsNum <= 0 ||
        isNaN(altitudeNum) || altitudeNum < 0) {
      console.error("Invalid raster parameters. Please enter positive numbers.");
      // Optionally show an error message to the user
      return;
    }
    
    // Use RELATIVE altitude reference for the generated path (AGL)
    const altRef = AltitudeReference.RELATIVE;

    // Prepare parameters for the utility function
    const params = {
      startPos: { ...rasterStartPos, z: 0 }, // Start path generation at z=0 relative to startPos
      rowLength: rowLengthNum,
      rowSpacing: rowSpacingNum,
      numRows: numRowsNum,
      altitude: altitudeNum,
      altReference: altRef,
      orientation: orientation, // Pass orientation
      snakePattern: snakePattern, // Pass snake pattern flag
      defaultSpeed: currentMission?.defaultSpeed, // Use optional chaining
    };

    console.log("Generating raster path with params:", params);
    const newPathSegment = generateRasterPathSegment(params);
    console.log("Generated path segment:", newPathSegment);

    // Dispatch action to add the segment
    dispatch({ type: 'ADD_PATH_SEGMENT', payload: newPathSegment });
  };

  // Toggle between simulation and live mode - NOW ONLY SETS THE MODE
  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (newMode === 'simulation') {
      dispatch({ type: 'SET_LIVE_MODE', payload: false });
      // DO NOT start simulation automatically here
      // dispatch({ type: 'START_SIMULATION' }); 
    } else if (newMode === 'live') {
      dispatch({ type: 'STOP_SIMULATION' }); // Stop simulation if switching to live
      dispatch({ type: 'SET_LIVE_MODE', payload: true });
    }
  };

  // Handlers for Play/Pause buttons
  const handlePlaySimulation = () => {
    if (currentMode === 'simulation') {
      dispatch({ type: 'START_SIMULATION' });
    }
  };

  const handlePauseSimulation = () => {
    if (currentMode === 'simulation') {
      dispatch({ type: 'STOP_SIMULATION' });
    }
  };

  // Effect to manage mock WebSocket / Telemetry Interval
  useEffect(() => {
    if (isLive && currentMission?.localOrigin) {
      console.log("LIVE MODE: Starting mock telemetry interval...");
      // Use a slightly more interesting mock movement
      let mockLat = currentMission.localOrigin.latitude;
      let mockLon = currentMission.localOrigin.longitude;
      let mockAlt = 10; // Start 10m relative altitude
      let mockHeading = 0;
      
      telemetryIntervalRef.current = setInterval(() => {
        // Simulate slight movement (e.g., drifting north-east)
        mockLat += 0.00001;
        mockLon += 0.00001;
        mockAlt += Math.sin(Date.now() / 1000) * 0.1; // Bob up and down slightly
        mockHeading = (mockHeading + 1) % 360; // Slow spin

        const mockLatLng: LatLng = { latitude: mockLat, longitude: mockLon };
        const localCoords = latLngToLocal(mockLatLng, currentMission.localOrigin!, mockAlt);
        
        // Update state for the 3D viewer
        setLiveDronePosition(localCoords);
        setLiveDroneRotation({ heading: mockHeading, pitch: 0, roll: 0 }); // Simple rotation for now

        // console.log("Mock Telemetry Update:", { localCoords, heading: mockHeading });
      }, 100); // Update 10 times per second

    } else {
      // Clear interval if not in live mode or no origin
      if (telemetryIntervalRef.current) {
        console.log("LIVE MODE: Stopping mock telemetry interval.");
        clearInterval(telemetryIntervalRef.current);
        telemetryIntervalRef.current = null;
      }
      // Reset live position when leaving live mode
      setLiveDronePosition(null);
      setLiveDroneRotation({ heading: 0, pitch: 0, roll: 0 });
      if (isLive && !currentMission?.localOrigin) {
        console.error("Cannot start live telemetry: Mission local origin is not set.");
      }
    }

    // Cleanup function
    return () => {
      if (telemetryIntervalRef.current) {
        console.log("LIVE MODE: Cleaning up telemetry interval.");
        clearInterval(telemetryIntervalRef.current);
        telemetryIntervalRef.current = null;
      }
    };
  }, [isLive, currentMission?.localOrigin]); // Rerun if mode or origin changes

  // Handler for uploading mission (mock)
  const handleUploadMission = () => {
    if (!currentMission || !currentMission.pathSegments.length || !currentMission.localOrigin) {
      console.error("Cannot upload: No mission, path segments, or local origin available.");
      return;
    }

    // Use the first path segment for simplicity
    const segmentToUpload = currentMission.pathSegments[0]; 
    if (!segmentToUpload.waypoints || segmentToUpload.waypoints.length === 0) {
      console.error("Cannot upload: Selected path segment has no waypoints.");
      return;
    }

    console.log("--- Generating Mock MAVLink Waypoint Plan ---");
    console.log(`Using Local Origin: Lat ${currentMission.localOrigin.latitude}, Lon ${currentMission.localOrigin.longitude}`);

    const mavlinkWaypoints: any[] = [];
    segmentToUpload.waypoints.forEach((wp, index) => {
      if (!wp.local) {
        console.warn(`Skipping waypoint ${index}: Missing local coordinates.`);
        return;
      }
      // Convert local back to global for MAVLink
      const globalWp = localToLatLng(wp.local, currentMission.localOrigin!);
      
      const mavWp = {
        seq: index, // Sequence number
        frame: 3, // MAV_FRAME_GLOBAL_RELATIVE_ALT
        command: MAV_CMD_NAV_WAYPOINT,
        current: index === 0 ? 1 : 0, // Mark first waypoint as current for some autopilots
        autocontinue: 1, // Move to next waypoint automatically
        param1: wp.holdTime || 0, // Hold time in seconds
        param2: 5, // Acceptance radius (e.g., 5 meters)
        param3: 0, // Pass through waypoint (0 = stop at point, >0 = radius to pass through)
        param4: NaN, // Yaw angle (NaN to ignore, or specify in degrees)
        x: globalWp.latitude, // Latitude
        y: globalWp.longitude, // Longitude
        z: wp.altitude // Altitude (relative based on frame)
      };
      mavlinkWaypoints.push(mavWp);
    });

    console.log("Generated Waypoints:", mavlinkWaypoints);
    console.log("--- End Mock MAVLink Plan ---");
    console.log("In a real application, this plan would be sent to the drone via the backend/WebSocket.");
    // TODO: Send `mavlinkWaypoints` array via WebSocket
  };

  // Handler for sending Loiter command (mock)
  const handleLoiterCommand = () => {
    if (!isLive) {
      console.warn("Loiter command only applicable in Live mode.");
      return;
    }
    console.log("--- Sending MAVLink Command (Mock) ---");
    // Option 1: Send Loiter command directly
    console.log("Command: MAV_CMD_NAV_LOITER_UNLIM (17)");
    // Option 2: Set flight mode
    console.log(`Command: MAV_CMD_DO_SET_MODE (176), Mode: ${COPTER_FLIGHT_MODE_LOITER} (Loiter)`);
    console.log("In a real application, this command would be sent via the backend/WebSocket.");
    // TODO: Send appropriate MAVLink command via WebSocket
  };

  // Handler for orientation toggle
  const handleOrientationChange = (
    _event: React.MouseEvent<HTMLElement>,
    newOrientation: 'horizontal' | 'vertical' | null,
  ) => {
    if (newOrientation !== null) {
      setOrientation(newOrientation);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: 'pre-checks' | 'build-scene' | 'mission-planning') => {
    dispatch({ type: 'SET_ACTIVE_CONTROL_PANE', payload: newValue });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeControlPane} 
          onChange={handleTabChange}
          aria-label="mission workflow tabs"
        >
          <StyledTab label="Pre-Checks" value="pre-checks" />
          <StyledTab label="Build Scene" value="build-scene" />
          <StyledTab label="Mission Planning" value="mission-planning" />
        </Tabs>
      </Box>
      
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Panel - Control pane */}
        <Box sx={{ 
          width: '25%', 
          borderRight: 1, 
          borderColor: 'divider', 
          height: '100%', 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {activeControlPane === 'pre-checks' && <MissionPreChecksStep />}
            {activeControlPane === 'build-scene' && <BuildSceneStep />}
            {activeControlPane === 'mission-planning' && <MissionPlanningStep />}
          </Box>
          
          <Divider />
          
          {/* Hardware visualization settings panel */}
          <Box sx={{ height: '40%', overflow: 'auto' }}>
            <HardwareVisualizationSettings />
          </Box>
        </Box>
        
        {/* Right Panel - 3D Viewer */}
        <Box sx={{ width: '75%', height: '100%' }}>
          <Local3DViewer height="100%" />
        </Box>
      </Box>
    </Box>
  );
};

// Add a new component for displaying selected face area information
const SelectedAreaInformation: React.FC = () => {
  const { state } = useMission();
  const { selectedFace } = state;

  if (!selectedFace) return null;

  // Convert area to square feet (assuming area is in square meters)
  const areaInSquareFeet = selectedFace.area * 10.764;

  return (
    <Box sx={{ p: 2, mt: 2, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Selected Mission Area</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <strong>Area ID:</strong> {selectedFace.faceId}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <strong>Surface Area:</strong> {areaInSquareFeet.toFixed(2)} sq ft
      </Typography>
      <Typography variant="body2">
        <strong>Object:</strong> {selectedFace.objectId}
      </Typography>
    </Box>
  );
};

// Add the component to the BuildSceneStep (assuming this component exists)
// If BuildSceneStep doesn't exist, you'll need to create it

const BuildSceneStep: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Build Your Scene</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Add objects to your scene by using the tools below. Click on faces to select areas for mission planning.
      </Typography>
      
      {/* Add scene building controls here */}
      
      {/* Add the selected area information component */}
      <SelectedAreaInformation />
    </Box>
  );
};

// Define StyledTab component
const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.9rem',
  minWidth: 120,
}));

// Define missing step components
const MissionPreChecksStep: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Mission Pre-Checks</Typography>
      <Typography variant="body2">
        Configure mission settings and verify hardware before takeoff.
      </Typography>
    </Box>
  );
};

// Define HardwareVisualizationSettings component (simplified version)
const HardwareVisualizationSettings: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Hardware Visualization</Typography>
      <Typography variant="body2">
        Configure hardware visualization settings.
      </Typography>
    </Box>
  );
};

export default MissionPageContent; 