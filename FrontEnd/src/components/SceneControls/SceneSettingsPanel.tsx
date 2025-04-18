import React, { useState, useCallback, memo, useMemo } from 'react';
import {
    Box,
    Typography,
    Slider,
    Stack,
    Switch,
    FormControlLabel,
    TextField,
    Paper,
    Divider,
    Grid,
    Tabs,
    Tab,
    IconButton,
    Tooltip,
    alpha,
    InputAdornment,
    Fade,
    Collapse,
    useTheme,
    Radio,
    RadioGroup,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    SelectChangeEvent
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
import WaterIcon from '@mui/icons-material/Water';
import TerrainIcon from '@mui/icons-material/Terrain';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ScaleIcon from '@mui/icons-material/Scale';
import GridViewIcon from '@mui/icons-material/GridView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { SceneSettings, SceneTheme, SCENE_THEMES, GRID_PRESETS } from '../BabylonViewer/types/SceneSettings';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';
import SpeedIcon from '@mui/icons-material/Speed';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface SceneSettingsPanelProps {
    settings: SceneSettings;
    onChange: (field: keyof SceneSettings, value: any) => void;
    open: boolean;
    onClose: () => void;
    onSavePreset?: () => void;
    onLoadPreset?: () => void;
}

interface FpsDisplayProps {
  showFps: boolean;
  onToggleFps: (show: boolean) => void;
}

const StyledPanel = styled(Paper)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.95),
  color: theme.palette.text.primary,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[10],
  backdropFilter: 'blur(8px)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '90vh',
  maxWidth: '475px',
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

// Prevent custom 'bgColor' prop from reaching the DOM element
const ColorBlockButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'bgColor',
})<{ bgColor: string }>(({ theme, bgColor }) => ({
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

const PresetCard = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.background.default, 0.5),
  border: `1px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.background.default, 0.7),
    boxShadow: theme.shadows[2],
  },
  ...(selected && {
    boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
  })
}));

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

const COLOR_PALETTES = {
  gridLines: [
    { name: 'White', value: '#ffffff' },
    { name: 'Bright White', value: '#f5f5f5' },
    { name: 'Silver', value: '#e0e0e0' },
    { name: 'Light Gray', value: '#cccccc' },
    { name: 'Medium Gray', value: '#888888' },
    { name: 'Dark Gray', value: '#555555' },
    { name: 'Subtle Blue', value: '#5c7cfa' }, 
    { name: 'Subtle Green', value: '#69db7c' },
    { name: 'Black', value: '#000000' }
  ],
  // Added specific palettes for major and minor grid lines
  majorGridLines: [
    { name: 'White', value: '#ffffff' },
    { name: 'Bright White', value: '#f5f5f5' },
    { name: 'Silver', value: '#e0e0e0' },
    { name: 'Light Gray', value: '#dddddd' },
    { name: 'Bright Blue', value: '#2196f3' },
    { name: 'Bright Green', value: '#4caf50' },
    { name: 'Yellow', value: '#ffeb3b' },
    { name: 'Orange', value: '#ff9800' },
    { name: 'Red', value: '#f44336' },
    { name: 'Magenta', value: '#e91e63' }
  ],
  minorGridLines: [
    { name: 'White', value: '#ffffff' },
    { name: 'Bright White', value: '#f5f5f5' },
    { name: 'Silver', value: '#e0e0e0' },
    { name: 'Light Gray', value: '#cccccc' },
    { name: 'Medium Gray', value: '#999999' },
    { name: 'Dark Gray', value: '#666666' },
    { name: 'Subtle Blue', value: '#90caf9' },
    { name: 'Subtle Green', value: '#a5d6a7' },
    { name: 'Subtle Yellow', value: '#fff9c4' }
  ],
  centerLines: [
    { name: 'White', value: '#ffffff' },
    { name: 'Bright White', value: '#f5f5f5' },
    { name: 'Sky Blue', value: '#4fc3f7' },
    { name: 'Teal', value: '#64ffda' },
    { name: 'Coral', value: '#ff6e40' },
    { name: 'Magenta', value: '#ff4081' },
    { name: 'Purple', value: '#b388ff' },
    { name: 'Lime', value: '#b9f6ca' },
    { name: 'Gold', value: '#ffd740' },
    { name: 'Red', value: '#f44336' }
  ],
  backgrounds: [
    { name: 'Dark Gray', value: '#121212' },
    { name: 'Medium Gray', value: '#2d2d2d' },
    { name: 'Navy Blue', value: '#0a192f' },
    { name: 'Deep Purple', value: '#311b92' },
    { name: 'Dark Teal', value: '#004d40' },
    { name: 'Black', value: '#000000' },
    { name: 'Light Gray', value: '#f5f5f5' },
    { name: 'Soft Blue', value: '#e3f2fd' },
    { name: 'Medium Grey (Cloudy)', value: '#808080' }
  ],
  waterColors: [
    { name: 'Ocean Blue', value: '#0277bd' },
    { name: 'Teal', value: '#00838f' },
    { name: 'Deep Blue', value: '#0d47a1' },
    { name: 'Light Blue', value: '#4fc3f7' },
    { name: 'Aqua', value: '#18ffff' },
    { name: 'Navy', value: '#1a237e' },
    { name: 'Turquoise', value: '#1de9b6' }
  ]
};

// Add this new component for quick presets buttons
const QuickPresetButton = styled(Button)(({ theme }) => ({
  minWidth: 'auto',
  padding: theme.spacing(0.75, 1.5),
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.8rem',
  textTransform: 'none',
  borderColor: alpha(theme.palette.primary.main, 0.3),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  }
}));

const SceneSettingsPanel: React.FC<SceneSettingsPanelProps> = ({ 
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
    const [selectedGridPreset, setSelectedGridPreset] = useState<string | null>(null);
    const [gridScaleMode, setGridScaleMode] = useState<'auto' | 'manual'>(
      settings.gridAutoScale ? 'auto' : 'manual'
    );
    
    // Add state for FPS display
    const [showFpsDisplay, setShowFpsDisplay] = useState(false);

    const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
      setTabValue(newValue);
    }, []);

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

    const handleRadioChange = useCallback((field: keyof SceneSettings) => (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      onChange(field, event.target.value);
    }, [onChange]);

    // Simple color palette for fallback background
    const fallbackBackgroundColors = [
      { name: "Dark Grey", value: "#222222" },
      { name: "Medium Grey", value: "#555555" },
      { name: "Light Grey", value: "#AAAAAA" },
      { name: "Sky Blue", value: "#87CEEB" },
      { name: "Black", value: "#000000" },
    ];

    const handleSelectChange = useCallback((field: keyof SceneSettings) => (
      event: SelectChangeEvent<string>
    ) => {
      const value = event.target.value;
      onChange(field, value);
      
      // If selecting a preset that would benefit from water, auto-enable it
      if (field === 'environmentMap') {
        const preset = value as string;
        if (['warehouse', 'sunset', 'dawn', 'forest'].includes(preset)) {
          onChange('waterEnabled', true);
        }
      }
    }, [onChange]);

    const handleSunPositionChange = useCallback((index: 0 | 1 | 2, value: number) => {
        const currentPosition = [...(settings.sunPosition || [100, 10, 100])];
        if (!isNaN(value)) {
            currentPosition[index] = value;
            onChange('sunPosition', currentPosition); 
        }
    }, [onChange, settings.sunPosition]);
    
    const applyTheme = useCallback((themeIndex: number) => {
      const theme = SCENE_THEMES[themeIndex];
      onChange('backgroundColor', theme.backgroundColor);
      onChange('gridColorGrid', theme.gridColorGrid);
      onChange('gridColorCenterLine', theme.gridColorCenterLine);
      onChange('ambientLightIntensity', theme.ambientLightIntensity);
      onChange('directionalLightIntensity', theme.directionalLightIntensity);
      if (theme.waterEnabled !== undefined) onChange('waterEnabled', theme.waterEnabled);
      if (theme.waterColor) onChange('waterColor', theme.waterColor);
      
      setSelectedTheme(theme.name);
      setThemeApplied(true);
      setTimeout(() => setThemeApplied(false), 3000);
    }, [onChange]);

    const applyGridPreset = useCallback((preset: typeof GRID_PRESETS[0]) => {
      onChange('gridSize', preset.gridSize);
      onChange('gridDivisions', preset.divisions);
      onChange('gridFadeDistance', preset.fadeDistance);
      onChange('gridUnit', preset.unit);
      setSelectedGridPreset(preset.name);
      setTimeout(() => setSelectedGridPreset(null), 3000);
    }, [onChange]);

    const handleGridScaleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const mode = (event.target.value as 'auto' | 'manual');
      setGridScaleMode(mode);
      onChange('gridAutoScale', mode === 'auto');
    }, [onChange]);

    const gridCellSize = useMemo(() => {
      const size = settings.gridSize / settings.gridDivisions;
      return {
        meters: size,
        feet: metersToFeet(size)
      };
    }, [settings.gridSize, settings.gridDivisions]);

    // Calculate major grid line size
    const majorGridCellSize = useMemo(() => {
      const minorSize = settings.gridSize / settings.gridDivisions;
      const majorSize = minorSize * (settings.gridMajorLineInterval || 5);
      return {
        meters: majorSize,
        feet: metersToFeet(majorSize)
      };
    }, [settings.gridSize, settings.gridDivisions, settings.gridMajorLineInterval]);

    // Add new function for applying performance preset
    const applyPerformancePreset = useCallback(() => {
      // Apply optimized water settings
      onChange('waterEnabled', true);
      onChange('waterOpacity', 0.7);
      onChange('waterWaveSpeed', 0.1);
      onChange('waterWaveScale', 1.2);
      
      // Apply performance-optimized grid settings
      onChange('gridSize', 600);
      onChange('gridDivisions', 16);
      onChange('gridFadeDistance', 450);
      
      // Other performance optimizations
      onChange('shadowsEnabled', false); // Disable shadows for performance
      
      // Show success message
      setSelectedGridPreset("Performance Preset Applied");
      setTimeout(() => setSelectedGridPreset(null), 3000);
    }, [onChange]);

    // Add a handler for toggling the FPS display
    const handleToggleFpsDisplay = () => {
      const newState = !showFpsDisplay;
      setShowFpsDisplay(newState);
      // Dispatch a custom event that the Local3DViewer can listen for
      window.dispatchEvent(new CustomEvent('toggle-fps-display', { 
        detail: { visible: newState } 
      }));
    };

    if (!open) return null;

    return (
        <StyledPanel elevation={5}>
            <StyledHeader>
                <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '1.1rem' }}>Scene Settings</Typography>
                {/* Only show close button if onClose is provided */}
                {onClose && (
                    <IconButton onClick={onClose} size="small" sx={{ color: theme.palette.text.secondary }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </StyledHeader>
            <StyledTabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              aria-label="scene settings tabs"
              sx={{ minHeight: '48px' }}
            >
              <Tab icon={<GridOnIcon />} label="Grid" sx={{ minHeight: '48px' }} />
              <Tab icon={<TerrainIcon />} label="Ground" sx={{ minHeight: '48px' }} />
              <Tab icon={<CameraAltIcon />} label="Camera" sx={{ minHeight: '48px' }} />
              <Tab icon={<LightModeIcon />} label="Lighting" sx={{ minHeight: '48px' }} />
              <Tab icon={<PaletteIcon />} label="Theme" sx={{ minHeight: '48px' }} />
            </StyledTabs>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                <TabPanel value={tabValue} index={0}>
                  <Stack spacing={2.5}>
                    {/* Grid Visibility Toggle - with enhanced visibility option */}
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
                        label={<Typography variant="body2">Show Grid</Typography>}
                      />
                      <Collapse in={settings.gridVisible}>
                        <FormControlLabel
                          sx={{ ml: 3 }}
                          control={
                            <Switch 
                              checked={settings.gridEnhancedVisibility ?? true}
                              onChange={handleSwitchChange('gridEnhancedVisibility')}
                              color="primary"
                              size="small"
                            />
                          }
                          label={<Typography variant="body2">Enhanced Visibility</Typography>}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 3, display: 'block' }}>
                          Improves grid visibility against the background
                        </Typography>
                      </Collapse>
                    </Box>

                    {/* Grid Under Water Toggle */}
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={settings.gridShowUnderWater ?? true}
                            onChange={handleSwitchChange('gridShowUnderWater')}
                            color="primary"
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">Show Grid Under Water</Typography>}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                        Grid will be visible when water is transparent
                      </Typography>
                    </Box>

                    {/* Grid Presets - Reorganized with dropdown and accordion */}
                    <Box>
                      <SectionTitle>Grid Scale Presets</SectionTitle>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                        Select a preset optimized for different operational scales
                      </Typography>
                      
                      {/* Dropdown for selecting grid presets */}
                      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                        <InputLabel id="grid-preset-select-label">Grid Preset</InputLabel>
                        <Select
                          labelId="grid-preset-select-label"
                          value={selectedGridPreset || ""}
                          onChange={(e) => {
                            const selected = GRID_PRESETS.find(preset => preset.name === e.target.value);
                            if (selected) {
                              applyGridPreset(selected);
                            }
                          }}
                          label="Grid Preset"
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                maxHeight: 300,
                                bgcolor: alpha(theme.palette.background.paper, 0.95),
                              }
                            }
                          }}
                        >
                          <MenuItem value=""><em>Select a preset</em></MenuItem>
                          {GRID_PRESETS.map((preset) => (
                            <MenuItem key={preset.name} value={preset.name}>
                              {preset.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      {/* Preview of the selected preset */}
                      {selectedGridPreset && (
                        <Paper 
                          sx={{ 
                            p: 1.5, 
                            bgcolor: alpha(theme.palette.primary.main, 0.08), 
                            borderRadius: 1,
                            mb: 2,
                            border: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.2)
                          }}
                        >
                          <Typography variant="body2" fontWeight={500}>{selectedGridPreset}</Typography>
                          {(() => {
                            const preset = GRID_PRESETS.find(p => p.name === selectedGridPreset);
                            if (!preset) return null;
                            
                            return (
                              <Stack spacing={0.5} sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Grid Size:</span>
                                  <strong>{preset.gridSize} {preset.unit}</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Divisions:</span>
                                  <strong>{preset.divisions}</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Major Line Ratio:</span>
                                  <strong>{preset.majorLineInterval || 5}:1</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Fade Distance:</span>
                                  <strong>{preset.fadeDistance} {preset.unit}</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Cell Size:</span>
                                  <strong>
                                    {(preset.gridSize / preset.divisions).toFixed(1)} {preset.unit}
                                  </strong>
                                </Typography>
                              </Stack>
                            );
                          })()}
                        </Paper>
                      )}
                      
                      {/* Collapsible section for browsing all presets */}
                      <Accordion 
                        sx={{ 
                          bgcolor: 'rgba(30, 30, 30, 0.4)', 
                          '&:before': { display: 'none' },
                          mb: 2
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">Browse All Presets</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 1 }}>
                          <Stack spacing={1}>
                            {/* Performance Optimized Presets Section */}
                            <Typography variant="caption" color="primary" fontWeight={500} sx={{ mt: 1 }}>
                              Performance Optimized
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {GRID_PRESETS
                                .filter(preset => preset.name.includes('Performance') || preset.name.includes('Maximum'))
                                .map((preset) => (
                                <Box sx={{ width: 'calc(50% - 4px)' }} key={preset.name}>
                                  <PresetCard 
                                    selected={selectedGridPreset === preset.name}
                                    onClick={() => applyGridPreset(preset)}
                                    sx={{ height: '100%' }}
                                  >
                                    <Typography variant="body2" fontWeight={500}>{preset.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {preset.gridSize} {preset.unit}
                                    </Typography>
                                  </PresetCard>
                                </Box>
                              ))}
                            </Box>
                            
                            {/* Operational Presets Section */}
                            <Typography variant="caption" color="primary" fontWeight={500} sx={{ mt: 1 }}>
                              Operational Scales
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {GRID_PRESETS
                                .filter(preset => 
                                  preset.name.includes('Drone') || 
                                  preset.name.includes('Building') || 
                                  preset.name.includes('Maritime') ||
                                  preset.name.includes('City')
                                )
                                .map((preset) => (
                                <Box sx={{ width: 'calc(50% - 4px)' }} key={preset.name}>
                                  <PresetCard 
                                    selected={selectedGridPreset === preset.name}
                                    onClick={() => applyGridPreset(preset)}
                                    sx={{ height: '100%' }}
                                  >
                                    <Typography variant="body2" fontWeight={500}>{preset.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {preset.gridSize} {preset.unit}
                                    </Typography>
                                  </PresetCard>
                                </Box>
                              ))}
                            </Box>
                            
                            {/* Special Presets Section */}
                            <Typography variant="caption" color="primary" fontWeight={500} sx={{ mt: 1 }}>
                              Special Scales
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {GRID_PRESETS
                                .filter(preset => 
                                  !preset.name.includes('Performance') && 
                                  !preset.name.includes('Maximum') &&
                                  !preset.name.includes('Drone') && 
                                  !preset.name.includes('Building') && 
                                  !preset.name.includes('Maritime') &&
                                  !preset.name.includes('City')
                                )
                                .map((preset) => (
                                <Box sx={{ width: 'calc(50% - 4px)' }} key={preset.name}>
                                  <PresetCard 
                                    selected={selectedGridPreset === preset.name}
                                    onClick={() => applyGridPreset(preset)}
                                    sx={{ height: '100%' }}
                                  >
                                    <Typography variant="body2" fontWeight={500}>{preset.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {preset.gridSize} {preset.unit}
                                    </Typography>
                                  </PresetCard>
                                </Box>
                              ))}
                            </Box>
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    </Box>

                    {/* Grid Scale Mode */}
                    <Box>
                      <SectionTitle>Grid Scale Mode</SectionTitle>
                      <RadioGroup row value={gridScaleMode} onChange={handleGridScaleChange}>
                        <FormControlLabel value="auto" control={<Radio size="small" />} label="Auto-scale to fit content" />
                        <FormControlLabel value="manual" control={<Radio size="small" />} label="Manual settings" />
                      </RadioGroup>
                    </Box>

                    {/* Hierarchical Grid Settings */}
                    <Box>
                      <SectionTitle>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <GridViewIcon fontSize="small" />
                          <span>Hierarchical Grid</span>
                        </Stack>
                      </SectionTitle>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                        Configure major and minor grid lines for better visual reference
                      </Typography>
                      
                      {/* Major Line Interval Slider */}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>Major Line Interval</Typography>
                        <StyledSlider
                          value={settings.gridMajorLineInterval || 5}
                          onChange={handleSliderChange('gridMajorLineInterval')}
                          min={2} max={10} step={1}
                          valueLabelDisplay="auto"
                          marks={[{ value: 2, label: '2' }, { value: 5, label: '5' }, { value: 10, label: '10' }]}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Every {settings.gridMajorLineInterval || 5} minor grid lines will show a major line
                        </Typography>
                      </Box>
                      
                      {/* Grid Cell Size Information */}
                      <Box sx={{ 
                        p: 1.5, 
                        mt: 2, 
                        bgcolor: alpha(theme.palette.info.main, 0.1), 
                        borderRadius: 1, 
                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` 
                      }}>
                        <Stack spacing={1}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Minor Grid:</strong> {gridCellSize.feet.toFixed(1)}ft ({gridCellSize.meters.toFixed(1)}m)
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Major Grid:</strong> {majorGridCellSize.feet.toFixed(1)}ft ({majorGridCellSize.meters.toFixed(1)}m)
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>

                    {/* Manual Grid Settings (Collapsible) */}
                    <Collapse in={gridScaleMode === 'manual'}>
                      <Stack spacing={2.5}>
                        {/* Grid Unit */} 
                        <Box>
                          <SectionTitle>Grid Unit</SectionTitle>
                          <RadioGroup row value={settings.gridUnit} onChange={handleRadioChange('gridUnit')}>
                            <FormControlLabel value="meters" control={<Radio size="small" />} label="Meters" />
                            <FormControlLabel value="feet" control={<Radio size="small" />} label="Feet" />
                          </RadioGroup>
                        </Box>
                        {/* Grid Size Slider */}
                        <Box>
                          <SectionTitle>Grid Size</SectionTitle>
                          <StyledSlider
                            value={settings.gridSize}
                            onChange={handleSliderChange('gridSize')}
                            min={100} max={5000} step={100}
                            valueLabelDisplay="auto"
                            marks={[{ value: 100, label: '100' }, { value: 2500, label: '2500' }, { value: 5000, label: '5000' }]}
                          />
                          <Typography variant="caption" color="text.secondary">Total grid extent: {settings.gridSize} {settings.gridUnit}</Typography>
                        </Box>
                        {/* Grid Divisions Slider */}
                        <Box>
                          <SectionTitle>Grid Divisions</SectionTitle>
                          <StyledSlider
                            value={settings.gridDivisions}
                            onChange={handleSliderChange('gridDivisions')}
                            min={5} max={100} step={5}
                            valueLabelDisplay="auto"
                            marks={[{ value: 5, label: '5' }, { value: 50, label: '50' }, { value: 100, label: '100' }]}
                          />
                          <Typography variant="caption" color="text.secondary">
                             Divisions: {settings.gridDivisions} | Cell Size: {gridCellSize.meters.toFixed(1)}m ({gridCellSize.feet.toFixed(1)}ft)
                          </Typography>
                        </Box>
                        {/* Grid Fade Distance Slider */}
                        <Box>
                          <SectionTitle>Grid Fade Distance</SectionTitle>
                          <StyledSlider
                            value={settings.gridFadeDistance}
                            onChange={handleSliderChange('gridFadeDistance')}
                            min={100} max={5000} step={100}
                            marks={[{ value: 100, label: '100' }, { value: 2500, label: '2500' }, { value: 5000, label: '5000' }]}
                            valueLabelDisplay="auto"
                          />
                          <Typography variant="caption" color="text.secondary">Fade Distance: {settings.gridFadeDistance} {settings.gridUnit}</Typography>
                        </Box>
                      </Stack>
                    </Collapse>

                    {/* Grid Colors - Updated for major/minor grid lines */}
                    <Box>
                      <SectionTitle>Grid Colors</SectionTitle>
                      <Stack spacing={2} sx={{ mt: 1 }}>
                        {/* Center Line Color */}
                        <FormControl fullWidth size="small">
                          <InputLabel id="center-line-color-label">Center Line Color</InputLabel>
                          <Select
                            labelId="center-line-color-label"
                            value={settings.gridColorCenterLine}
                            onChange={handleSelectChange('gridColorCenterLine')}
                            label="Center Line Color"
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: selected as string, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.3)'}} />
                                {COLOR_PALETTES.centerLines.find(color => color.value === selected)?.name || selected}
                              </Box>
                            )}
                          >
                            {COLOR_PALETTES.centerLines.map((color) => (
                              <MenuItem key={color.value} value={color.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: color.value, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)'}} />
                                  {color.name}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        {/* Major Grid Line Color */}
                        <FormControl fullWidth size="small">
                          <InputLabel id="major-grid-color-label">Major Grid Lines</InputLabel>
                          <Select
                            labelId="major-grid-color-label"
                            value={settings.gridMajorColor || '#FFFFFF'}
                            onChange={handleSelectChange('gridMajorColor')}
                            label="Major Grid Lines"
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: selected as string, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.3)'}} />
                                {COLOR_PALETTES.majorGridLines.find(color => color.value === selected)?.name || selected}
                              </Box>
                            )}
                          >
                            {COLOR_PALETTES.majorGridLines.map((color) => (
                              <MenuItem key={color.value} value={color.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: color.value, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)'}} />
                                  {color.name}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        {/* Minor Grid Line Color */}
                        <FormControl fullWidth size="small">
                          <InputLabel id="minor-grid-color-label">Minor Grid Lines</InputLabel>
                          <Select
                            labelId="minor-grid-color-label"
                            value={settings.gridMinorColor || '#CCCCCC'}
                            onChange={handleSelectChange('gridMinorColor')}
                            label="Minor Grid Lines"
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: selected as string, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.3)'}} />
                                {COLOR_PALETTES.minorGridLines.find(color => color.value === selected)?.name || selected}
                              </Box>
                            )}
                          >
                            {COLOR_PALETTES.minorGridLines.map((color) => (
                              <MenuItem key={color.value} value={color.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: color.value, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)'}} />
                                  {color.name}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                    </Box>

                    {/* Axes Toggle */}
                    <Box>
                      <FormControlLabel
                        control={<Switch checked={settings.axesVisible} onChange={handleSwitchChange('axesVisible')} color="primary" size="small" />}
                        label={<Typography variant="body2">Show Coordinate Axes</Typography>}
                      />
                    </Box>
                  </Stack>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <Stack spacing={3}>
                    {/* Ground Plane Toggle & Settings */}
                    <Box>
                      <SectionTitle>Ground Plane</SectionTitle>
                      <FormControlLabel
                        control={<Switch checked={!settings.hideGroundPlane} onChange={(e) => onChange('hideGroundPlane', !e.target.checked)} color="primary" size="small" />}
                        label={<Typography variant="body2">Show Ground Plane</Typography>}
                      />
                    </Box>
                    <Box>
                      <SectionTitle>Ground Transparency</SectionTitle>
                      <StyledSlider
                        value={settings.groundOpacity ?? 0.3} onChange={handleSliderChange('groundOpacity')} min={0} max={1} step={0.05}
                        valueLabelDisplay="auto" valueLabelFormat={value => `${Math.round(value * 100)}%`}
                        marks={[{ value: 0, label: '0%' }, { value: 0.5, label: '50%' }, { value: 1, label: '100%' }]}
                        disabled={settings.hideGroundPlane}
                      />
                    </Box>
                    <Box>
                      <FormControlLabel
                        control={<Switch checked={settings.showBelowGround ?? false} onChange={handleSwitchChange('showBelowGround')} color="primary" size="small" />}
                        label={<Typography variant="body2">Allow View Below Ground</Typography>}
                        disabled={settings.hideGroundPlane}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Useful for terrain inspection
                      </Typography>
                    </Box>
                    
                    <Divider />

                    {/* Water Settings - Enhanced with performance options */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(30, 30, 30, 0.4)', borderRadius: 1 }}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: '#4fc3f7', fontSize: '0.85rem', flexGrow: 1 }}>
                          Water Settings
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          backgroundColor: 'rgba(20, 20, 20, 0.5)', 
                          borderRadius: 1, 
                          p: 0.5, 
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <Typography variant="caption" sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.7)' }}>Off</Typography>
                          <Switch 
                            checked={settings.waterEnabled ?? false} 
                            onChange={handleSwitchChange('waterEnabled')} 
                            color="primary" 
                            size="small" 
                          />
                          <Typography variant="caption" sx={{ ml: 1, color: 'rgba(255, 255, 255, 0.7)' }}>On</Typography>
                        </Box>
                      </Stack>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        backgroundColor: settings.waterEnabled ? 'rgba(79, 195, 247, 0.1)' : 'rgba(50, 50, 50, 0.5)', 
                        borderRadius: 1, 
                        p: 1, 
                        border: settings.waterEnabled ? '1px solid rgba(79, 195, 247, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {settings.waterEnabled ? 'Water Enabled' : 'Water Disabled'}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {settings.waterEnabled 
                              ? 'May impact performance on some systems' 
                              : 'Better performance, recommended for low-end systems'}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => onChange('waterEnabled', !settings.waterEnabled)}
                          sx={{ minWidth: '30px', height: '30px', fontSize: '0.75rem' }}
                        >
                          {settings.waterEnabled ? 'Disable' : 'Enable'}
                        </Button>
                      </Box>
                    </Paper>
                    
                    <Collapse in={settings.waterEnabled ?? false}>
                      <Stack spacing={2.5}>
                        {/* Water Color */}
                        <Box>
                          <SectionTitle>Water Color</SectionTitle>
                          <FormControl fullWidth size="small">
                            <InputLabel id="water-color-label">Water Color</InputLabel>
                            <Select
                              labelId="water-color-label" value={settings.waterColor ?? '#4fc3f7'} onChange={handleSelectChange('waterColor')}
                              label="Water Color"
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: selected as string, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.3)'}} />
                                  {COLOR_PALETTES.waterColors.find(color => color.value === selected)?.name || selected}
                                </Box>
                              )}
                            >
                              {COLOR_PALETTES.waterColors.map((color) => (
                                <MenuItem key={color.value} value={color.value}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: color.value, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)'}} />
                                    {color.name}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                        {/* Water Opacity */}
                        <Box>
                          <SectionTitle>Water Transparency</SectionTitle>
                          <StyledSlider
                            value={settings.waterOpacity ?? 0.6} onChange={handleSliderChange('waterOpacity')} min={0} max={1} step={0.05}
                            valueLabelDisplay="auto" valueLabelFormat={value => `${Math.round(value * 100)}%`}
                            marks={[{ value: 0, label: '0%' }, { value: 0.5, label: '50%' }, { value: 1, label: '100%' }]}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {settings.gridShowUnderWater 
                              ? `Adjust transparency to see grid underneath (${Math.round((1 - (settings.waterOpacity || 0.6)) * 100)}% visible)`
                              : 'Adjust water transparency'}
                          </Typography>
                        </Box>
                        {/* Water Waves */}
                        <Box>
                          <SectionTitle>Wave Animation</SectionTitle>
                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="body2" gutterBottom>Wave Speed</Typography>
                              <StyledSlider 
                                value={settings.waterWaveSpeed ?? 0.1} // Updated default to 0.1
                                onChange={handleSliderChange('waterWaveSpeed')} 
                                min={0} max={2} step={0.1} 
                                valueLabelDisplay="auto" 
                                marks={[
                                  { value: 0, label: '0' },
                                  { value: 0.1, label: 'Low' },
                                  { value: 0.5, label: 'Med' },
                                  { value: 1, label: 'High' }
                                ]}
                              />
                            </Box>
                            <Box>
                              <Typography variant="body2" gutterBottom>Wave Scale (Height)</Typography>
                              <StyledSlider 
                                value={settings.waterWaveScale ?? 1.2} // Updated default to 1.2
                                onChange={handleSliderChange('waterWaveScale')} 
                                min={0.1} max={3} step={0.1} 
                                valueLabelDisplay="auto"
                                marks={[
                                  { value: 0.5, label: 'Low' },
                                  { value: 1.2, label: 'Med' },
                                  { value: 2.5, label: 'High' }
                                ]}
                              />
                            </Box>
                          </Stack>
                        </Box>
                      </Stack>
                    </Collapse>
                  </Stack>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Stack spacing={3}>
                    {/* FOV Slider */}
                    <Box>
                      <SectionTitle>Field of View</SectionTitle>
                      <StyledSlider
                        value={settings.fov} onChange={handleSliderChange('fov')} min={20} max={120} step={1}
                        marks={[{ value: 20, label: '20°' }, { value: 60, label: '60°' }, { value: 120, label: '120°' }]}
                        valueLabelDisplay="auto" valueLabelFormat={(value) => `${value}°`}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Adjusts the camera's viewing angle.
                      </Typography>
                    </Box>
                    {/* Navigation Toggles */}
                    <Box>
                      <SectionTitle>Camera Navigation</SectionTitle>
                      <FormControlLabel control={<Switch checked={settings.cameraInvertY ?? false} onChange={handleSwitchChange('cameraInvertY')} color="primary" size="small" />} label={<Typography variant="body2">Invert Y-Axis</Typography>} />
                      <FormControlLabel control={<Switch checked={settings.cameraDamping ?? true} onChange={handleSwitchChange('cameraDamping')} color="primary" size="small" />} label={<Typography variant="body2">Smooth Camera Movement</Typography>} />
                    </Box>
                    {/* Info Box */}
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1, border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <InfoOutlinedIcon color="info" sx={{ fontSize: '1.2rem', mt: 0.2 }} />
                          <Typography variant="body2" color="text.secondary">
                            Camera settings affect only the scene view. Drone camera visualization uses Hardware Configuration.
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  </Stack>
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                  <Stack spacing={3}>
                    {/* --- Environment and Lighting (Reorganized) --- */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(30, 30, 30, 0.4)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: '#ff9800', fontSize: '0.85rem' }}>
                        Environment & Lighting
                      </Typography>
                      
                      {/* HDRI Environment Map */}
                      <Box sx={{ mb: 2 }}>
                        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                          <InputLabel id="env-map-label">Environment Map (HDRI)</InputLabel>
                          <Select
                            labelId="env-map-label"
                            value={settings.environmentMap ?? ''} 
                            onChange={handleSelectChange('environmentMap')}
                            label="Environment Map (HDRI)"
                          >
                            <MenuItem value={''}><em>None (Use Sky/Background)</em></MenuItem>
                            <MenuItem value={'sunset'} sx={{ 
                              fontWeight: settings.environmentMap === 'sunset' ? 'bold' : 'normal',
                              color: settings.environmentMap === 'sunset' ? '#ff9800' : 'inherit'
                            }}>
                              Sunset
                            </MenuItem>
                            <MenuItem value={'dawn'}>Dawn</MenuItem>
                            <MenuItem value={'night'}>Night</MenuItem>
                            <MenuItem value={'warehouse'}>Warehouse</MenuItem>
                            <MenuItem value={'forest'}>Forest</MenuItem>
                            <MenuItem value={'apartment'}>Apartment</MenuItem>
                            <MenuItem value={'studio'}>Studio</MenuItem>
                            <MenuItem value={'city'}>City</MenuItem>
                            <MenuItem value={'park'}>Park</MenuItem>
                            <MenuItem value={'lobby'}>Lobby</MenuItem>
                          </Select>
                        </FormControl>
                        
                        {/* Environment Preview - Show only when HDRI is selected */}
                        {settings.environmentMap && (
                          <Box sx={{ 
                            height: '60px', 
                            borderRadius: '4px', 
                            overflow: 'hidden',
                            mb: 1,
                            background: settings.environmentMap === 'sunset' ? 'linear-gradient(to right, #f56217, #ffb11b, #ffc66c, #ffb11b)' :
                                       settings.environmentMap === 'night' ? 'linear-gradient(to right, #030315, #1c1b4a, #30336a)' :
                                       settings.environmentMap === 'dawn' ? 'linear-gradient(to right, #fca184, #ffbc94, #fdf5e8)' :
                                       settings.environmentMap === 'forest' ? 'linear-gradient(to right, #2d5a28, #3e7a37, #78b075)' :
                                       settings.environmentMap === 'city' ? 'linear-gradient(to right, #566573, #808b96, #aeb6bf)' :
                                       'linear-gradient(to right, #b0bec5, #cfd8dc, #eceff1)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }} />
                        )}
                      </Box>
                      
                      {/* Environment Intensity - Only show when HDRI is enabled */}
                      {settings.environmentMap && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Environment Intensity</span>
                            <span>{settings.environmentIntensity.toFixed(1)}</span>
                          </Typography>
                          <StyledSlider 
                            value={settings.environmentIntensity} 
                            onChange={handleSliderChange('environmentIntensity')} 
                            min={0} 
                            max={3} 
                            step={0.1} 
                            marks={[
                              { value: 0, label: '0' }, 
                              { value: 1, label: '1' }, 
                              { value: 1.5, label: '1.5' }, 
                              { value: 3, label: '3' }
                            ]} 
                            valueLabelDisplay="auto"
                          />
                        </Box>
                      )}
                      
                      <Divider sx={{ my: 2 }} />
                      
                      {/* Main Light Controls */}
                      <Box sx={{ mb: 2 }}>
                        {/* Ambient Light */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Ambient Light</span>
                            <span>{settings.ambientLightIntensity.toFixed(1)}</span>
                          </Typography>
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
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Overall scene brightness
                          </Typography>
                        </Box>
                        
                        {/* Directional Light */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Directional Light (Sun)</span>
                            <span>{settings.directionalLightIntensity.toFixed(1)}</span>
                          </Typography>
                          <StyledSlider 
                            value={settings.directionalLightIntensity} 
                            onChange={handleSliderChange('directionalLightIntensity')} 
                            min={0} 
                            max={3} 
                            step={0.1} 
                            marks={[
                              { value: 0, label: '0' }, 
                              { value: 0.9, label: '0.9' },
                              { value: 1.5, label: '1.5' }, 
                              { value: 3, label: '3' }
                            ]} 
                            valueLabelDisplay="auto" 
                          />
                        </Box>
                      </Box>
                      
                      {/* Sky Toggle */}
                      <Box sx={{ mt: 2 }}>
                        <FormControlLabel 
                          control={
                            <Switch 
                              checked={settings.skyEnabled} 
                              onChange={handleSwitchChange('skyEnabled')} 
                              color="primary" 
                              size="small" 
                              disabled={!!settings.environmentMap}
                            />
                          } 
                          label={
                            <Box>
                              <Typography variant="body2">Procedural Sky & Sun</Typography>
                              <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)' }}>
                                {!!settings.environmentMap 
                                  ? 'Disabled when using HDRI environment'
                                  : 'Enable for sky gradient and sun position control'}
                              </Typography>
                            </Box>
                          } 
                        />
                      </Box>

                      {/* Shadows Toggle - Enhanced with performance information */}
                      <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(30, 30, 30, 0.4)', borderRadius: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: '#ff9800', fontSize: '0.85rem', flexGrow: 1 }}>
                            Shadow Settings
                          </Typography>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            backgroundColor: 'rgba(20, 20, 20, 0.5)', 
                            borderRadius: 1, 
                            p: 0.5, 
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <Typography variant="caption" sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.7)' }}>Off</Typography>
                            <Switch 
                              checked={settings.shadowsEnabled ?? false} 
                              onChange={handleSwitchChange('shadowsEnabled')} 
                              color="warning" 
                              size="small" 
                            />
                            <Typography variant="caption" sx={{ ml: 1, color: 'rgba(255, 255, 255, 0.7)' }}>On</Typography>
                          </Box>
                        </Stack>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          backgroundColor: settings.shadowsEnabled ? 'rgba(255, 152, 0, 0.1)' : 'rgba(50, 50, 50, 0.5)', 
                          borderRadius: 1, 
                          p: 1, 
                          border: settings.shadowsEnabled ? '1px solid rgba(255, 152, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {settings.shadowsEnabled ? 'Shadows Enabled' : 'Shadows Disabled'}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)' }}>
                              {settings.shadowsEnabled 
                                ? 'High visual quality, significant performance impact' 
                                : 'Better performance, recommended for all systems'}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            color={settings.shadowsEnabled ? "warning" : "primary"}
                            onClick={() => onChange('shadowsEnabled', !settings.shadowsEnabled)}
                            sx={{ minWidth: '30px', height: '30px', fontSize: '0.75rem' }}
                          >
                            {settings.shadowsEnabled ? 'Disable' : 'Enable'}
                          </Button>
                        </Box>
                      </Paper>
                      
                      {/* FPS Display Toggle - New section */}
                      <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(30, 30, 30, 0.4)', borderRadius: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: '#64ffda', fontSize: '0.85rem', flexGrow: 1 }}>
                            Performance Monitor
                          </Typography>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            backgroundColor: 'rgba(20, 20, 20, 0.5)', 
                            borderRadius: 1, 
                            p: 0.5, 
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <Typography variant="caption" sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.7)' }}>Off</Typography>
                            <Switch 
                              checked={showFpsDisplay} 
                              onChange={handleToggleFpsDisplay} 
                              color="success" 
                              size="small" 
                            />
                            <Typography variant="caption" sx={{ ml: 1, color: 'rgba(255, 255, 255, 0.7)' }}>On</Typography>
                          </Box>
                        </Stack>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          backgroundColor: showFpsDisplay ? 'rgba(100, 255, 218, 0.1)' : 'rgba(50, 50, 50, 0.5)', 
                          borderRadius: 1, 
                          p: 1, 
                          border: showFpsDisplay ? '1px solid rgba(100, 255, 218, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {showFpsDisplay ? 'FPS Counter Enabled' : 'FPS Counter Disabled'}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)' }}>
                              {showFpsDisplay 
                                ? 'Shows real-time FPS - drag to reposition' 
                                : 'Enable to monitor performance'}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<SpeedIcon fontSize="small" />}
                            color={showFpsDisplay ? "success" : "primary"}
                            onClick={handleToggleFpsDisplay}
                            sx={{ minWidth: '80px', height: '30px', fontSize: '0.75rem' }}
                          >
                            {showFpsDisplay ? 'Hide' : 'Show'}
                          </Button>
                        </Box>
                      </Paper>

                      <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(30, 30, 30, 0.4)', borderRadius: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: '#64ffda', fontSize: '0.85rem', flexGrow: 1 }}>
                            Quality Settings
                          </Typography>
                        </Stack>
                        
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Select quality level to optimize performance
                          </Typography>
                          
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {['low', 'medium', 'high', 'ultra'].map((quality) => (
                              <Button
                                key={quality}
                                variant={settings.qualityLevel === quality ? "contained" : "outlined"}
                                size="small"
                                onClick={() => {
                                  // Apply quality presets based on level
                                  const presets = {
                                    low: {
                                      shadowsEnabled: false,
                                      waterEnabled: false,
                                      gridDivisions: 10,
                                      gridFadeDistance: 300,
                                      waterWaveSpeed: 0,
                                      environmentIntensity: 0.8,
                                      qualityLevel: 'low'
                                    },
                                    medium: {
                                      shadowsEnabled: false,
                                      waterEnabled: true,
                                      waterWaveSpeed: 0.1,
                                      waterWaveScale: 0.8,
                                      gridDivisions: 16,
                                      gridFadeDistance: 450,
                                      environmentIntensity: 1.0,
                                      qualityLevel: 'medium'
                                    },
                                    high: {
                                      shadowsEnabled: true,
                                      waterEnabled: true,
                                      waterWaveSpeed: 0.3,
                                      waterWaveScale: 1.2,
                                      gridDivisions: 20,
                                      gridFadeDistance: 600,
                                      environmentIntensity: 1.2,
                                      qualityLevel: 'high'
                                    },
                                    ultra: {
                                      shadowsEnabled: true,
                                      waterEnabled: true,
                                      waterWaveSpeed: 0.5,
                                      waterWaveScale: 1.5,
                                      gridDivisions: 30,
                                      gridFadeDistance: 800,
                                      environmentIntensity: 1.5,
                                      qualityLevel: 'ultra'
                                    }
                                  };
                                  
                                  // Apply selected preset
                                  Object.entries(presets[quality as keyof typeof presets]).forEach(([key, value]) => {
                                    onChange(key as keyof SceneSettings, value);
                                  });
                                  
                                  // Dispatch an event to update the quality indicator
                                  window.dispatchEvent(new CustomEvent('quality-changed', {
                                    detail: { 
                                      quality,
                                      preset: presets[quality as keyof typeof presets]
                                    }
                                  }));
                                }}
                                color={quality === 'low' ? 'success' : 
                                       quality === 'medium' ? 'info' : 
                                       quality === 'high' ? 'primary' : 
                                       'secondary'}
                                sx={{ 
                                  textTransform: 'capitalize',
                                  minWidth: '60px',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {quality}
                              </Button>
                            ))}
                          </Stack>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          backgroundColor: 'rgba(50, 50, 50, 0.5)', 
                          borderRadius: 1, 
                          p: 1, 
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Current: {settings.qualityLevel || 'high'}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)' }}>
                              {settings.qualityLevel === 'low' ? 'Optimized for performance' : 
                               settings.qualityLevel === 'medium' ? 'Balanced performance and quality' : 
                               settings.qualityLevel === 'high' ? 'Recommended for most systems' :
                               'Maximum visual quality'}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Paper>
                  </Stack>
                </TabPanel>

                <TabPanel value={tabValue} index={4}>
                  <Stack spacing={3}>
                    {/* Background Color */}
                    <Box>
                      <SectionTitle>Background Color</SectionTitle>
                      <FormControl fullWidth size="small">
                        <InputLabel id="background-color-label">Background Color</InputLabel>
                        <Select
                          labelId="background-color-label" value={settings.backgroundColor} onChange={handleSelectChange('backgroundColor')}
                          label="Background Color"
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: selected as string, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.3)'}} />
                              {COLOR_PALETTES.backgrounds.find(color => color.value === selected)?.name || selected}
                            </Box>
                          )}
                        >
                          {COLOR_PALETTES.backgrounds.map((color) => (
                            <MenuItem key={color.value} value={color.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: 16, height: 16, mr: 1, backgroundColor: color.value, borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)'}} />
                                {color.name}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5}}>
                          Only visible if HDRI background is disabled or fails to load.
                      </Typography>
                    </Box>
                    
                    {/* Scene Themes */}
                    <Box>
                      <SectionTitle>Scene Themes</SectionTitle>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Apply a coordinated set of visual settings</Typography>
                      <Stack spacing={1.5}>
                        {SCENE_THEMES.map((sceneTheme, index) => (
                          <ThemeCard key={sceneTheme.name} selected={selectedTheme === sceneTheme.name} onClick={() => applyTheme(index)}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Stack direction="row" spacing={0.5}>
                                <ColorBlockButton bgColor={sceneTheme.backgroundColor} />
                                <Stack>
                                  <ColorBlockButton bgColor={sceneTheme.gridColorGrid} />
                                  <ColorBlockButton bgColor={sceneTheme.gridColorCenterLine} />
                                </Stack>
                              </Stack>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body2" fontWeight={500}>{sceneTheme.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {sceneTheme.ambientLightIntensity.toFixed(1)} amb, {sceneTheme.directionalLightIntensity.toFixed(1)} dir {sceneTheme.waterEnabled ? ", water" : ""}
                                </Typography>
                              </Box>
                              <Collapse in={selectedTheme === sceneTheme.name && themeApplied}><CheckCircleOutlineIcon color="success" /></Collapse>
                            </Stack>
                          </ThemeCard>
                        ))}
                      </Stack>
                    </Box>
                    
                    {/* Custom Theme Save */}
                    <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: 1, border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <DesignServicesOutlinedIcon color="primary" />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Create Custom Theme</Typography>
                        <Typography variant="caption" color="text.secondary">Adjust settings, then save as a custom theme</Typography>
                      </Box>
                      <Button variant="outlined" color="primary" size="small" startIcon={<SaveOutlinedIcon />} sx={{ ml: 'auto' }} onClick={onSavePreset} disabled={!onSavePreset}>Save</Button>
                    </Box>
                  </Stack>
                </TabPanel>
                
            </Box> { /* End Tab Contents Container */}
        </StyledPanel>
    );
};

export default memo(SceneSettingsPanel);

