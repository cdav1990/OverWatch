import React from 'react';
import { Box, Paper, Typography, Tabs, Tab, Button } from '@mui/material';
import { useMission } from '../../context/MissionContext';
import CesiumGlobe from '../CesiumGlobe/CesiumGlobe';
import Local3DViewer from '../Local3DViewer/Local3DViewer';
import { LatLng } from '../../types/mission';

const MissionPlanner: React.FC = () => {
  const { state, dispatch } = useMission();
  const { viewMode, currentMission } = state;

  // Handle view mode toggle
  const handleViewModeChange = (_event: React.SyntheticEvent, newValue: 'CESIUM' | 'LOCAL_3D') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: newValue });
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={1}
        sx={{ 
          mb: 0.5,
          px: 2,
          py: 0.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {currentMission 
              ? `Mission: ${currentMission.name}` 
              : 'Mission Planning'
            }
          </Typography>
          
          {currentMission && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
              Region: {currentMission.region.name} | 
              Center: {formatLatLng(currentMission.region.center)} |
              Waypoints: {countWaypoints()}
            </Typography>
          )}
        </Box>
        
        <Tabs 
          value={viewMode} 
          onChange={handleViewModeChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab value="CESIUM" label="Global View" disabled={!currentMission} />
          <Tab value="LOCAL_3D" label="Local 3D View" disabled={!currentMission} />
        </Tabs>
      </Paper>
      
      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {viewMode === 'CESIUM' ? (
          <CesiumGlobe height="100%" />
        ) : (
          <Local3DViewer height="100%" />
        )}
      </Box>
    </Box>
  );

  // Helper to count waypoints
  function countWaypoints(): number {
    if (!currentMission) return 0;
    return currentMission.pathSegments.reduce(
      (count, segment) => count + segment.waypoints.length, 
      0
    );
  }
  
  // Format lat/lng for display
  function formatLatLng(latLng: LatLng): string {
    return `${latLng.latitude.toFixed(5)}°, ${latLng.longitude.toFixed(5)}°`;
  }
};

export default MissionPlanner; 