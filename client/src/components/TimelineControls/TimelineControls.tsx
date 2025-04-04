import React, { useMemo } from 'react';
import { Box, IconButton, Slider, Stack, Typography, Paper } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import { useMission } from '../../context/MissionContext';

const TimelineControls: React.FC = () => {
    const { state, dispatch } = useMission();
    const { 
        isSimulating, 
        simulationSpeed, 
        simulationProgress, 
        currentMission 
    } = state;

    const handlePlayPause = () => {
        if (isSimulating) {
            dispatch({ type: 'STOP_SIMULATION' });
        } else {
            dispatch({ type: 'START_SIMULATION' });
        }
    };

    const handleReset = () => {
        // Stop simulation and potentially reset time/progress
        // For now, just stopping should reset based on current useEffect logic
        dispatch({ type: 'STOP_SIMULATION' }); 
        // TODO: Consider adding a dedicated RESET_SIMULATION action if needed
    };

    const handleSpeedChange = (event: Event, newValue: number | number[]) => {
        dispatch({ type: 'SET_SIMULATION_SPEED', payload: newValue as number });
    };

    // --- Calculate Slider Value (Placeholder Logic) ---
    // Destructure all needed values first
    const { currentWaypointIndex, totalWaypointsInSegment, currentSegmentId } = simulationProgress; 

    const totalWaypoints = useMemo(() => 
        currentMission?.pathSegments.reduce((sum, seg) => sum + seg.waypoints.length, 0) ?? 0
    , [currentMission]);

    // Basic example: just show progress within the current segment if simulating
    // A better approach would map segment index + waypoint index to a single global progress value
    const sliderMax = totalWaypoints > 1 ? totalWaypoints - 1 : 100; // Example max: total number of waypoints - 1
    
    // Example value: Represents the overall waypoint index (simplified)
    // This assumes segments are simulated sequentially. Needs improvement for segment selection.
    let absoluteWaypointIndex = 0;
    if (isSimulating && currentSegmentId && currentMission) {
        let waypointsBeforeCurrentSegment = 0;
        for (const segment of currentMission.pathSegments) {
            if (segment.id === currentSegmentId) break;
            waypointsBeforeCurrentSegment += segment.waypoints.length;
        }
        // currentWaypointIndex is the index the drone is HEADING TOWARDS
        // So, if heading towards index 1, we are at index 0 of the segment.
        // The slider should show the index *completed* or currently at.
        absoluteWaypointIndex = waypointsBeforeCurrentSegment + Math.max(0, currentWaypointIndex - 1); 
    }
    const sliderValue = absoluteWaypointIndex;
    
    // --- End Placeholder Logic ---

    return (
        <Paper elevation={3} sx={{ p: 2, width: '100%' }}>
            <Stack direction="row" spacing={2} alignItems="center">
                {/* Playback Controls */}
                <IconButton onClick={handleReset} disabled={!currentMission} title="Reset">
                    <RestartAltIcon />
                </IconButton>
                <IconButton onClick={handlePlayPause} disabled={!currentMission} title={isSimulating ? "Pause" : "Play"}>
                    {isSimulating ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>

                {/* Timeline Slider */}
                <Slider
                    aria-label="Simulation Progress"
                    value={sliderValue} 
                    min={0}
                    max={sliderMax} 
                    disabled={!currentMission || totalWaypoints <= 1} // Disable if no mission or <= 1 waypoint
                    sx={{ flexGrow: 1 }}
                    valueLabelDisplay="auto" 
                    // Display as current waypoint / total waypoints
                    valueLabelFormat={(value) => `${value + 1}/${totalWaypoints}`}
                />

                {/* Speed Control */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '150px' }}>
                    <FastRewindIcon fontSize="small" sx={{ color: 'text.secondary' }}/>
                    <Slider
                        aria-label="Simulation Speed"
                        value={simulationSpeed}
                        onChange={handleSpeedChange}
                        min={0.1}
                        max={10} // Example max speed
                        step={0.1}
                        size="small"
                    />
                    <FastForwardIcon fontSize="small" sx={{ color: 'text.secondary' }}/>
                    <Typography variant="caption">{simulationSpeed.toFixed(1)}x</Typography>
                </Stack>
            </Stack>
        </Paper>
    );
};

export default TimelineControls; 