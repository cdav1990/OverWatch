import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Divider,
  FormControlLabel,
  Switch,
  Slider,
  TextField,
  Button,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GridOnIcon from '@mui/icons-material/GridOn';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LightModeIcon from '@mui/icons-material/LightMode';
import PaletteIcon from '@mui/icons-material/Palette';
import CloseIcon from '@mui/icons-material/Close';
import { SceneSettings } from '../../context/MissionContext';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: 'rgba(21, 21, 21, 0.95)',
  color: theme.palette.common.white,
  borderRadius: '4px',
  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
}));

const StyledSlider = styled(Slider)(({ theme }) => ({
  color: '#4fc3f7',
  height: 4,
  '& .MuiSlider-rail': {
    opacity: 0.4,
    backgroundColor: '#444',
  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 4,
  },
  '& .MuiSlider-thumb': {
    height: 14,
    width: 14,
    backgroundColor: '#4fc3f7',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: '0 0 0 8px rgba(79, 195, 247, 0.16)',
    },
  },
}));

const StyledSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#4fc3f7',
    '& + .MuiSwitch-track': {
      backgroundColor: 'rgba(79, 195, 247, 0.6)',
    },
  },
  '& .MuiSwitch-switchBase': {
    color: '#9e9e9e',
  },
  '& .MuiSwitch-track': {
    backgroundColor: 'rgba(158, 158, 158, 0.6)',
  },
}));

// Tab Panel component
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scene-settings-tabpanel-${index}`}
      aria-labelledby={`scene-settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface AdvancedSceneSettingsProps {
  settings: SceneSettings;
  onChange: (field: keyof SceneSettings, value: any) => void;
  open: boolean;
  onClose: () => void;
  onSavePreset?: () => void;
  onLoadPreset?: () => void;
}

const AdvancedSceneSettings: React.FC<AdvancedSceneSettingsProps> = ({
  settings,
  onChange,
  open,
  onClose,
  onSavePreset,
  onLoadPreset
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('grid');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  // Calculate the grid size in the current units for display
  const displayGridSize = settings.gridUnit === 'feet' 
    ? metersToFeet(settings.gridSize) 
    : settings.gridSize;
  
  // Convert grid size when the unit changes
  const handleUnitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const usesFeet = event.target.checked;
    const newUnit = usesFeet ? 'feet' : 'meters';
    
    // Update the unit only - don't convert the stored value
    onChange('gridUnit', newUnit);
  };

  // Use Dialog or Modal to make it show/hide based on open prop
  if (!open) return null;

  return (
    <StyledPaper>
      <Typography variant="h6" gutterBottom>
        Advanced Scene Settings
      </Typography>
      <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Close button in header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Advanced Scene Settings</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ 
            '& .MuiTab-root': { color: 'white', opacity: 0.7 },
            '& .Mui-selected': { color: '#4fc3f7', opacity: 1 }
          }}
        >
          <Tab icon={<GridOnIcon />} label="Grid" />
          <Tab icon={<CameraAltIcon />} label="Camera" />
          <Tab icon={<LightModeIcon />} label="Lighting" />
          <Tab icon={<PaletteIcon />} label="Appearance" />
        </Tabs>
      </Box>

      {/* Grid Tab */}
      <TabPanel value={tabValue} index={0}>
        <Accordion 
          expanded={expandedAccordion === 'grid'} 
          onChange={handleAccordionChange('grid')}
          sx={{ backgroundColor: 'rgba(30, 30, 30, 0.7)', color: 'white' }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Typography>Grid Measurements</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" gutterBottom id="grid-size-label">
                  Grid Scale: 300 meters (984 feet)
                </Typography>
                <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                  Fixed grid size for consistent distance visualization
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Grid Divisions: {settings.gridDivisions}
                </Typography>
                <StyledSlider
                  value={settings.gridDivisions}
                  onChange={(e, value) => onChange('gridDivisions', value as number)}
                  min={2}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Major Division Size: 50 meters (164 feet)
                </Typography>
                <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                  Fixed for better scale reference
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Cell Size: {300 / settings.gridDivisions} meters ({(300 / settings.gridDivisions * 3.28084).toFixed(1)} feet)
                </Typography>
                <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                  (Grid size divided by divisions)
                </Typography>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion 
          expanded={expandedAccordion === 'gridVisuals'} 
          onChange={handleAccordionChange('gridVisuals')}
          sx={{ backgroundColor: 'rgba(30, 30, 30, 0.7)', color: 'white', mt: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Typography>Grid Appearance</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box>
                <FormControlLabel
                  control={
                    <StyledSwitch 
                      checked={settings.gridVisible}
                      onChange={(e) => onChange('gridVisible', e.target.checked)}
                    />
                  }
                  label="Show Grid"
                />
              </Box>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Grid Fade Distance
                </Typography>
                <StyledSlider
                  value={settings.gridFadeDistance}
                  onChange={(e, value) => onChange('gridFadeDistance', value as number)}
                  min={5}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    Main Grid Color
                  </Typography>
                  <TextField
                    value={settings.gridColorGrid}
                    onChange={(e) => onChange('gridColorGrid', e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { color: 'white' }, 
                      '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    Major Grid Lines
                  </Typography>
                  <TextField
                    value={settings.gridColorCenterLine}
                    onChange={(e) => onChange('gridColorCenterLine', e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { color: 'white' }, 
                      '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
                    }}
                  />
                </Box>
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </TabPanel>

      {/* Camera Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box>
          <Typography variant="body2" gutterBottom>
            Field of View: {settings.fov.toFixed(0)}°
          </Typography>
          <StyledSlider
            value={settings.fov}
            onChange={(e, value) => onChange('fov', value as number)}
            min={20}
            max={120}
            step={1}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}°`}
          />
        </Box>
      </TabPanel>

      {/* Lighting Tab */}
      <TabPanel value={tabValue} index={2}>
        <Stack spacing={2}>
          <Box>
            <FormControlLabel
              control={
                <StyledSwitch 
                  checked={settings.skyEnabled}
                  onChange={(e) => onChange('skyEnabled', e.target.checked)}
                />
              }
              label="Enable Sky & Sun"
            />
          </Box>
          <Box>
            <Typography variant="body2" gutterBottom>
              Ambient Light: {settings.ambientLightIntensity.toFixed(1)}
            </Typography>
            <StyledSlider
              value={settings.ambientLightIntensity}
              onChange={(e, value) => onChange('ambientLightIntensity', value as number)}
              min={0}
              max={2}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </Box>
          <Box>
            <Typography variant="body2" gutterBottom>
              Directional Light: {settings.directionalLightIntensity.toFixed(1)}
            </Typography>
            <StyledSlider
              value={settings.directionalLightIntensity}
              onChange={(e, value) => onChange('directionalLightIntensity', value as number)}
              min={0}
              max={3}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </Box>
        </Stack>
      </TabPanel>

      {/* Appearance Tab */}
      <TabPanel value={tabValue} index={3}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" gutterBottom>
              Background Color
            </Typography>
            <TextField
              value={settings.backgroundColor}
              onChange={(e) => onChange('backgroundColor', e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ 
                '& .MuiOutlinedInput-root': { color: 'white' }, 
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
          </Box>
          <Box>
            <FormControlLabel
              control={
                <StyledSwitch 
                  checked={settings.axesVisible}
                  onChange={(e) => onChange('axesVisible', e.target.checked)}
                />
              }
              label="Show Coordinate Axes"
            />
          </Box>
        </Stack>
      </TabPanel>

      {/* Preset buttons */}
      {(onSavePreset || onLoadPreset) && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          {onSavePreset && (
            <Button 
              variant="outlined" 
              onClick={onSavePreset}
              sx={{ color: '#4fc3f7', borderColor: '#4fc3f7' }}
            >
              Save Preset
            </Button>
          )}
          {onLoadPreset && (
            <Button 
              variant="outlined" 
              onClick={onLoadPreset}
              sx={{ color: '#4fc3f7', borderColor: '#4fc3f7' }}
            >
              Load Preset
            </Button>
          )}
        </Box>
      )}
    </StyledPaper>
  );
};

export default AdvancedSceneSettings; 