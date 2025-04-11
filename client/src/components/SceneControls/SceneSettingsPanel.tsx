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
import { SceneSettings, SceneTheme, SCENE_THEMES, GRID_PRESETS } from '../Local3DViewer/types/SceneSettings';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';

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

    if (!open) return null;

    return (
        <StyledPanel>
            <StyledHeader>
              <Typography variant="subtitle1" fontWeight={500}>
                Scene Settings
              </Typography>
              <IconButton onClick={onClose} size="small" edge="end" aria-label="close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </StyledHeader>

            <StyledTabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              aria-label="scene settings tabs"
            >
              <Tab icon={<GridOnIcon />} label="Grid" />
              <Tab icon={<TerrainIcon />} label="Ground" />
              <Tab icon={<CameraAltIcon />} label="Camera" />
              <Tab icon={<LightModeIcon />} label="Lighting" />
              <Tab icon={<PaletteIcon />} label="Theme" />
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

                    {/* Grid Presets */}
                    <Box>
                      <SectionTitle>Grid Scale Presets</SectionTitle>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                        Select a preset optimized for different operational scales
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {GRID_PRESETS.map((preset) => (
                          <PresetCard 
                            key={preset.name}
                            selected={selectedGridPreset === preset.name}
                            onClick={() => applyGridPreset(preset)}
                            sx={{ width: 'calc(50% - 8px)', mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}
                          >
                            <Typography variant="body2" fontWeight={500}>{preset.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {preset.gridSize} {preset.unit} • {preset.divisions} divisions
                              {preset.majorLineInterval ? ` • ${preset.majorLineInterval}:1 major lines` : ''}
                            </Typography>
                          </PresetCard>
                        ))}
                      </Stack>
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

                    {/* Water Surface Toggle & Settings */}
                    <Box>
                      <SectionTitle>Water Surface</SectionTitle>
                      <FormControlLabel
                        control={<Switch checked={settings.waterEnabled ?? false} onChange={handleSwitchChange('waterEnabled')} color="primary" size="small" />}
                        label={<Typography variant="body2">Enable Water Surface</Typography>}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block' }}>
                        {settings.gridShowUnderWater ? 'Grid will be visible under transparent water' : 'Grid will be hidden when water is enabled'}
                      </Typography>
                    </Box>
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
                              <StyledSlider value={settings.waterWaveSpeed ?? 0.5} onChange={handleSliderChange('waterWaveSpeed')} min={0} max={2} step={0.1} valueLabelDisplay="auto" />
                            </Box>
                            <Box>
                              <Typography variant="body2" gutterBottom>Wave Scale (Height)</Typography>
                              <StyledSlider value={settings.waterWaveScale ?? 1.0} onChange={handleSliderChange('waterWaveScale')} min={0.1} max={3} step={0.1} valueLabelDisplay="auto" />
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
                    {/* --- HDRI Controls --- */}
                    <Box>
                      <SectionTitle>Environment Map (HDRI)</SectionTitle>
                      {/* Map Selection Dropdown */}
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel id="env-map-label">Environment Map</InputLabel>
                        <Select
                          labelId="env-map-label"
                          value={settings.environmentMap ?? ''} // Use empty string if null for Select
                          onChange={handleSelectChange('environmentMap')} // Set to null if empty string selected
                          label="Environment Map"
                        >
                          {/* Add an option for None */}
                          <MenuItem value={''}><em>None (Use Sky/Background Color)</em></MenuItem>
                          {/* Predefined List of HDRI presets available in drei */}
                          <MenuItem value={'sunset'}>Sunset</MenuItem>
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
                    </Box>
                    
                    {/* Environment Intensity */}
                    <Box>
                      <SectionTitle>Environment Intensity</SectionTitle>
                      <StyledSlider 
                        value={settings.environmentIntensity} 
                        onChange={handleSliderChange('environmentIntensity')} 
                        min={0} 
                        max={3} 
                        step={0.1} 
                        marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }, { value: 3, label: '3' }]} 
                        valueLabelDisplay="auto" 
                        disabled={!settings.environmentMap}
                      />
                      <Typography variant="caption" color="text.secondary">Controls the brightness of the HDRI environment lighting</Typography>
                    </Box>
                    
                    <Divider />
                    
                    {/* Sky Toggle */}
                    <Box>
                       <SectionTitle>Sky & Sun</SectionTitle>
                       <FormControlLabel 
                           control={<Switch checked={settings.skyEnabled} onChange={handleSwitchChange('skyEnabled')} color="primary" size="small" disabled={!!settings.environmentMap}/>} // Disable if HDRI is used for background
                           label={<Typography variant="body2">Enable Procedural Sky & Sun</Typography>} 
                       />
                       <Typography variant="caption" color="text.secondary" sx={{ display: 'block'}}>
                           Usually disabled when using HDRI background. Enable to layer sun effects.
                       </Typography>
                    </Box>
                    
                    {/* Ambient Light */}
                    <Box>
                      <SectionTitle>Ambient Light</SectionTitle>
                      <StyledSlider value={settings.ambientLightIntensity} onChange={handleSliderChange('ambientLightIntensity')} min={0} max={2} step={0.1} marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }, { value: 2, label: '2' }]} valueLabelDisplay="auto" />
                      <Typography variant="caption" color="text.secondary">Overall scene brightness (less needed with HDRI)</Typography>
                    </Box>
                    
                    {/* Directional Light */}
                    <Box>
                      <SectionTitle>Directional Light (Sun)</SectionTitle>
                      <StyledSlider value={settings.directionalLightIntensity} onChange={handleSliderChange('directionalLightIntensity')} min={0} max={3} step={0.1} marks={[{ value: 0, label: '0' }, { value: 1.5, label: '1.5' }, { value: 3, label: '3' }]} valueLabelDisplay="auto" />
                      <Typography variant="caption" color="text.secondary">Intensity of the main light source (sun)</Typography>
                    </Box>
                    
                    {/* Sun Position (Collapsible based on Sky Toggle) */}
                    <Collapse in={settings.skyEnabled && !settings.environmentMap}> {/* Also hide if HDRI is active */}
                      <Box>
                        <SectionTitle>Sun Position</SectionTitle>
                        <Stack direction="row" spacing={2}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" gutterBottom>Elevation</Typography>
                            <StyledSlider
                              value={settings.sunPosition?.[1] ?? 10}
                              onChange={(_, value) => handleSunPositionChange(1, value as number)}
                              min={-10} max={180} step={1} valueLabelDisplay="auto"
                              marks={[{ value: 0, label: 'Horizon' }, { value: 90, label: 'Overhead' }, { value: 180, label: 'Below' }]}
                            />
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" gutterBottom>Rotation (Azimuth)</Typography>
                            <StyledSlider
                              value={(Math.atan2(settings.sunPosition?.[0] ?? 100, settings.sunPosition?.[2] ?? 100) * 180 / Math.PI + 360) % 360}
                              onChange={(_, value) => {
                                const angle = (value as number) * Math.PI / 180;
                                const distance = Math.sqrt(Math.pow(settings.sunPosition?.[0] ?? 100, 2) + Math.pow(settings.sunPosition?.[2] ?? 100, 2));
                                handleSunPositionChange(0, Math.sin(angle) * distance);
                                handleSunPositionChange(2, Math.cos(angle) * distance);
                              }}
                              min={0} max={360} step={5} valueLabelDisplay="auto"
                              marks={[{ value: 0, label: 'N' }, { value: 90, label: 'E' }, { value: 180, label: 'S' }, { value: 270, label: 'W' }, { value: 360, label: 'N' }]}
                            />
                          </Box>
                        </Stack>
                      </Box>
                    </Collapse>
                    
                    {/* Shadows Toggle */}
                    <Box>
                      <SectionTitle>Shadows</SectionTitle>
                      <FormControlLabel control={<Switch checked={settings.shadowsEnabled ?? true} onChange={handleSwitchChange('shadowsEnabled')} color="primary" size="small" />} label={<Typography variant="body2">Enable Shadows</Typography>} />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Improves depth but impacts performance</Typography>
                    </Box>
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

