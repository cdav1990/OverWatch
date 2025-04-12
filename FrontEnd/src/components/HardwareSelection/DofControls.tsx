import React from 'react';
import { Box, Typography, Slider, Stack, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { useMission } from '../../context/MissionContext';
import { getLensFStops } from '../../utils/hardwareDatabase';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';

interface DofControlsProps {
    simplified?: boolean; // Add optional prop for simplified mode
}

const DofControls: React.FC<DofControlsProps> = ({ simplified = false }) => {
    const { state: missionState, dispatch } = useMission();
    const { hardware } = missionState;
    const selectedLens = hardware?.lensDetails;

    // Read values directly from context, providing defaults if null
    const aperture = hardware?.fStop ?? 5.6;
    const focusDistanceM = hardware?.focusDistance ?? 10;
    const focusDistanceFeet = metersToFeet(focusDistanceM);

    // Handlers to dispatch granular updates to context
    const handleApertureChange = (event: SelectChangeEvent<number>) => {
        const newAperture = Number(event.target.value);
        // Immediately update context - no need to wait for confirm button
        dispatch({ 
            type: 'UPDATE_HARDWARE_FIELD', 
            payload: { field: 'fStop', value: newAperture }
        });
    };

    const handleFocusDistanceChange = (event: SelectChangeEvent<number>) => {
        const newFocusFeet = Number(event.target.value);
        // Immediately update context - no need to wait for confirm button
        dispatch({ 
            type: 'UPDATE_HARDWARE_FIELD', 
            payload: { field: 'focusDistance', value: feetToMeters(newFocusFeet) }
        });
    };

    const handleFocusSliderChange = (event: Event, newValue: number | number[]) => {
        const newFocusFeet = newValue as number;
        // Immediately update context - no need to wait for confirm button
        dispatch({ 
            type: 'UPDATE_HARDWARE_FIELD', 
            payload: { field: 'focusDistance', value: feetToMeters(newFocusFeet) }
        });
    };

    // Determine slider limits based on selected lens
    const minFStop = selectedLens?.maxAperture || 1.4;
    const maxFStop = selectedLens?.minAperture || 22;
    const fStopStep = 0.1; // Or derive from getLensFStops if needed

    const minFocusFeet = 3;
    const maxFocusFeet = 400;
    const focusStep = 1;

    // Get available f-stop values from the lens
    const availableFStops = getLensFStops(selectedLens || undefined);

    // Disable controls if no camera/lens selected in context
    const controlsDisabled = !hardware?.cameraDetails || !hardware?.lensDetails;

    // Function to generate distance values for dropdown
    const generateDistanceOptions = () => {
        const options = [];
        for (let i = 3; i <= 10; i++) {
            options.push(i);
        }
        for (let i = 15; i <= 50; i += 5) {
            options.push(i);
        }
        for (let i = 60; i <= 100; i += 10) {
            options.push(i);
        }
        for (let i = 150; i <= 400; i += 50) {
            options.push(i);
        }
        return options;
    };

    // Common select style
    const selectStyle = {
        color: 'rgba(255, 255, 255, 0.95)',
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(70, 70, 70, 0.8)'
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(100, 100, 100, 0.9)'
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#4fc3f7'
        },
        '&.Mui-disabled': {
            '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(50, 50, 50, 0.5)'
            }
        }
    };

    // Common menu props
    const menuProps = {
        PaperProps: {
            sx: {
                bgcolor: '#111111',
                borderRadius: 1,
                boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
                '& .MuiMenuItem-root': {
                    color: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                        backgroundColor: 'rgba(79, 195, 247, 0.1)'
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(79, 195, 247, 0.2)',
                        color: '#4fc3f7'
                    }
                }
            }
        }
    };

    // For simplified mode, we'll show side-by-side dropdowns
    if (simplified) {
        return (
            <Box>
                <Stack direction="row" spacing={3}>
                    <Box sx={{ flex: 1 }}>
                        <FormControl fullWidth size="small" disabled={controlsDisabled}>
                            <InputLabel id="aperture-select-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                Aperture (f/)
                            </InputLabel>
                            <Select
                                labelId="aperture-select-label"
                                value={aperture}
                                label="Aperture (f/)"
                                onChange={handleApertureChange}
                                sx={selectStyle}
                                MenuProps={menuProps}
                            >
                                {availableFStops.map(fStop => (
                                    <MenuItem key={fStop} value={fStop}>f/{fStop.toFixed(1)}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <FormControl fullWidth size="small" disabled={controlsDisabled}>
                            <InputLabel id="focus-distance-select-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                Focus Distance (ft)
                            </InputLabel>
                            <Select
                                labelId="focus-distance-select-label"
                                value={Math.round(focusDistanceFeet)}
                                label="Focus Distance (ft)"
                                onChange={handleFocusDistanceChange}
                                sx={selectStyle}
                                MenuProps={menuProps}
                            >
                                {generateDistanceOptions().map(distance => (
                                    <MenuItem key={distance} value={distance}>{distance} ft</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Stack>
            </Box>
        );
    }

    // Original full controls with sliders
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: '#4fc3f7', fontWeight: 500 }}>
                Depth of Field Controls
            </Typography>
            {controlsDisabled ? (
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Select a camera and lens to enable controls.
                </Typography>
            ) : (
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {/* Aperture Slider */}
                    <Box>
                        <Typography variant="caption" gutterBottom id="aperture-slider-label" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            Aperture (f/)
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Slider
                                aria-labelledby="aperture-slider-label"
                                value={aperture}
                                onChange={(e, value) => {
                                    // Immediately update context - no need to wait for confirm button
                                    dispatch({ 
                                        type: 'UPDATE_HARDWARE_FIELD', 
                                        payload: { field: 'fStop', value: value as number }
                                    });
                                }}
                                min={minFStop}
                                max={maxFStop}
                                step={fStopStep}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `f/${value.toFixed(1)}`}
                                sx={{ 
                                    flexGrow: 1,
                                    color: '#4fc3f7',
                                    '& .MuiSlider-rail': {
                                        backgroundColor: 'rgba(70, 70, 70, 0.8)'
                                    },
                                    '& .MuiSlider-track': {
                                        backgroundColor: '#4fc3f7'
                                    },
                                    '& .MuiSlider-thumb': {
                                        backgroundColor: '#4fc3f7',
                                        '&:hover, &.Mui-focusVisible': {
                                            boxShadow: '0px 0px 0px 8px rgba(79, 195, 247, 0.2)'
                                        }
                                    },
                                    '& .MuiSlider-valueLabel': {
                                        backgroundColor: '#111111',
                                        color: '#4fc3f7',
                                        border: '1px solid #333333'
                                    }
                                }}
                            />
                            <Typography variant="body2" sx={{ minWidth: '50px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.9)', fontFamily: '"Roboto Mono", monospace' }}>
                                f/{aperture.toFixed(1)}
                            </Typography>
                        </Stack>
                    </Box>

                    {/* Focus Distance Slider */}
                    <Box>
                        <Typography variant="caption" gutterBottom id="focus-distance-slider-label" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            Focus Distance (ft)
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Slider
                                aria-labelledby="focus-distance-slider-label"
                                value={focusDistanceFeet}
                                onChange={handleFocusSliderChange}
                                min={minFocusFeet}
                                max={maxFocusFeet}
                                step={focusStep}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${value} ft`}
                                sx={{ 
                                    flexGrow: 1,
                                    color: '#4fc3f7',
                                    '& .MuiSlider-rail': {
                                        backgroundColor: 'rgba(70, 70, 70, 0.8)'
                                    },
                                    '& .MuiSlider-track': {
                                        backgroundColor: '#4fc3f7'
                                    },
                                    '& .MuiSlider-thumb': {
                                        backgroundColor: '#4fc3f7',
                                        '&:hover, &.Mui-focusVisible': {
                                            boxShadow: '0px 0px 0px 8px rgba(79, 195, 247, 0.2)'
                                        }
                                    },
                                    '& .MuiSlider-valueLabel': {
                                        backgroundColor: '#111111',
                                        color: '#4fc3f7',
                                        border: '1px solid #333333'
                                    }
                                }}
                            />
                            <Typography variant="body2" sx={{ minWidth: '50px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.9)', fontFamily: '"Roboto Mono", monospace' }}>
                                {focusDistanceFeet.toFixed(0)} ft
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>
            )}
        </Box>
    );
};

export default DofControls; 