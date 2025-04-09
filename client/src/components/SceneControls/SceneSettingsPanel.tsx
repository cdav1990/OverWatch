import React from 'react';
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
    Grid
} from '@mui/material';
import { SceneSettings } from '../Local3DViewer/types/SceneSettings';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';

interface SceneSettingsPanelProps {
    settings: SceneSettings;
    onChange: (field: keyof SceneSettings, value: any) => void;
}

const SceneSettingsPanel: React.FC<SceneSettingsPanelProps> = ({ settings, onChange }) => {

    const handleSliderChange = (field: keyof SceneSettings, event: Event, value: number | number[]) => {
        onChange(field, value as number);
    };

    const handleSwitchChange = (field: keyof SceneSettings, event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(field, event.target.checked);
    };

    const handleTextChange = (field: keyof SceneSettings, event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(field, event.target.value);
    };

    // Handler specifically for sun position (assuming 3 number inputs)
    const handleSunPositionChange = (index: 0 | 1 | 2, event: React.ChangeEvent<HTMLInputElement>) => {
        const currentPosition = [...settings.sunPosition]; // Copy current array
        const newValue = Number(event.target.value);
        if (!isNaN(newValue)) {
            currentPosition[index] = newValue;
            onChange('sunPosition', currentPosition); // Pass the updated array
        }
    };

    return (
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}> {/* Use transparent background */}
            <Stack spacing={3}>
                {/* Grid Settings */}
                <Box>
                    <Typography variant="overline" display="block" gutterBottom>Grid</Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControlLabel
                                control={<Switch checked={settings.gridVisible} onChange={(e) => handleSwitchChange('gridVisible', e)} size="small" />}
                                label={<Typography variant="body2">Visible</Typography>}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" gutterBottom id="grid-size-label">
                                Grid Scale: 300 meters (984 feet)
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                                Fixed for consistent visualization
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" gutterBottom id="grid-div-label">
                                Divisions ({settings.gridDivisions})
                            </Typography>
                            <Slider
                                aria-labelledby="grid-div-label"
                                value={settings.gridDivisions}
                                onChange={(e, v) => handleSliderChange('gridDivisions', e, v)}
                                min={2} max={100} step={1}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" gutterBottom id="grid-fade-label">
                                Fade Distance ({settings.gridFadeDistance})
                            </Typography>
                            <Slider
                                aria-labelledby="grid-fade-label"
                                value={settings.gridFadeDistance}
                                onChange={(e, v) => handleSliderChange('gridFadeDistance', e, v)}
                                min={5} max={300} step={1}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Center Line Color"
                                value={settings.gridColorCenterLine}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange('gridColorCenterLine', e)}
                                variant="outlined"
                                size="small"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Grid Line Color"
                                value={settings.gridColorGrid}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange('gridColorGrid', e)}
                                variant="outlined"
                                size="small"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </Box>

                {/* Ground & Water Settings - NEW SECTION */}
                <Box>
                    <Typography variant="overline" display="block" gutterBottom>Ground & Water</Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControlLabel
                                control={<Switch checked={settings.showBelowGround} onChange={(e) => handleSwitchChange('showBelowGround', e)} size="small" />}
                                label={<Typography variant="body2">Show Below Ground</Typography>}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControlLabel
                                control={<Switch checked={settings.waterEnabled} onChange={(e) => handleSwitchChange('waterEnabled', e)} size="small" />}
                                label={<Typography variant="body2">Enable Water Effect</Typography>}
                            />
                        </Grid>
                        {settings.waterEnabled && (
                            <>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label="Water Color"
                                        value={settings.waterColor}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange('waterColor', e)}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2" gutterBottom id="water-opacity-label">
                                        Water Opacity ({settings.waterOpacity.toFixed(2)})
                                    </Typography>
                                    <Slider
                                        aria-labelledby="water-opacity-label"
                                        value={settings.waterOpacity}
                                        onChange={(e, v) => handleSliderChange('waterOpacity', e, v)}
                                        min={0} max={1} step={0.05}
                                        size="small"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2" gutterBottom id="water-wave-speed-label">
                                        Wave Speed ({settings.waterWaveSpeed.toFixed(2)})
                                    </Typography>
                                    <Slider
                                        aria-labelledby="water-wave-speed-label"
                                        value={settings.waterWaveSpeed}
                                        onChange={(e, v) => handleSliderChange('waterWaveSpeed', e, v)}
                                        min={0} max={2} step={0.1}
                                        size="small"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2" gutterBottom id="water-wave-scale-label">
                                        Wave Scale ({settings.waterWaveScale.toFixed(2)})
                                    </Typography>
                                    <Slider
                                        aria-labelledby="water-wave-scale-label"
                                        value={settings.waterWaveScale}
                                        onChange={(e, v) => handleSliderChange('waterWaveScale', e, v)}
                                        min={0.1} max={3} step={0.1}
                                        size="small"
                                    />
                                </Grid>
                            </>
                        )}
                    </Grid>
                </Box>

                {/* Scene Background */}
                <Box>
                    <Typography variant="overline" display="block" gutterBottom>Scene</Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <TextField
                        label="Background Color"
                        value={settings.backgroundColor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange('backgroundColor', e)}
                        variant="outlined"
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>

                {/* Lighting Settings */}
                <Box>
                    <Typography variant="overline" display="block" gutterBottom>Lighting</Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" gutterBottom id="ambient-intensity-label">
                                Ambient Intensity ({settings.ambientLightIntensity.toFixed(1)})
                            </Typography>
                            <Slider
                                aria-labelledby="ambient-intensity-label"
                                value={settings.ambientLightIntensity}
                                onChange={(e, v) => handleSliderChange('ambientLightIntensity', e, v)}
                                min={0} max={2} step={0.1}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" gutterBottom id="directional-intensity-label">
                                Directional Intensity ({settings.directionalLightIntensity.toFixed(1)})
                            </Typography>
                            <Slider
                                aria-labelledby="directional-intensity-label"
                                value={settings.directionalLightIntensity}
                                onChange={(e, v) => handleSliderChange('directionalLightIntensity', e, v)}
                                min={0} max={3} step={0.1}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControlLabel
                                control={<Switch checked={settings.skyEnabled} onChange={(e) => handleSwitchChange('skyEnabled', e)} size="small" />}
                                label={<Typography variant="body2">Enable Sky/Sun</Typography>}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }} container spacing={1}>
                            <Grid size={{ xs: 12 }}><Typography variant="body2">Sun Position</Typography></Grid>
                            <Grid size={{ xs: 4 }}>
                                <TextField
                                    label="X" type="number" size="small" variant="outlined"
                                    value={settings.sunPosition[0]}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSunPositionChange(0, e)}
                                    disabled={!settings.skyEnabled}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                                <TextField
                                    label="Y" type="number" size="small" variant="outlined"
                                    value={settings.sunPosition[1]}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSunPositionChange(1, e)}
                                    disabled={!settings.skyEnabled}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                                <TextField
                                    label="Z" type="number" size="small" variant="outlined"
                                    value={settings.sunPosition[2]}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSunPositionChange(2, e)}
                                    disabled={!settings.skyEnabled}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                </Box>

                {/* Other Settings (like FOV) */}
                <Box>
                    <Typography variant="overline" display="block" gutterBottom>Camera</Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography variant="body2" gutterBottom id="fov-label">
                        Field of View ({settings.fov.toFixed(0)}°)
                    </Typography>
                    <Slider
                        aria-labelledby="fov-label"
                        value={settings.fov}
                        onChange={(e, v) => handleSliderChange('fov', e, v)}
                        min={20} max={120} step={1}
                        size="small"
                    />
                </Box>

            </Stack>
        </Paper>
    );
};

export default SceneSettingsPanel;

