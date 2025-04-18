import React, { useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Switch,
    FormControlLabel,
    Stack,
    Divider,
    Slider,
    Tooltip,
    Tabs,
    Tab,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    SelectChangeEvent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Brightness6Icon from '@mui/icons-material/Brightness6'; // Icon for Env Intensity
import WavesIcon from '@mui/icons-material/Waves'; // Icon for Water
import SpeedIcon from '@mui/icons-material/Speed'; // Icon for Speed
import ScaleIcon from '@mui/icons-material/Texture'; // Icon for Scale (using Texture icon)
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import GridOnIcon from '@mui/icons-material/GridOn';
import OpacityIcon from '@mui/icons-material/Opacity';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import TuneIcon from '@mui/icons-material/Tune';
import InvertColorsIcon from '@mui/icons-material/InvertColors';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { SceneSettings, GRID_PRESETS, SCENE_THEMES } from './types/SceneSettings'; // Assuming type is here

interface ViewerSettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    settings: SceneSettings;
    onChange: <K extends keyof SceneSettings>(setting: K, value: SceneSettings[K]) => void;
}

// Tab panel component 
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
            style={{ overflow: 'auto', maxHeight: 'calc(100vh - 130px)' }}
        >
            {value === index && (
                <Box sx={{ p: 2 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `settings-tab-${index}`,
        'aria-controls': `settings-tabpanel-${index}`,
    };
}

const ViewerSettingsOverlay: React.FC<ViewerSettingsOverlayProps> = ({
    isOpen,
    onClose,
    settings,
    onChange,
}) => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const settingName = event.target.name as keyof SceneSettings;
        if (settingName in settings) {
            onChange(settingName, event.target.checked);
        }
    };

    const handleSliderChange = (name: keyof SceneSettings) => (event: Event, value: number | number[]) => {
        if (name in settings && typeof value === 'number') {
             onChange(name, value);
        }
    };
    
    const handleColorChange = (name: keyof SceneSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
        if (name in settings) {
            onChange(name, event.target.value);
        }
    };
    
    const handleNumberChange = (name: keyof SceneSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
        if (name in settings) {
            const value = parseFloat(event.target.value);
            if (!isNaN(value)) {
                onChange(name, value);
            }
        }
    };

    const currentSettings = settings || {};
    
    // Find current grid preset and theme
    const currentGridPreset = GRID_PRESETS.find(
        p => p.gridSize === currentSettings.gridSize && 
             p.divisions === currentSettings.gridDivisions && 
             p.unit === currentSettings.gridUnit
    )?.name || "Custom";
    
    const currentTheme = SCENE_THEMES.find(
        t => t.backgroundColor === currentSettings.backgroundColor && 
             t.gridColorGrid === currentSettings.gridColorGrid &&
             t.gridColorCenterLine === currentSettings.gridColorCenterLine
    )?.name || "Custom";

    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: 340,
                    backgroundColor: 'rgba(25, 25, 25, 0.95)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(5px)',
                }
            }}
        >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>Scene Settings</Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <CloseIcon />
                </IconButton>
            </Box>
            
            <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                variant="scrollable" 
                scrollButtons="auto"
                sx={{ 
                    borderBottom: 1, 
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiTab-root': { 
                        minWidth: 'auto',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.8rem',
                        p: 1.5
                    },
                    '& .Mui-selected': {
                        color: '#4fc3f7',
                    },
                    '& .MuiTabs-indicator': {
                        backgroundColor: '#4fc3f7',
                    }
                }}
            >
                <Tab icon={<TuneIcon />} label="General" {...a11yProps(0)} />
                <Tab icon={<GridOnIcon />} label="Grid" {...a11yProps(1)} />
                <Tab icon={<WavesIcon />} label="Water" {...a11yProps(2)} />
                <Tab icon={<CameraAltIcon />} label="Camera" {...a11yProps(3)} />
            </Tabs>
            
            {/* General Tab */}
            <TabPanel value={activeTab} index={0}>
                <Stack spacing={2.5}>
                    <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: -0.5 }}>Visual Theme</Typography>
                    <FormControl fullWidth size="small" variant="outlined">
                        <InputLabel id="theme-select-label">Select Theme</InputLabel>
                        <Select
                            labelId="theme-select-label"
                            value={currentTheme}
                            label="Select Theme"
                            onChange={(e: SelectChangeEvent<string>) => {
                                const themeName = e.target.value;
                                const theme = SCENE_THEMES.find(t => t.name === themeName);
                                
                                if (theme) {
                                    onChange('backgroundColor', theme.backgroundColor);
                                    onChange('gridColorGrid', theme.gridColorGrid);
                                    onChange('gridColorCenterLine', theme.gridColorCenterLine);
                                    onChange('ambientLightIntensity', theme.ambientLightIntensity);
                                    onChange('directionalLightIntensity', theme.directionalLightIntensity);
                                    
                                    // Optional theme properties
                                    if (theme.waterEnabled !== undefined) onChange('waterEnabled', theme.waterEnabled);
                                    if (theme.waterColor) onChange('waterColor', theme.waterColor);
                                    if (theme.gridMinorColor) onChange('gridMinorColor', theme.gridMinorColor);
                                    if (theme.gridMajorColor) onChange('gridMajorColor', theme.gridMajorColor);
                                    if (theme.gridEnhancedVisibility !== undefined) 
                                        onChange('gridEnhancedVisibility', theme.gridEnhancedVisibility);
                                }
                            }}
                            sx={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                '.MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#4fc3f7',
                                }
                            }}
                        >
                            {SCENE_THEMES.map((theme) => (
                                <MenuItem key={theme.name} value={theme.name}>{theme.name}</MenuItem>
                            ))}
                            {currentTheme === "Custom" && <MenuItem value="Custom">Custom</MenuItem>}
                        </Select>
                    </FormControl>
                    
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                    
                    <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: -0.5 }}>Environment</Typography>
                    
                    {/* Background Color */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FormatColorFillIcon sx={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.6)' }} />
                        <Typography variant="body2" sx={{ minWidth: 140 }}>Background Color</Typography>
                        <Box 
                            sx={{ 
                                border: '2px solid rgba(255, 255, 255, 0.2)', 
                                borderRadius: 1, 
                                p: 0.5,
                                position: 'relative'
                            }}
                        >
                            <input 
                                type="color" 
                                value={currentSettings.backgroundColor || '#222222'}
                                onChange={handleColorChange('backgroundColor')}
                                style={{ 
                                    width: '30px', 
                                    height: '30px', 
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                            />
                        </Box>
                    </Stack>
                    
                    {/* Skybox Toggle */}
                    <Tooltip title="Toggle skybox visibility" placement="left">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentSettings.skyEnabled ?? false}
                                    onChange={handleSwitchChange}
                                    name="skyEnabled"
                                    size="small"
                                />
                            }
                            label="Show Skybox"
                            sx={{ justifyContent: 'space-between', ml: 0 }}
                            labelPlacement="start"
                        />
                    </Tooltip>
                    
                    {/* Environment Intensity Slider */}
                    <Tooltip title="Adjust environment lighting intensity" placement="left">
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <Brightness6Icon sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}/>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Env Intensity: {currentSettings.environmentIntensity?.toFixed(2) ?? 'N/A'}
                                </Typography>
                            </Stack>
                            <Slider
                                aria-label="Environment Intensity"
                                value={currentSettings.environmentIntensity ?? 0.7}
                                onChange={handleSliderChange('environmentIntensity')}
                                min={0}
                                max={2}
                                step={0.05}
                                size="small"
                                sx={{ 
                                    color: '#4fc3f7', 
                                    '& .MuiSlider-thumb': { bgcolor: '#4fc3f7' },
                                    mt: 0 // reduce margin top
                                }}
                            />
                        </Box>
                    </Tooltip>
                    
                    <Tooltip title="Toggle shadows" placement="left">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentSettings.shadowsEnabled ?? true}
                                    onChange={handleSwitchChange}
                                    name="shadowsEnabled"
                                    size="small"
                                />
                            }
                            label="Enable Shadows"
                            sx={{ justifyContent: 'space-between', ml: 0 }}
                            labelPlacement="start"
                        />
                    </Tooltip>
                    
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                    
                    <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: -0.5 }}>Scene Quality</Typography>
                    
                    <FormControl fullWidth size="small" variant="outlined">
                        <InputLabel id="quality-select-label">Quality Level</InputLabel>
                        <Select
                            labelId="quality-select-label"
                            value={currentSettings.qualityLevel || 'medium'}
                            name="qualityLevel"
                            label="Quality Level"
                            onChange={(e: SelectChangeEvent<string>) => onChange('qualityLevel', e.target.value as 'low' | 'medium' | 'high' | 'ultra')}
                            sx={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                '.MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#4fc3f7',
                                }
                            }}
                        >
                            <MenuItem value="low">Low (Best Performance)</MenuItem>
                            <MenuItem value="medium">Medium (Balanced)</MenuItem>
                            <MenuItem value="high">High (Better Visuals)</MenuItem>
                            <MenuItem value="ultra">Ultra (Best Quality)</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </TabPanel>
            
            {/* Grid Tab */}
            <TabPanel value={activeTab} index={1}>
                <Stack spacing={2.5}>
                    <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: -0.5 }}>Grid Configuration</Typography>
                    
                    <FormControl fullWidth size="small" variant="outlined">
                        <InputLabel id="grid-preset-select-label">Grid Preset</InputLabel>
                        <Select
                            labelId="grid-preset-select-label"
                            value={currentGridPreset}
                            label="Grid Preset"
                            onChange={(e: SelectChangeEvent<string>) => {
                                const presetName = e.target.value;
                                const preset = GRID_PRESETS.find(p => p.name === presetName);
                                
                                if (preset) {
                                    onChange('gridSize', preset.gridSize);
                                    onChange('gridDivisions', preset.divisions);
                                    onChange('gridFadeDistance', preset.fadeDistance);
                                    onChange('gridUnit', preset.unit);
                                    if (preset.majorLineInterval) {
                                        onChange('gridMajorLineInterval', preset.majorLineInterval);
                                    }
                                }
                            }}
                            sx={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                '.MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#4fc3f7',
                                }
                            }}
                        >
                            {GRID_PRESETS.map((preset) => (
                                <MenuItem key={preset.name} value={preset.name}>{preset.name}</MenuItem>
                            ))}
                            {currentGridPreset === "Custom" && <MenuItem value="Custom">Custom</MenuItem>}
                        </Select>
                    </FormControl>
                    
                    {/* Grid Toggle */}
                    <Tooltip title="Toggle ground grid visibility" placement="left">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentSettings.gridVisible ?? true}
                                    onChange={handleSwitchChange}
                                    name="gridVisible"
                                    size="small"
                                />
                            }
                            label="Show Grid"
                            sx={{ justifyContent: 'space-between', ml: 0 }}
                            labelPlacement="start"
                        />
                    </Tooltip>
                    
                    {/* Enhanced Grid Visibility */}
                    <Tooltip title="Enhanced grid visibility mode" placement="left">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentSettings.gridEnhancedVisibility ?? true}
                                    onChange={handleSwitchChange}
                                    name="gridEnhancedVisibility"
                                    size="small"
                                />
                            }
                            label="Enhanced Grid Visibility"
                            sx={{ justifyContent: 'space-between', ml: 0 }}
                            labelPlacement="start"
                        />
                    </Tooltip>
                    
                    {/* Grid Size */}
                    <Tooltip title="Set grid overall size" placement="left">
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <ViewInArIcon sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}/>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Grid Size ({currentSettings.gridUnit})
                                </Typography>
                            </Stack>
                            <TextField
                                type="number"
                                value={currentSettings.gridSize || 600}
                                onChange={handleNumberChange('gridSize')}
                                variant="outlined"
                                size="small"
                                InputProps={{
                                    inputProps: {
                                        min: 100,
                                        max: 5000,
                                        step: 100
                                    },
                                    sx: {
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        '.MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(255, 255, 255, 0.2)',
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#4fc3f7',
                                        }
                                    }
                                }}
                                fullWidth
                            />
                        </Box>
                    </Tooltip>
                    
                    {/* Grid Divisions */}
                    <Tooltip title="Set grid division count" placement="left">
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <GridOnIcon sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}/>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Grid Divisions
                                </Typography>
                            </Stack>
                            <Slider
                                aria-label="Grid Divisions"
                                value={currentSettings.gridDivisions || 16}
                                onChange={handleSliderChange('gridDivisions')}
                                min={4}
                                max={100}
                                step={1}
                                marks={[
                                    { value: 10, label: '10' },
                                    { value: 50, label: '50' },
                                    { value: 100, label: '100' }
                                ]}
                                size="small"
                                sx={{ 
                                    color: '#4fc3f7', 
                                    '& .MuiSlider-thumb': { bgcolor: '#4fc3f7' }
                                }}
                            />
                        </Box>
                    </Tooltip>
                    
                    {/* Grid Colors */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <ColorLensIcon sx={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.6)' }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>Grid Color</Typography>
                        <Box 
                            sx={{ 
                                border: '2px solid rgba(255, 255, 255, 0.2)', 
                                borderRadius: 1, 
                                p: 0.5,
                                position: 'relative'
                            }}
                        >
                            <input 
                                type="color" 
                                value={currentSettings.gridColorGrid || '#FFFFFF'}
                                onChange={handleColorChange('gridColorGrid')}
                                style={{ 
                                    width: '30px', 
                                    height: '30px', 
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                            />
                        </Box>
                    </Stack>
                    
                    <Stack direction="row" spacing={1} alignItems="center">
                        <ColorLensIcon sx={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.6)' }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>Center Line Color</Typography>
                        <Box 
                            sx={{ 
                                border: '2px solid rgba(255, 255, 255, 0.2)', 
                                borderRadius: 1, 
                                p: 0.5,
                                position: 'relative'
                            }}
                        >
                            <input 
                                type="color" 
                                value={currentSettings.gridColorCenterLine || '#FFFFFF'}
                                onChange={handleColorChange('gridColorCenterLine')}
                                style={{ 
                                    width: '30px', 
                                    height: '30px', 
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                            />
                        </Box>
                    </Stack>
                    
                    {/* Grid under water */}
                    <Tooltip title="Show grid under transparent water" placement="left">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentSettings.gridShowUnderWater ?? true}
                                    onChange={handleSwitchChange}
                                    name="gridShowUnderWater"
                                    size="small"
                                />
                            }
                            label="Show Grid Under Water"
                            sx={{ justifyContent: 'space-between', ml: 0 }}
                            labelPlacement="start"
                        />
                    </Tooltip>
                </Stack>
            </TabPanel>
            
            {/* Water Tab */}
            <TabPanel value={activeTab} index={2}>
                <Stack spacing={2.5}>
                    <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: -0.5 }}>Water Effects</Typography>
                    
                    {/* Water Toggle */}
                    <Tooltip title="Toggle water effect visibility" placement="left">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentSettings.waterEnabled ?? false}
                                    onChange={handleSwitchChange}
                                    name="waterEnabled"
                                    size="small"
                                />
                            }
                            label="Enable Water"
                            sx={{ justifyContent: 'space-between', ml: 0 }}
                            labelPlacement="start"
                        />
                    </Tooltip>
                    
                    {/* Water Color Picker */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <InvertColorsIcon sx={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.6)' }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>Water Color</Typography>
                        <Box 
                            sx={{ 
                                border: '2px solid rgba(255, 255, 255, 0.2)', 
                                borderRadius: 1, 
                                p: 0.5,
                                position: 'relative'
                            }}
                        >
                            <input 
                                type="color" 
                                value={currentSettings.waterColor || '#194987'}
                                onChange={handleColorChange('waterColor')}
                                style={{ 
                                    width: '30px', 
                                    height: '30px', 
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                            />
                        </Box>
                    </Stack>

                    {/* Water Controls */}
                    {/* Water Opacity Slider */}
                    <Tooltip title="Adjust water opacity" placement="left">
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <OpacityIcon sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}/>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Water Opacity: {currentSettings.waterOpacity?.toFixed(2) ?? 'N/A'}
                                </Typography>
                            </Stack>
                            <Slider
                                aria-label="Water Opacity"
                                value={currentSettings.waterOpacity ?? 0.7}
                                onChange={handleSliderChange('waterOpacity')}
                                min={0}
                                max={1}
                                step={0.05}
                                size="small"
                                sx={{ 
                                    color: '#64b5f6', // Lighter blue for water
                                    '& .MuiSlider-thumb': { bgcolor: '#64b5f6' },
                                    mt: 0
                                }}
                            />
                        </Box>
                    </Tooltip>

                    {/* Water Wave Speed Slider */}
                    <Tooltip title="Adjust water wave speed" placement="left">
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <SpeedIcon sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}/>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Wave Speed: {currentSettings.waterWaveSpeed?.toFixed(2) ?? 'N/A'}
                                </Typography>
                            </Stack>
                            <Slider
                                aria-label="Water Wave Speed"
                                value={currentSettings.waterWaveSpeed ?? 0.1}
                                onChange={handleSliderChange('waterWaveSpeed')}
                                min={0}
                                max={0.5}
                                step={0.01}
                                size="small"
                                sx={{ color: '#64b5f6', '& .MuiSlider-thumb': { bgcolor: '#64b5f6' }, mt: 0 }}
                            />
                        </Box>
                    </Tooltip>

                    {/* Water Wave Scale/Length Slider */}
                    <Tooltip title="Adjust water wave size/scale" placement="left">
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <ScaleIcon sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}/>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Wave Scale: {currentSettings.waterWaveScale?.toFixed(2) ?? 'N/A'}
                                </Typography>
                            </Stack>
                            <Slider
                                aria-label="Water Wave Scale"
                                value={currentSettings.waterWaveScale ?? 1.2}
                                onChange={handleSliderChange('waterWaveScale')}
                                min={0.1}
                                max={5}
                                step={0.1}
                                size="small"
                                sx={{ color: '#64b5f6', '& .MuiSlider-thumb': { bgcolor: '#64b5f6' }, mt: 0 }}
                            />
                        </Box>
                    </Tooltip>
                </Stack>
            </TabPanel>
            
            {/* Camera Tab */}
            <TabPanel value={activeTab} index={3}>
                <Stack spacing={2.5}>
                    <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: -0.5 }}>Camera Settings</Typography>
                    
                    {/* FOV Slider */}
                    <Tooltip title="Adjust field of view" placement="left">
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <CameraAltIcon sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}/>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Field of View: {currentSettings.fov ?? 60}°
                                </Typography>
                            </Stack>
                            <Slider
                                aria-label="Field of View"
                                value={currentSettings.fov ?? 60}
                                onChange={handleSliderChange('fov')}
                                min={20}
                                max={120}
                                step={1}
                                marks={[
                                    { value: 30, label: '30°' },
                                    { value: 60, label: '60°' },
                                    { value: 90, label: '90°' }
                                ]}
                                size="small"
                                sx={{ 
                                    color: '#4fc3f7', 
                                    '& .MuiSlider-thumb': { bgcolor: '#4fc3f7' },
                                    mt: 0
                                }}
                            />
                        </Box>
                    </Tooltip>
                    
                    {/* Camera Damping */}
                    <Tooltip title="Smooth camera movement" placement="left">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentSettings.cameraDamping ?? true}
                                    onChange={handleSwitchChange}
                                    name="cameraDamping"
                                    size="small"
                                />
                            }
                            label="Camera Damping"
                            sx={{ justifyContent: 'space-between', ml: 0 }}
                            labelPlacement="start"
                        />
                    </Tooltip>
                    
                    {/* Camera Invert Y */}
                    <Tooltip title="Invert vertical camera control" placement="left">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentSettings.cameraInvertY ?? false}
                                    onChange={handleSwitchChange}
                                    name="cameraInvertY"
                                    size="small"
                                />
                            }
                            label="Invert Y Axis"
                            sx={{ justifyContent: 'space-between', ml: 0 }}
                            labelPlacement="start"
                        />
                    </Tooltip>
                    
                    {/* Show Axes */}
                    <Tooltip title="Show coordinate system axes" placement="left">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={currentSettings.axesVisible ?? true}
                                    onChange={handleSwitchChange}
                                    name="axesVisible"
                                    size="small"
                                />
                            }
                            label="Show Coordinate Axes"
                            sx={{ justifyContent: 'space-between', ml: 0 }}
                            labelPlacement="start"
                        />
                    </Tooltip>
                </Stack>
            </TabPanel>
        </Drawer>
    );
};

export default ViewerSettingsOverlay; 