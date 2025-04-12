import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  SelectChangeEvent,
  styled
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { useMission } from '../../context/MissionContext';
import { useMissionOptimizer } from '../../hooks/useMissionOptimizer';

// Specialized configurations for Pix4D-enabled drones
export interface Pix4DConfiguration {
  id: string;
  name: string;
  hardware: {
    drone: string;
    camera: string;
    lens: string;
    lidar: string;
    controller: string;
  };
  flightParams: {
    defaultSpeed: number;
    maxSpeed: number;
    defaultAltitude: number;
    overlaps: {
      front: number;
      side: number;
    };
    gridSpacing: number;
  };
  cameraParams: {
    triggerInterval: number;
    shutterSpeed: string;
    iso: number;
    focalLength: number;
  };
}

// Pre-defined configurations for Pix4D-compatible drones
export const PIX4D_CONFIGURATIONS: Pix4DConfiguration[] = [
  {
    id: 'freefly-alta-x-photogrammetry',
    name: 'Freefly Alta X - Photogrammetry',
    hardware: {
      drone: 'freefly-alta-x',
      camera: 'phase-one-ixm-100',
      lens: 'phaseone-rsm-80mm',
      lidar: 'ouster-os0-128',
      controller: 'cube-blue'
    },
    flightParams: {
      defaultSpeed: 5,
      maxSpeed: 10,
      defaultAltitude: 60,
      overlaps: {
        front: 80,
        side: 70
      },
      gridSpacing: 20
    },
    cameraParams: {
      triggerInterval: 2,
      shutterSpeed: '1/1000',
      iso: 200,
      focalLength: 80
    }
  },
  {
    id: 'freefly-astro-mapping',
    name: 'Freefly Astro - Mapping',
    hardware: {
      drone: 'freefly-astro',
      camera: 'phase-one-ixm-100',
      lens: 'phaseone-rsm-80mm',
      lidar: 'ouster-os0-128',
      controller: 'cube-blue'
    },
    flightParams: {
      defaultSpeed: 4,
      maxSpeed: 8,
      defaultAltitude: 80,
      overlaps: {
        front: 75,
        side: 65
      },
      gridSpacing: 25
    },
    cameraParams: {
      triggerInterval: 3,
      shutterSpeed: '1/800',
      iso: 400,
      focalLength: 80
    }
  }
];

// Styled components
const StyledAccordion = styled(Accordion)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: '4px',
  marginBottom: theme.spacing(2),
  '&:before': {
    display: 'none', // Remove the default border
  },
  '&.Mui-expanded': {
    margin: `0 0 ${theme.spacing(2)} 0`,
  }
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  padding: theme.spacing(0, 1),
  minHeight: '48px',
  '& .MuiAccordionSummary-content': {
    margin: theme.spacing(1, 0),
  }
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: '100%',
  '& .MuiOutlinedInput-root': {
    color: 'rgba(255, 255, 255, 0.9)',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#4fc3f7',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    '&.Mui-focused': {
      color: '#4fc3f7',
    },
  },
  '& .MuiSvgIcon-root': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiOutlinedInput-root': {
    color: 'rgba(255, 255, 255, 0.9)',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#4fc3f7',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    '&.Mui-focused': {
      color: '#4fc3f7',
    },
  },
}));

const ParamLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.6)',
  marginBottom: theme.spacing(0.5),
}));

const ChipRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginBottom: theme.spacing(1.5),
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  backgroundColor: 'rgba(79, 195, 247, 0.15)',
  color: '#4fc3f7',
  border: '1px solid rgba(79, 195, 247, 0.3)',
  height: '24px',
  fontSize: '0.75rem',
}));

const WarningChip = styled(Chip)(({ theme }) => ({
  backgroundColor: 'rgba(255, 152, 0, 0.15)',
  color: '#ff9800',
  border: '1px solid rgba(255, 152, 0, 0.3)',
  height: '24px',
  fontSize: '0.75rem',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
  fontSize: '0.75rem',
  padding: theme.spacing(0.75, 2),
  textTransform: 'none',
  fontWeight: 500,
  boxShadow: 'none',
  '&.MuiButton-containedPrimary': {
    backgroundColor: '#4fc3f7',
    color: '#121212',
    '&:hover': {
      backgroundColor: '#81d4fa',
    },
  },
}));

interface Pix4DPresetsProps {
  onConfigurationSelected: (config: Pix4DConfiguration) => void;
}

const Pix4DPresets: React.FC<Pix4DPresetsProps> = ({ onConfigurationSelected }) => {
  const { state, dispatch } = useMission();
  const missionOptimizer = useMissionOptimizer();
  
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [customConfig, setCustomConfig] = useState<Pix4DConfiguration | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // When a configuration is selected, set up the custom config
  useEffect(() => {
    if (selectedConfig) {
      const config = PIX4D_CONFIGURATIONS.find(c => c.id === selectedConfig);
      if (config) {
        setCustomConfig({ ...config });
      }
    } else {
      setCustomConfig(null);
    }
  }, [selectedConfig]);

  // Handle configuration selection
  const handleConfigChange = (event: SelectChangeEvent) => {
    setSelectedConfig(event.target.value);
    setError(null);
  };

  // Update a specific parameter in the custom configuration
  const updateConfigParam = (
    section: 'flightParams' | 'cameraParams',
    param: string,
    value: any
  ) => {
    if (!customConfig) return;
    
    setCustomConfig({
      ...customConfig,
      [section]: {
        ...customConfig[section],
        [param]: value
      }
    });
  };

  // Apply the selected configuration
  const applyConfiguration = () => {
    if (!customConfig) return;
    
    try {
      setIsGenerating(true);
      setError(null);
      
      // Apply hardware configuration
      dispatch({
        type: 'SET_HARDWARE',
        payload: {
          drone: customConfig.hardware.drone,
          camera: customConfig.hardware.camera,
          lens: customConfig.hardware.lens,
          lidar: customConfig.hardware.lidar,
          iso: customConfig.cameraParams.iso,
          shutterSpeed: customConfig.cameraParams.shutterSpeed
        }
      });
      
      // Update mission parameters if a mission exists
      if (state.currentMission) {
        dispatch({
          type: 'SET_MISSION',
          payload: {
            ...state.currentMission,
            defaultSpeed: customConfig.flightParams.defaultSpeed,
            defaultAltitude: customConfig.flightParams.defaultAltitude,
            updatedAt: new Date()
          }
        });
      }
      
      // Notify parent component
      onConfigurationSelected(customConfig);
      
      setIsGenerating(false);
    } catch (err) {
      console.error('Error applying Pix4D configuration:', err);
      setError('Failed to apply configuration. Please try again.');
      setIsGenerating(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#4fc3f7', mb: 1 }}>
        <SettingsIcon sx={{ fontSize: '0.9rem', verticalAlign: 'middle', mr: 0.5 }} />
        Pix4D Configuration
      </Typography>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2, 
            backgroundColor: 'rgba(244, 67, 54, 0.1)', 
            color: '#f44336',
            '& .MuiAlert-icon': { color: '#f44336' } 
          }}
        >
          {error}
        </Alert>
      )}
      
      <StyledFormControl size="small">
        <InputLabel id="pix4d-config-label">Select Configuration</InputLabel>
        <Select
          labelId="pix4d-config-label"
          value={selectedConfig}
          label="Select Configuration"
          onChange={handleConfigChange}
          sx={{ fontSize: '0.85rem' }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {PIX4D_CONFIGURATIONS.map((config) => (
            <MenuItem key={config.id} value={config.id}>
              {config.name}
            </MenuItem>
          ))}
        </Select>
      </StyledFormControl>
      
      {customConfig && (
        <>
          <ChipRow>
            <StyledChip 
              label={customConfig.hardware.drone.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')} 
            />
            <StyledChip label={`${customConfig.flightParams.defaultAltitude}m Altitude`} />
            <StyledChip label={`${customConfig.flightParams.defaultSpeed}m/s Speed`} />
            {missionOptimizer.totalWaypointCount > 1000 && (
              <WarningChip label="Large Mission" />
            )}
          </ChipRow>
          
          <StyledAccordion>
            <StyledAccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Flight Parameters
              </Typography>
            </StyledAccordionSummary>
            <StyledAccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Box>
                  <ParamLabel>Default Speed (m/s)</ParamLabel>
                  <StyledTextField
                    size="small"
                    type="number"
                    inputProps={{ min: 1, max: 20, step: 0.5 }}
                    value={customConfig.flightParams.defaultSpeed}
                    onChange={(e) => updateConfigParam('flightParams', 'defaultSpeed', Number(e.target.value))}
                    fullWidth
                  />
                </Box>
                <Box>
                  <ParamLabel>Default Altitude (m)</ParamLabel>
                  <StyledTextField
                    size="small"
                    type="number"
                    inputProps={{ min: 10, max: 400, step: 5 }}
                    value={customConfig.flightParams.defaultAltitude}
                    onChange={(e) => updateConfigParam('flightParams', 'defaultAltitude', Number(e.target.value))}
                    fullWidth
                  />
                </Box>
                <Box>
                  <ParamLabel>Front Overlap (%)</ParamLabel>
                  <StyledTextField
                    size="small"
                    type="number"
                    inputProps={{ min: 50, max: 90, step: 5 }}
                    value={customConfig.flightParams.overlaps.front}
                    onChange={(e) => updateConfigParam(
                      'flightParams', 
                      'overlaps', 
                      { ...customConfig.flightParams.overlaps, front: Number(e.target.value) }
                    )}
                    fullWidth
                  />
                </Box>
                <Box>
                  <ParamLabel>Side Overlap (%)</ParamLabel>
                  <StyledTextField
                    size="small"
                    type="number"
                    inputProps={{ min: 50, max: 90, step: 5 }}
                    value={customConfig.flightParams.overlaps.side}
                    onChange={(e) => updateConfigParam(
                      'flightParams', 
                      'overlaps', 
                      { ...customConfig.flightParams.overlaps, side: Number(e.target.value) }
                    )}
                    fullWidth
                  />
                </Box>
              </Box>
            </StyledAccordionDetails>
          </StyledAccordion>
          
          <StyledAccordion>
            <StyledAccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Camera Parameters
              </Typography>
            </StyledAccordionSummary>
            <StyledAccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Box>
                  <ParamLabel>Shutter Speed</ParamLabel>
                  <StyledFormControl size="small" fullWidth>
                    <Select
                      value={customConfig.cameraParams.shutterSpeed}
                      onChange={(e) => updateConfigParam('cameraParams', 'shutterSpeed', e.target.value)}
                      sx={{ fontSize: '0.85rem' }}
                    >
                      <MenuItem value="1/500">1/500</MenuItem>
                      <MenuItem value="1/800">1/800</MenuItem>
                      <MenuItem value="1/1000">1/1000</MenuItem>
                      <MenuItem value="1/1600">1/1600</MenuItem>
                      <MenuItem value="1/2000">1/2000</MenuItem>
                    </Select>
                  </StyledFormControl>
                </Box>
                <Box>
                  <ParamLabel>ISO</ParamLabel>
                  <StyledFormControl size="small" fullWidth>
                    <Select
                      value={customConfig.cameraParams.iso}
                      onChange={(e) => updateConfigParam('cameraParams', 'iso', Number(e.target.value))}
                      sx={{ fontSize: '0.85rem' }}
                    >
                      <MenuItem value={100}>100</MenuItem>
                      <MenuItem value={200}>200</MenuItem>
                      <MenuItem value={400}>400</MenuItem>
                      <MenuItem value={800}>800</MenuItem>
                    </Select>
                  </StyledFormControl>
                </Box>
                <Box>
                  <ParamLabel>Trigger Interval (s)</ParamLabel>
                  <StyledTextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0.5, max: 10, step: 0.5 }}
                    value={customConfig.cameraParams.triggerInterval}
                    onChange={(e) => updateConfigParam('cameraParams', 'triggerInterval', Number(e.target.value))}
                    fullWidth
                  />
                </Box>
              </Box>
            </StyledAccordionDetails>
          </StyledAccordion>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ActionButton
              variant="contained"
              color="primary"
              onClick={applyConfiguration}
              startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <FlightTakeoffIcon />}
              disabled={isGenerating}
            >
              {isGenerating ? 'Applying...' : 'Apply Configuration'}
            </ActionButton>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Pix4DPresets; 