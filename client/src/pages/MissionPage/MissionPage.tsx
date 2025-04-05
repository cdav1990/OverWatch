import React, { useEffect, useState, useRef } from 'react';
import { Box, Container, Typography, Paper, ToggleButtonGroup, ToggleButton, TextField, Stack, Button, IconButton, LinearProgress, Switch, FormControlLabel } from '@mui/material';
import { useMission } from '../../context/MissionContext';
import Local3DViewer from '../../components/Local3DViewer/Local3DViewer';
import { GCP, AltitudeReference, LocalCoord, PathSegment, Waypoint, LatLng } from '../../types/mission'; // Import more types
import { generateUUID, latLngToLocal, localToLatLng } from '../../utils/coordinateUtils'; // Import converters
import { generateRasterPathSegment, RasterParams } from '../../utils/pathUtils';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import UploadIcon from '@mui/icons-material/Upload'; // Import Upload icon
import PanToolIcon from '@mui/icons-material/PanTool'; // Icon for Loiter/Hold

// MAVLink Commands (Examples)
const MAV_CMD_NAV_WAYPOINT = 16;
const MAV_CMD_NAV_LOITER_UNLIM = 17;
const MAV_CMD_DO_SET_MODE = 176;
// MAVLink Flight Modes (Examples - values depend on specific firmware, e.g., ArduPilot)
const COPTER_FLIGHT_MODE_LOITER = 5;

// Inner component with access to context
const MissionPageContent: React.FC = () => {
  const { state, dispatch } = useMission();
  const { currentMission, isSimulating, isLive, simulationSpeed, simulationProgress } = state;

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
      const defaultSurveyPoints: Array<{ name: string; x: number; y: number; z: number }> = [
        { name: 'Point A', x: 0, y: 0, z: 0 },
        { name: 'Point B', x: 10, y: 0, z: 0 },
        { name: 'Point C', x: 10, y: 10, z: 1 },
      ];

      const defaultGcps: GCP[] = defaultSurveyPoints.map(point => ({
        id: generateUUID(), // Use the project's UUID generator
        name: point.name,
        lat: 0, // Dummy global coordinate
        lng: 0, // Dummy global coordinate
        altitude: 0, // Dummy global coordinate
        local: { x: point.x, y: point.y, z: point.z },
        color: '#00ff00',
        size: 1.5,
      }));

      // Dispatch ADD_GCP for each default GCP
      defaultGcps.forEach(gcp => {
        dispatch({ type: 'ADD_GCP', payload: gcp });
      });
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

  return (
    <Container maxWidth={false} disableGutters sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={1} sx={{ p: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Mission Planning</Typography>
            <Typography variant="body2">
              Plan missions using imported 3D models or LiDAR data, create waypoints, and simulate flights.
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> { /* Group mode toggle and controls */}
            <ToggleButtonGroup
              value={currentMode} // Use derived mode state
              exclusive
              onChange={handleModeChange}
              aria-label="mission mode"
              size="small"
            >
              <ToggleButton value="simulation" aria-label="simulation mode">
                Simulation
              </ToggleButton>
              <ToggleButton value="live" aria-label="live mode">
                Live
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Play/Pause Controls - Visible only in Simulation mode */}
            {currentMode === 'simulation' && (
              <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1 }}>
                <IconButton 
                  onClick={handlePlaySimulation} 
                  disabled={isSimulating} // Disable Play if already simulating
                  size="small"
                  aria-label="play simulation"
                >
                  <PlayArrowIcon />
                </IconButton>
                <IconButton 
                  onClick={handlePauseSimulation} 
                  disabled={!isSimulating} // Disable Pause if not simulating
                  size="small"
                  aria-label="pause simulation"
                >
                  <PauseIcon />
                </IconButton>
              </Box>
            )}

            {/* Upload Button - Visible only in Live mode */}
            {currentMode === 'live' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                onClick={handleUploadMission}
                disabled={!currentMission || !currentMission.pathSegments.length || !currentMission.localOrigin}
                sx={{ ml: 1 }} // Add some margin
              >
                Upload Plan (Mock)
              </Button>
            )}

            {/* Loiter Button - Visible only in Live mode */}
            {currentMode === 'live' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<PanToolIcon />} // Use appropriate icon
                onClick={handleLoiterCommand}
                disabled={!isLive} // Should always be enabled in live mode? Maybe disable if not connected?
                sx={{ ml: 1, color: 'orange', borderColor: 'orange' }} 
              >
                Loiter (Mock)
              </Button>
            )}
          </Box>
        </Box>
        {/* Simulation Progress Bar/Text - Visible only when simulating */}
        {isSimulating && simulationProgress.currentSegmentId && simulationProgress.totalWaypointsInSegment > 0 && (
          <Box sx={{ width: '100%', mt: 1, px: 1 }}>
            <Typography variant="caption" display="block" gutterBottom>
              Simulating: Heading towards Waypoint {simulationProgress.currentWaypointIndex} of {simulationProgress.totalWaypointsInSegment}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={((simulationProgress.currentWaypointIndex -1) / simulationProgress.totalWaypointsInSegment) * 100} 
            />
          </Box>
        )}
      </Paper>

      <Box sx={{ 
        flex: 1, 
        minHeight: 0, 
        display: 'flex', 
        flexDirection: 'row',
        overflow: 'hidden'
      }}>
        {/* This is the left panel */}
        <Paper elevation={2} sx={{ width: '600px', p: 2, mr: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <Typography variant="h6" gutterBottom>Controls</Typography>
          
          <Box sx={{ border: '1px dashed grey', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Typography variant="caption">Compass Placeholder (N, E, S, W)</Typography>
          </Box>

          <Typography variant="subtitle1" gutterBottom>Raster Pattern</Typography>
          <Stack spacing={2}>
            <TextField 
              label="Pattern Length (Distance)" 
              variant="outlined" 
              size="small" 
              fullWidth
              value={horizontalDistance}
              onChange={(e) => setHorizontalDistance(e.target.value)}
              helperText={orientation === 'horizontal' ? "Length of each East/West row" : "Length of each North/South column"}
            />
            <TextField 
              label="Pattern Spacing" 
              variant="outlined" 
              size="small" 
              fullWidth
              value={rowSpacing}
              onChange={(e) => setRowSpacing(e.target.value)}
              helperText={orientation === 'horizontal' ? "Distance between North/South rows" : "Distance between East/West columns"}
            />
            <TextField 
              label="Number of Passes" 
              variant="outlined" 
              size="small" 
              fullWidth
              value={numRows}
              onChange={(e) => setNumRows(e.target.value)}
              helperText={orientation === 'horizontal' ? "Number of rows" : "Number of columns"}
            />
            <TextField 
              label="Start Altitude (AGL)" 
              variant="outlined" 
              size="small" 
              type="number" // Use number type
              fullWidth
              value={startAltitude}
              onChange={(e) => setStartAltitude(e.target.value)}
              InputProps={{ inputProps: { min: 0 } }} // Prevent negative numbers via HTML5 validation
            />
            {/* Placeholder for selecting start position (e.g., click on map) */}
            <Typography variant="caption">
              Start Position: (X: {rasterStartPos.x}, Y: {rasterStartPos.y}, Z: {rasterStartPos.z})
            </Typography>
            
            {/* Orientation Toggle */}
            <Box>
              <Typography variant="caption" display="block">Orientation:</Typography>
              <ToggleButtonGroup
                value={orientation}
                exclusive
                onChange={handleOrientationChange}
                aria-label="pattern orientation"
                size="small"
                fullWidth
              >
                <ToggleButton value="horizontal" aria-label="horizontal pattern">
                  Horizontal (E/W)
                </ToggleButton>
                <ToggleButton value="vertical" aria-label="vertical pattern">
                  Vertical (N/S)
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Snake Pattern Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={snakePattern}
                  onChange={(e) => setSnakePattern(e.target.checked)}
                  name="snakePattern"
                  size="small"
                />
              }
              label="Snake Pattern (Zigzag)"
              labelPlacement="start"
              sx={{ justifyContent: 'space-between', ml: 0, mr: 0.5 }}
            />
            
            <Button 
              variant="contained" 
              onClick={handleGeneratePath}
              disabled={!currentMission} // Disable if no mission is loaded
            >
              Generate Path Preview
            </Button>
          </Stack>
        </Paper>

        <Box sx={{ 
          flex: 1, 
          minHeight: 0, 
          position: 'relative',
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          {/* Compass Overlay */}
          <Box 
            sx={{ 
              position: 'absolute',
              top: 16,
              left: 16,
              width: 60,
              height: 60,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid grey',
              zIndex: 10, // Ensure it's above the canvas
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}
          >
            {/* Simple text-based compass */}
            <Box sx={{ position: 'absolute', top: 2 }}>N</Box>
            <Box sx={{ position: 'absolute', bottom: 2 }}>S</Box>
            <Box sx={{ position: 'absolute', left: 5 }}>W</Box>
            <Box sx={{ position: 'absolute', right: 5 }}>E</Box>
          </Box>

          <Local3DViewer 
            height="100%" 
            // Pass live telemetry data down
            liveDronePosition={liveDronePosition}
            liveDroneRotation={liveDroneRotation}
          />
        </Box>
      </Box>
    </Container>
  );
};

export default MissionPageContent; 