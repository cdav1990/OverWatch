import React, { useState, useCallback, memo } from 'react';
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
  IconButton,
  Tooltip,
  alpha,
  InputAdornment,
  Fade,
  Collapse,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import GridOnIcon from '@mui/icons-material/GridOn';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LightModeIcon from '@mui/icons-material/LightMode';
import PaletteIcon from '@mui/icons-material/Palette';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { SceneSettings } from '../../context/MissionContext';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';

// Type definitions
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface AdvancedSceneSettingsProps {
  settings: SceneSettings;
  onChange: (field: keyof SceneSettings, value: any) => void;
  open: boolean;
  onClose: () => void;
  onSavePreset?: () => void;
  onLoadPreset?: () => void;
}

interface SceneTheme {
  name: string;
  backgroundColor: string;
  gridColorGrid: string;
  gridColorCenterLine: string;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
}

// Predefined scene themes
const SCENE_THEMES: SceneTheme[] = [
  {
    name: "Default Dark",
    backgroundColor: "#121212",
    gridColorGrid: "#303030",
    gridColorCenterLine: "#4fc3f7",
    ambientLightIntensity: 0.5,
    directionalLightIntensity: 1.0
  },
  {
    name: "Minimal Light",
    backgroundColor: "#f5f5f5",
    gridColorGrid: "#e0e0e0",
    gridColorCenterLine: "#2196f3",
    ambientLightIntensity: 0.7,
    directionalLightIntensity: 1.2
  },
  {
    name: "Blueprint",
    backgroundColor: "#0a192f",
    gridColorGrid: "#172a45",
    gridColorCenterLine: "#64ffda",
    ambientLightIntensity: 0.4,
    directionalLightIntensity: 0.9
  },
  {
    name: "High Contrast",
    backgroundColor: "#000000",
    gridColorGrid: "#333333",
    gridColorCenterLine: "#ff4081",
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 1.4
  }
];

// Styled components
const StyledPanel = styled(Paper)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.95),
  color: theme.palette.text.primary,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[10],
  backdropFilter: 'blur(8px)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '85vh',
  maxWidth: '450px',
  width: '100%',
  position: 'relative',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
}));

const StyledHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(2, 2, 1.5, 2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  '& .MuiTab-root': {
    minWidth: 'auto',
    minHeight: '48px',
    padding: theme.spacing(1),
    fontSize: '0.85rem'
  }
}));

const StyledSlider = styled(Slider)(({ theme }) => ({
  color: theme.palette.primary.main,
  height: 4,
  '& .MuiSlider-rail': {
    opacity: 0.3,
  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 4,
  },
  '& .MuiSlider-thumb': {
    height: 14,
    width: 14,
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
    },
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    fontSize: '0.9rem',
    backgroundColor: alpha(theme.palette.background.default, 0.4),
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.85rem',
  }
}));

const ColorBlockButton = styled(Button)<{ bgColor: string }>(({ theme, bgColor }) => ({
  minWidth: '36px',
  width: '36px',
  height: '36px',
  padding: 0,
  backgroundColor: bgColor,
  '&:hover': {
    backgroundColor: bgColor,
    opacity: 0.9,
  },
  border: `2px solid ${alpha(theme.palette.common.white, 0.1)}`,
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  transition: 'transform 0.2s, border-color 0.2s',
  '&:focus, &.selected': {
    transform: 'scale(1.1)',
    borderColor: theme.palette.primary.main,
  }
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1),
  marginTop: theme.spacing(2),
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}));

const ThemeCard = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.background.default, 0.5),
  border: `1px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.background.default, 0.7),
    transform: 'translateY(-2px)',
  },
  ...(selected && {
    boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
  })
}));

// TabPanel component
const TabPanel = memo(function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`scene-settings-tabpanel-${index}`}
      aria-labelledby={`scene-settings-tab-${index}`}
      sx={{ 
        height: value !== index ? 0 : '100%',
        overflow: 'auto',
        transition: 'all 0.3s ease',
        flex: value === index ? 1 : 0,
        p: 2
      }}
      {...other}
    >
      <Fade in={value === index}>
        <Box>{children}</Box>
      </Fade>
    </Box>
  );
});

// Main component
const AdvancedSceneSettings: React.FC<AdvancedSceneSettingsProps> = ({
  settings,
  onChange,
  open,
  onClose,
  onSavePreset,
  onLoadPreset
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [themeApplied, setThemeApplied] = useState(false);

  // Callback functions
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const applyTheme = useCallback((themeIndex: number) => {
    const theme = SCENE_THEMES[themeIndex];
    onChange('backgroundColor', theme.backgroundColor);
    onChange('gridColorGrid', theme.gridColorGrid);
    onChange('gridColorCenterLine', theme.gridColorCenterLine);
    onChange('ambientLightIntensity', theme.ambientLightIntensity);
    onChange('directionalLightIntensity', theme.directionalLightIntensity);
    
    setSelectedTheme(theme.name);
    setThemeApplied(true);
    
    // Reset theme applied indicator after 3 seconds
    setTimeout(() => {
      setThemeApplied(false);
    }, 3000);
  }, [onChange]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSliderChange = useCallback((field: keyof SceneSettings) => (
    _: Event, value: number | number[]
  ) => {
    onChange(field, typeof value === 'number' ? value : value[0]);
  }, [onChange]);

  const handleSwitchChange = useCallback((field: keyof SceneSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange(field, event.target.checked);
  }, [onChange]);

  const handleColorChange = useCallback((field: keyof SceneSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange(field, event.target.value);
  }, [onChange]);

  // If panel is closed, don't render anything to improve performance
  if (!open) return null;

  return (
    <StyledPanel>
      {/* Single Header */}
      <StyledHeader>
        <Typography variant="subtitle1" fontWeight={500}>
          Advanced Scene Settings
        </Typography>
        <IconButton onClick={onClose} size="small" edge="end" aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </StyledHeader>

      {/* Tabs */}
      <StyledTabs
        value={tabValue}
        onChange={handleTabChange}
        variant="fullWidth"
        aria-label="scene settings tabs"
      >
        <Tab icon={<GridOnIcon />} label="Grid" />
        <Tab icon={<CameraAltIcon />} label="Camera" />
        <Tab icon={<LightModeIcon />} label="Lighting" />
        <Tab icon={<PaletteIcon />} label="Theme" />
      </StyledTabs>

      {/* Tab contents - using Box with flex for proper layout */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        {/* Grid Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={2.5}>
            <Box>
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.gridVisible}
                    onChange={handleSwitchChange('gridVisible')}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">Show Grid</Typography>
                }
              />
            </Box>

            <Box>
              <SectionTitle>Grid Divisions</SectionTitle>
              <StyledSlider
                value={settings.gridDivisions}
                onChange={handleSliderChange('gridDivisions')}
                min={2}
                max={100}
                step={1}
                valueLabelDisplay="auto"
                marks={[
                  { value: 2, label: '2' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' }
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Cell Size: {(300 / settings.gridDivisions).toFixed(1)} meters ({(300 / settings.gridDivisions * 3.28084).toFixed(1)} feet)
              </Typography>
            </Box>

            <Box>
              <SectionTitle>Grid Fade Distance</SectionTitle>
              <StyledSlider
                value={settings.gridFadeDistance}
                onChange={handleSliderChange('gridFadeDistance')}
                min={5}
                max={300}
                step={1}
                marks={[
                  { value: 5, label: '5' },
                  { value: 150, label: '150' },
                  { value: 300, label: '300' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <SectionTitle>Grid Colors</SectionTitle>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <StyledTextField
                  label="Main Grid"
                  value={settings.gridColorGrid}
                  onChange={handleColorChange('gridColorGrid')}
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box 
                          sx={{ 
                            width: 16, 
                            height: 16, 
                            backgroundColor: settings.gridColorGrid,
                            borderRadius: '2px',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }} 
                        />
                      </InputAdornment>
                    ),
                  }}
                />
                <StyledTextField
                  label="Center Lines"
                  value={settings.gridColorCenterLine}
                  onChange={handleColorChange('gridColorCenterLine')}
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box 
                          sx={{ 
                            width: 16, 
                            height: 16, 
                            backgroundColor: settings.gridColorCenterLine,
                            borderRadius: '2px',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }} 
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <SectionTitle>Ground & Water Settings</SectionTitle>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.showBelowGround}
                      onChange={handleSwitchChange('showBelowGround')}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">Show Below Ground</Typography>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.waterEnabled}
                      onChange={handleSwitchChange('waterEnabled')}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">Enable Water Effect</Typography>
                  }
                />

                {settings.waterEnabled && (
                  <Collapse in={settings.waterEnabled}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <StyledTextField
                        label="Water Color"
                        value={settings.waterColor}
                        onChange={handleColorChange('waterColor')}
                        size="small"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Box 
                                sx={{ 
                                  width: 16, 
                                  height: 16, 
                                  backgroundColor: settings.waterColor,
                                  borderRadius: '2px',
                                  border: '1px solid rgba(255,255,255,0.1)'
                                }} 
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                      
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          Water Opacity: {settings.waterOpacity.toFixed(2)}
                        </Typography>
                        <StyledSlider
                          value={settings.waterOpacity}
                          onChange={handleSliderChange('waterOpacity')}
                          min={0}
                          max={1}
                          step={0.05}
                          valueLabelDisplay="auto"
                        />
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          Wave Speed: {settings.waterWaveSpeed.toFixed(1)}
                        </Typography>
                        <StyledSlider
                          value={settings.waterWaveSpeed}
                          onChange={handleSliderChange('waterWaveSpeed')}
                          min={0}
                          max={2}
                          step={0.1}
                          valueLabelDisplay="auto"
                        />
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          Wave Scale: {settings.waterWaveScale.toFixed(1)}
                        </Typography>
                        <StyledSlider
                          value={settings.waterWaveScale}
                          onChange={handleSliderChange('waterWaveScale')}
                          min={0.1}
                          max={3}
                          step={0.1}
                          valueLabelDisplay="auto"
                        />
                      </Box>
                    </Stack>
                  </Collapse>
                )}
              </Stack>
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.axesVisible}
                    onChange={handleSwitchChange('axesVisible')}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">Show Coordinate Axes</Typography>
                }
              />
            </Box>
          </Stack>
        </TabPanel>

        {/* Camera Tab */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            <Box>
              <SectionTitle>Field of View</SectionTitle>
              <StyledSlider
                value={settings.fov}
                onChange={handleSliderChange('fov')}
                min={20}
                max={120}
                step={1}
                marks={[
                  { value: 20, label: '20°' },
                  { value: 60, label: '60°' },
                  { value: 120, label: '120°' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}°`}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Narrower FOV (20°-40°) helps with precision work, while wider FOV (60°-120°) shows more of the scene.
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ 
                p: 1.5, 
                bgcolor: alpha(theme.palette.info.main, 0.1), 
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` 
              }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <InfoOutlinedIcon color="info" sx={{ fontSize: '1.2rem', mt: 0.2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Camera settings affect only the scene view. For drone camera visualization, use the Hardware Configuration.
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </TabPanel>

        {/* Lighting Tab */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={3}>
            <Box>
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.skyEnabled}
                    onChange={handleSwitchChange('skyEnabled')}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">Enable Sky & Sun</Typography>
                }
              />
            </Box>

            <Box>
              <SectionTitle>Ambient Light</SectionTitle>
              <StyledSlider
                value={settings.ambientLightIntensity}
                onChange={handleSliderChange('ambientLightIntensity')}
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 1, label: '1' },
                  { value: 2, label: '2' }
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Soft light that illuminates all objects evenly
              </Typography>
            </Box>

            <Box>
              <SectionTitle>Directional Light</SectionTitle>
              <StyledSlider
                value={settings.directionalLightIntensity}
                onChange={handleSliderChange('directionalLightIntensity')}
                min={0}
                max={3}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 1.5, label: '1.5' },
                  { value: 3, label: '3' }
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Strong directed light that casts shadows
              </Typography>
            </Box>
          </Stack>
        </TabPanel>

        {/* Theme Tab */}
        <TabPanel value={tabValue} index={3}>
          <Stack spacing={3}>
            <Box>
              <SectionTitle>Background Color</SectionTitle>
              <StyledTextField
                value={settings.backgroundColor}
                onChange={handleColorChange('backgroundColor')}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          backgroundColor: settings.backgroundColor,
                          borderRadius: '2px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }} 
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box>
              <SectionTitle>Scene Themes</SectionTitle>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Select a theme to apply a set of coordinated visual settings
              </Typography>
              
              <Stack spacing={1.5}>
                {SCENE_THEMES.map((sceneTheme, index) => (
                  <ThemeCard 
                    key={sceneTheme.name}
                    selected={selectedTheme === sceneTheme.name}
                    onClick={() => applyTheme(index)}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Stack direction="row" spacing={0.5}>
                        <ColorBlockButton bgColor={sceneTheme.backgroundColor} />
                        <Stack>
                          <ColorBlockButton bgColor={sceneTheme.gridColorGrid} />
                          <ColorBlockButton bgColor={sceneTheme.gridColorCenterLine} />
                        </Stack>
                      </Stack>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {sceneTheme.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sceneTheme.ambientLightIntensity.toFixed(1)} ambient, {sceneTheme.directionalLightIntensity.toFixed(1)} direct
                        </Typography>
                      </Box>
                      <Collapse in={selectedTheme === sceneTheme.name && themeApplied}>
                        <CheckCircleOutlineIcon color="success" />
                      </Collapse>
                    </Stack>
                  </ThemeCard>
                ))}
              </Stack>
            </Box>

            {/* Custom Theme Creation */}
            <Box sx={{ 
              p: 1.5, 
              bgcolor: alpha(theme.palette.primary.main, 0.08), 
              borderRadius: 1, 
              border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}>
              <DesignServicesOutlinedIcon color="primary" />
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  Create Custom Theme
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Adjust settings in other tabs, then save as a custom theme
                </Typography>
              </Box>
              <Button 
                variant="outlined" 
                color="primary" 
                size="small" 
                startIcon={<SaveOutlinedIcon />}
                sx={{ ml: 'auto' }}
                onClick={onSavePreset}
                disabled={!onSavePreset}
              >
                Save
              </Button>
            </Box>
          </Stack>
        </TabPanel>
      </Box>
    </StyledPanel>
  );
};

export default memo(AdvancedSceneSettings); 