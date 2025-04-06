import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Grid, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMission } from '../../context/MissionContext';

// Import steps components
import MissionPreChecksStep from '../Steps/MissionPreChecksStep';
import BuildSceneStep from '../Steps/BuildSceneStep';
// Import other components
import Local3DViewer from '../../components/Local3DViewer';
import HardwareVisualizationSettings from '../../components/HardwareVisualizationSettings/HardwareVisualizationSettings';

// Define styled components as needed
const StyledTab = styled(Tab)(({ theme }) => ({
  minWidth: 120,
  fontSize: '0.85rem',
  textTransform: 'none',
  fontWeight: 500,
  // Add more styles as needed
}));

const MissionPage: React.FC = () => {
  const { state, dispatch } = useMission();
  const { activeControlPane } = state;
  
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
      
      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Panel - Control pane */}
        <Grid item xs={3} sx={{ borderRight: 1, borderColor: 'divider', height: '100%', overflow: 'auto' }}>
          {activeControlPane === 'pre-checks' && <MissionPreChecksStep />}
          {activeControlPane === 'build-scene' && <BuildSceneStep />}
          {activeControlPane === 'mission-planning' && <Typography p={2}>Mission Planning Step (Coming Soon)</Typography>}
          
          {/* Hardware visualization settings panel - always shown */}
          <HardwareVisualizationSettings height="auto" />
        </Grid>
        
        {/* Right Panel - 3D Viewer */}
        <Grid item xs={9} sx={{ height: '100%' }}>
          <Local3DViewer height="100%" />
        </Grid>
      </Grid>
    </Box>
  );
};

export default MissionPage; 