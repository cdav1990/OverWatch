import React, { useEffect, useRef } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMission } from '../../context/MissionContext';
import { GCP, LatLng } from '../../types/mission';
import { generateUUID, latLngToLocal } from '../../utils/coordinateUtils';
import MissionPlanningStep from './Steps/MissionPlanningStep';
// --- Import Step Components ---
import MissionPreChecksStep from './Steps/MissionPreChecksStep';
import BuildSceneStep from './Steps/BuildSceneStep';
// --- Import the CORRECT Hardware Settings Component ---
import HardwareVisualizationSettings from '../../components/HardwareVisualizationSettings/HardwareVisualizationSettings';
import BabylonViewer from '../../components/BabylonViewer/BabylonViewer';
// --- Import SubNavigation Component ---
import SubNavigation from './components/SubNavigation';

// Import icons for the tabs
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import CategoryIcon from '@mui/icons-material/Category';
import RouteIcon from '@mui/icons-material/Route';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

// Create a custom styled Tab component that includes an icon
const StyledTab = styled(Tab)(() => ({
  minHeight: '64px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  color: 'rgba(255, 255, 255, 0.7)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  paddingTop: '6px',
  paddingBottom: '6px',
  '&.Mui-selected': {
    color: '#4fc3f7',
  },
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  '& .MuiTab-iconWrapper': {
    marginBottom: '4px',
    marginRight: '0'
  }
}));

// Inner component with access to context
const MissionPageContent: React.FC = () => {
  const { state, dispatch } = useMission();
  const { currentMission, isLive, activeControlPane } = state;

  // --- ADD LOG --- Log currentMission on component mount/update
  useEffect(() => {
    console.log('[MissionPageContent] Component Mount/Update. Current Mission:', currentMission);
    
    // Add logging to check if SubNavigation will be rendered
    console.log('[MissionPageContent] Active Control Pane:', activeControlPane);
    console.log('[MissionPageContent] SubNavigation should be visible in the right panel');
  }, [currentMission, activeControlPane]);
  // --- END LOG ---

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
      const feetToMetersVal = 0.3048; // Use a local constant
      const sideLength = 15 * feetToMetersVal; // 15 feet in meters

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
        // Convert coordinates but don't use them since we removed the state setters
        latLngToLocal(mockLatLng, currentMission.localOrigin!, mockAlt);

        // console.log("Mock Telemetry Update:", { localCoords, heading: mockHeading });
      }, 100); // Update 10 times per second

    } else {
      // Clear interval if not in live mode or no origin
      if (telemetryIntervalRef.current) {
        console.log("LIVE MODE: Stopping mock telemetry interval.");
        clearInterval(telemetryIntervalRef.current);
        telemetryIntervalRef.current = null;
      }
      
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

  // Add type definition for control pane values
  type ControlPaneType = 'pre-checks' | 'build-scene' | 'mission-planning' | 'hardware' | 'live-operation';

  // Handle tab change with proper typing
  const handleTabChange = (event: React.SyntheticEvent, newValue: ControlPaneType) => {
    // Consider adding specific types instead of 'any' if possible for control pane values
    dispatch({ type: 'SET_ACTIVE_CONTROL_PANE', payload: newValue });
  };

  // Inside MissionsPage component - Preloading logic (adjust as needed)
  useEffect(() => {
    // Preload after a short delay to prioritize initial render
    const timer = setTimeout(() => {
       // Ensure these paths are correct
       import('./Steps/MissionPreChecksStep');
       import('./Steps/BuildSceneStep');
       import('./Steps/MissionPlanningStep');
       import('../../components/HardwareVisualizationSettings/HardwareVisualizationSettings');
    }, 500); // Adjust delay as needed

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 72px)' }}> 
      {/* 1. Top Tabs section */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider', 
        bgcolor: '#1e1e1e',
        flexShrink: 0 // Prevent shrinking
      }}>
        <Tabs
          value={activeControlPane}
          onChange={handleTabChange}
          aria-label="mission workflow tabs"
          indicatorColor="primary"
          textColor="inherit"
          variant="fullWidth"
          sx={{
            minHeight: '64px', // Taller tabs to accommodate icons
            '& .MuiTabs-indicator': {
              backgroundColor: '#4fc3f7',
              height: '3px',
            }
          }}
        >
          <StyledTab 
            icon={<FlightTakeoffIcon />} 
            label="Pre-Checks" 
            value="pre-checks" 
          />
          <StyledTab 
            icon={<CategoryIcon />} 
            label="Build Scene" 
            value="build-scene" 
          />
          <StyledTab 
            icon={<RouteIcon />} 
            label="Mission Planning" 
            value="mission-planning" 
          />
          <StyledTab 
            icon={<CameraAltIcon />} 
            label="Hardware" 
            value="hardware" 
          />
        </Tabs>
      </Box>

      {/* 2. SubNavigation - Moved here, below Tabs, full width */}
      <SubNavigation
          sx={{ 
              // Apply styles matching MissionPlanningLayout toolbar
              backgroundColor: 'rgba(21, 21, 21, 0.97)', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
              flexShrink: 0, // Prevent shrinking
              // Add padding to match Toolbar variant="dense" if needed
              // pl: { xs: 2, sm: 3 }, 
              // pr: { xs: 2, sm: 3 },
          }} 
      />

      {/* 3. Main content area - Takes remaining space */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Panel - Control pane */}
        <Box sx={{
          width: { xs: '100%', sm: '350px' },
          minWidth: '300px',
          borderRight: { sm: 1 },
          borderColor: 'divider',
          height: '100%', // Full height of parent
          overflowY: 'auto',
          bgcolor: '#252526',
          display: 'flex',
          flexDirection: 'column',
          pt: 1,
          position: 'relative',
          zIndex: 5
        }}>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 1, sm: 2 } }}>
            {activeControlPane === 'pre-checks' && <MissionPreChecksStep />}
            {activeControlPane === 'build-scene' && <BuildSceneStep />}
            {activeControlPane === 'mission-planning' && <MissionPlanningStep />}
            {/* Hardware component rendered here based on activeControlPane */}
            {activeControlPane === 'hardware' && <HardwareVisualizationSettings onClose={() => {}} />}
          </Box>
        </Box>

        {/* Right Panel - 3D Viewer - Now occupies remaining space */}
        <Box sx={{
          // width: { xs: '100%', sm: 'calc(100% - 350px)' }, // Width is now determined by flex parent
          flexGrow: 1, // Takes remaining horizontal space
          height: '100%', // Full height of parent
          display: 'flex', // Use flex to manage viewer height 
          flexDirection: 'column', // Stack items vertically
          overflow: 'hidden',
          // Debug border
          // border: process.env.NODE_ENV === 'development' ? '2px dashed blue' : 'none',
        }}>
          {/* BabylonViewer wrapper takes full space available */}
          <Box sx={{ 
            width: '100%', 
            flexGrow: 1, // Takes all vertical space in this panel
            minHeight: 0, // Important for flex item height calculation
            overflow: 'hidden',
            // Debug border
            // border: process.env.NODE_ENV === 'development' ? '2px dotted green' : 'none',
          }}>
            <BabylonViewer />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MissionPageContent; 