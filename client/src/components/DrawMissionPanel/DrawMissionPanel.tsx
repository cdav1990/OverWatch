import React from 'react';
import {
  Box,
  Typography,
  Button,
  ButtonGroup,
  Paper,
  Divider,
  Tooltip
} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';

interface DrawMissionPanelProps {
  onDrawBox: () => void;
  onSetPoint: () => void;
  onDrawArea: () => void;
  // Optional: Add props to indicate current drawing mode for button variants
  // drawingMode?: 'box' | 'point' | 'area' | null;
}

const DrawMissionPanel: React.FC<DrawMissionPanelProps> = ({
  onDrawBox,
  onSetPoint,
  onDrawArea,
  // drawingMode 
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: '80px', // Adjust position as needed (below GeoToolbar)
        left: '10px',
        p: 1.5,
        backgroundColor: 'rgba(35, 45, 55, 0.9)', // Match theme or original style
        borderRadius: 1,
        maxWidth: '200px', // Adjust width
        backdropFilter: 'blur(4px)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        color: 'white',
        zIndex: 1001 // Ensure it's above the map
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>
        Define Area
      </Typography>
      <Divider sx={{ my: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
      <ButtonGroup 
        orientation="vertical" 
        variant="outlined" 
        size="small" 
        fullWidth
        sx={{ 
          '& .MuiButton-outlined': { 
            color: 'white', 
            borderColor: 'rgba(255,255,255,0.3)' 
          },
          '& .MuiButton-root': { // Ensure consistent height/padding
             justifyContent: 'flex-start',
             padding: '6px 12px'
          }
        }}
      >
        <Tooltip title="Draw a rectangular mission area">
          <Button 
            startIcon={<AddBoxIcon />} 
            onClick={onDrawBox}
            // variant={drawingMode === 'box' ? 'contained' : 'outlined'}
          >
            Draw Box
          </Button>
        </Tooltip>
        <Tooltip title="Set a single point mission area">
          <Button 
            startIcon={<LocationOnIcon />} 
            onClick={onSetPoint}
            // variant={drawingMode === 'point' ? 'contained' : 'outlined'}
          >
            Set Point
          </Button>
        </Tooltip>
        <Tooltip title="Draw a polygon mission area">
          <Button 
            startIcon={<EditIcon />} 
            onClick={onDrawArea}
            // variant={drawingMode === 'area' ? 'contained' : 'outlined'}
          >
            Draw Area
          </Button>
        </Tooltip>
      </ButtonGroup>
       {/* Optional: Add area info display here later */}
       {/* Optional: Add Clear Selection button here later */}
    </Paper>
  );
};

export default DrawMissionPanel; 