import React, { useEffect } from 'react';
import { Box, Typography, Slider, Stack } from '@mui/material';
import { useMission } from '../../context/MissionContext';
import { getLensFStops } from '../../utils/hardwareDatabase';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';

const DofControls: React.FC = () => {
    const { state: missionState, dispatch } = useMission();
    const { hardware } = missionState;
    const selectedLens = hardware?.lensDetails;

    // Read values directly from context, providing defaults if null
    const aperture = hardware?.fStop ?? 5.6;
    const focusDistanceM = hardware?.focusDistance ?? 10;
    const focusDistanceFeet = metersToFeet(focusDistanceM);

    // Handlers to dispatch granular updates to context
    const handleApertureChange = (event: Event, newValue: number | number[]) => {
        const newAperture = newValue as number;
        dispatch({ 
            type: 'UPDATE_HARDWARE_FIELD', 
            payload: { field: 'fStop', value: newAperture }
        });
    };

    const handleFocusDistanceChange = (event: Event, newValue: number | number[]) => {
        const newFocusFeet = newValue as number;
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

    // Disable controls if no camera/lens selected in context
    const controlsDisabled = !hardware?.cameraDetails || !hardware?.lensDetails;

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.secondary' }}>
                Depth of Field Controls
            </Typography>
            {controlsDisabled ? (
                <Typography variant="caption" color="text.secondary">
                    Select a camera and lens to enable controls.
                </Typography>
            ) : (
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {/* Aperture Slider */}
                    <Box>
                        <Typography variant="caption" gutterBottom id="aperture-slider-label">
                            Aperture (f/)
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Slider
                                aria-labelledby="aperture-slider-label"
                                value={aperture}
                                onChange={handleApertureChange}
                                min={minFStop}
                                max={maxFStop}
                                step={fStopStep}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `f/${value.toFixed(1)}`}
                                sx={{ flexGrow: 1 }}
                            />
                            <Typography variant="body2" sx={{ minWidth: '50px', textAlign: 'right' }}>
                                f/{aperture.toFixed(1)}
                            </Typography>
                        </Stack>
                    </Box>

                    {/* Focus Distance Slider */}
                    <Box>
                        <Typography variant="caption" gutterBottom id="focus-distance-slider-label">
                            Focus Distance (ft)
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Slider
                                aria-labelledby="focus-distance-slider-label"
                                value={focusDistanceFeet}
                                onChange={handleFocusDistanceChange}
                                min={minFocusFeet}
                                max={maxFocusFeet}
                                step={focusStep}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${value} ft`}
                                sx={{ flexGrow: 1 }}
                            />
                            <Typography variant="body2" sx={{ minWidth: '50px', textAlign: 'right' }}>
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