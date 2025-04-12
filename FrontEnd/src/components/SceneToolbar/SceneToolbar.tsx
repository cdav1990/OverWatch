import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Tooltip, 
  Divider, 
  SpeedDial, 
  SpeedDialIcon, 
  SpeedDialAction
} from '@mui/material';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import RouteIcon from '@mui/icons-material/Route';
import PolylineIcon from '@mui/icons-material/Polyline';
import GridOnIcon from '@mui/icons-material/GridOn';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PublishIcon from '@mui/icons-material/Publish';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMission } from '../../context/MissionContext';
import { PathType } from '../../types/mission';
import AddIcon from '@mui/icons-material/Add';
import EditLocationIcon from '@mui/icons-material/EditLocation';

const SceneToolbar: React.FC = () => {
  const { state, dispatch } = useMission();
  const { isSimulating, simulationSpeed } = state;

  // Add a new waypoint
  const addWaypoint = () => {
    // This is just a placeholder - actual implementation would involve 
    // ray casting into the 3D scene to place waypoints
    console.log('Add waypoint clicked');
  };

  // Add a new path segment
  const addPathSegment = (type: PathType) => {
    console.log(`Add path segment of type ${type}`);
  };

  // Control simulation
  const startSimulation = () => {
    dispatch({ type: 'START_SIMULATION' });
  };

  const pauseSimulation = () => {
    dispatch({ type: 'STOP_SIMULATION' });
  };

  const resetSimulation = () => {
    dispatch({ type: 'STOP_SIMULATION' });
    dispatch({ type: 'SET_SIMULATION_TIME', payload: 0 });
  };

  // Start polygon drawing mode
  const startPolygonDrawing = () => {
    dispatch({ type: 'START_POLYGON_DRAWING' });
  };

  // Define actions for the speed dial
  const actions = [
    { icon: <AddLocationIcon />, name: 'Add Waypoint', onClick: addWaypoint },
    { icon: <RouteIcon />, name: 'Path: Straight', onClick: () => addPathSegment(PathType.STRAIGHT) },
    { icon: <PolylineIcon />, name: 'Path: Bezier', onClick: () => addPathSegment(PathType.BEZIER) },
    { icon: <GridOnIcon />, name: 'Path: Grid', onClick: () => addPathSegment(PathType.GRID) },
    { icon: <EditLocationIcon />, name: 'Draw Polygon Area', onClick: startPolygonDrawing },
  ];

  return (
    <>
      {/* Main toolbar - Remove absolute positioning */}
      <Paper
        elevation={3}
        sx={{ 
          p: 1,
          backgroundColor: 'rgba(35, 45, 55, 0.85)',
          backdropFilter: 'blur(4px)',
          borderRadius: 1,
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Typography variant="subtitle2" sx={{ textAlign: 'center', mb: 1 }}>Mission Controls</Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Tooltip title="Import 3D Model">
            <IconButton size="small" sx={{ color: 'white' }}>
              <PublishIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Save Mission">
            <IconButton size="small" sx={{ color: 'white' }}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete Selected">
            <IconButton size="small" sx={{ color: 'white' }}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          {!isSimulating ? (
            <Tooltip title="Start Simulation">
              <IconButton size="small" onClick={startSimulation} sx={{ color: 'white' }}>
                <PlayArrowIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Pause Simulation">
              <IconButton size="small" onClick={pauseSimulation} sx={{ color: 'white' }}>
                <PauseIcon />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Reset Simulation">
            <IconButton size="small" onClick={resetSimulation} sx={{ color: 'white' }}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      {/* Floating action button - Remove absolute positioning and scaling */}
      <SpeedDial
        ariaLabel="Mission planning actions"
        sx={{ 
          mt: 2
        }}
        icon={<AddIcon />}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.onClick}
          />
        ))}
      </SpeedDial>
    </>
  );
};

export default SceneToolbar; 