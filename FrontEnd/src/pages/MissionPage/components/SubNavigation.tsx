import React, { useEffect } from 'react';
import { Box, IconButton, Tooltip, SxProps, Theme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMission } from '../../../context/MissionContext';

// Icons
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import CategoryIcon from '@mui/icons-material/Category';
import RouteIcon from '@mui/icons-material/Route';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

const NavIconButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
  padding: theme.spacing(1),
  color: 'rgba(255, 255, 255, 0.7)',
  borderRadius: theme.shape.borderRadius * 0.5,
  border: '1px solid transparent',
  minWidth: 0,
  
  '&.active': {
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    color: '#4fc3f7',
    borderColor: 'rgba(79, 195, 247, 0.5)',
    '&:hover': {
      backgroundColor: 'rgba(79, 195, 247, 0.25)',
    }
  },
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  }
}));

interface SubNavigationProps {
  className?: string;
  sx?: SxProps<Theme>;
}

const SubNavigation: React.FC<SubNavigationProps> = ({ className, sx }) => {
  const { state, dispatch } = useMission();
  const { activeControlPane } = state;

  // Enhanced debugging useEffect with more details
  useEffect(() => {
    console.log('=== SubNavigation Component Debug Info ===');
    console.log('Component mounted and rendering');
    console.log('Active control pane:', activeControlPane);
    console.log('Props:', { className, sx });
    
    // Log style props that might affect visibility
    console.log('Style props that might affect visibility:');
    if (sx) {
      const visibilityKeys = ['display', 'visibility', 'opacity', 'zIndex', 'position'];
      const relevantStyles = Object.entries(sx)
        .filter(([key]) => visibilityKeys.includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      console.log('Relevant styles:', relevantStyles);
    }
    
    // Check parent container
    console.log('Parent container should have sufficient height for this component (min 48px)');
    console.log('=== End SubNavigation Debug Info ===');
  }, [className, sx, activeControlPane]);

  const handleNavClick = (pane: 'pre-checks' | 'build-scene' | 'mission-planning' | 'hardware') => {
    console.log('SubNavigation: Icon clicked for pane:', pane);
    dispatch({ type: 'SET_ACTIVE_CONTROL_PANE', payload: pane });
  };

  return (
    <Box className={className} sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      py: 0.5,
      px: 1,
      ...sx
    }}>
      <Tooltip title="Pre-Checks">
        <NavIconButton 
          onClick={() => handleNavClick('pre-checks')}
          className={activeControlPane === 'pre-checks' ? 'active' : ''}
          aria-label="Pre-Checks"
        >
          <FlightTakeoffIcon fontSize="small" />
        </NavIconButton>
      </Tooltip>
      
      <Tooltip title="Build Scene">
        <NavIconButton 
          onClick={() => handleNavClick('build-scene')}
          className={activeControlPane === 'build-scene' ? 'active' : ''}
          aria-label="Build Scene"
        >
          <CategoryIcon fontSize="small" />
        </NavIconButton>
      </Tooltip>
      
      <Tooltip title="Mission Planning">
        <NavIconButton 
          onClick={() => handleNavClick('mission-planning')}
          className={activeControlPane === 'mission-planning' ? 'active' : ''}
          aria-label="Mission Planning"
        >
          <RouteIcon fontSize="small" />
        </NavIconButton>
      </Tooltip>
      
      <Tooltip title="Hardware Visualization">
        <NavIconButton 
          onClick={() => handleNavClick('hardware')}
          className={activeControlPane === 'hardware' ? 'active' : ''}
          aria-label="Hardware Visualization"
        >
          <CameraAltIcon fontSize="small" />
        </NavIconButton>
      </Tooltip>
    </Box>
  );
};

export default SubNavigation; 