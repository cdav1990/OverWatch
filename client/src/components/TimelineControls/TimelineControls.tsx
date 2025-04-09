import React, { useMemo, useEffect, useState } from 'react';
import { Box, IconButton, Slider, Stack, Typography, Paper } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import { useMission } from '../../context/MissionContext';

// Define segment indices interface for type safety
interface SegmentIndices {
    [segmentId: string]: { 
        start: number; 
        end: number;
    };
}

const TimelineControls: React.FC = () => {
    const { state, dispatch } = useMission();
    const { 
        isSimulating, 
        simulationSpeed, 
        simulationProgress, 
        currentMission 
    } = state;

    // Add state to track if user is scrubbing the timeline
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubValue, setScrubValue] = useState(0);

    const handlePlayPause = () => {
        if (isSimulating) {
            dispatch({ type: 'STOP_SIMULATION' });
        } else {
            dispatch({ type: 'START_SIMULATION' });
        }
    };

    const handleReset = () => {
        dispatch({ type: 'STOP_SIMULATION' }); 
        // Reset simulation progress to beginning
        if (currentMission && currentMission.pathSegments.length > 0) {
            const firstSegment = currentMission.pathSegments[0];
            dispatch({ 
                type: 'SET_SIMULATION_PROGRESS', 
                payload: { 
                    segmentId: firstSegment.id, 
                    waypointIndex: 0, 
                    totalWaypoints: getTotalWaypoints() 
                } 
            });
        }
    };

    const handleSpeedChange = (event: Event, newValue: number | number[]) => {
        dispatch({ type: 'SET_SIMULATION_SPEED', payload: newValue as number });
    };

    // Get total waypoints across all segments
    const getTotalWaypoints = () => {
        if (!currentMission) return 0;
        return currentMission.pathSegments.reduce((sum, seg) => sum + seg.waypoints.length, 0);
    };

    // Calculate total waypoints only when mission changes
    const totalWaypoints = useMemo(() => getTotalWaypoints(), [currentMission]);

    // Calculate the absolute waypoint index and related values
    const { sliderValue, sliderMax, segmentIndices } = useMemo(() => {
        if (!currentMission || !currentMission.pathSegments.length) {
            return { sliderValue: 0, sliderMax: 100, segmentIndices: {} as SegmentIndices };
        }

        // Create a mapping of accumulated waypoint indices by segment
        const indices: SegmentIndices = {};
        let waypointCounter = 0;
        
        currentMission.pathSegments.forEach(segment => {
            const startIndex = waypointCounter;
            waypointCounter += segment.waypoints.length;
            indices[segment.id] = { 
                start: startIndex, 
                end: waypointCounter - 1 
            };
        });

        // Maximum is the total number of waypoints (for a zero-indexed slider)
        const max = Math.max(totalWaypoints - 1, 0);
        
        // Calculate the current position in the timeline
        let value = 0;
        const { currentSegmentId, currentWaypointIndex } = simulationProgress;
        
        if (isSimulating && currentSegmentId && indices[currentSegmentId]) {
            const segmentInfo = indices[currentSegmentId];
            // Add offset of all waypoints before this segment, plus position in current segment
            value = segmentInfo.start + Math.min(currentWaypointIndex, segmentInfo.end - segmentInfo.start);
        }
        
        return { 
            sliderValue: isScrubbing ? scrubValue : value,
            sliderMax: max,
            segmentIndices: indices
        };
    }, [currentMission, simulationProgress, isSimulating, isScrubbing, scrubValue, totalWaypoints]);

    // Handle timeline scrubbing
    const handleTimelineScrub = (_event: Event, newValue: number | number[]) => {
        setIsScrubbing(true);
        setScrubValue(newValue as number);
    };

    const handleScrubCommit = (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
        // Find which segment and waypoint the scrub position corresponds to
        if (!currentMission) return;
        
        const targetIndex = newValue as number;
        let targetSegmentId = '';
        let segmentWaypointIndex = 0;
        
        // Find the segment that contains this waypoint index
        for (const segmentId in segmentIndices) {
            const { start, end } = segmentIndices[segmentId];
            if (targetIndex >= start && targetIndex <= end) {
                targetSegmentId = segmentId;
                segmentWaypointIndex = targetIndex - start;
                break;
            }
        }
        
        if (targetSegmentId) {
            // Update the simulation progress
            dispatch({ 
                type: 'SET_SIMULATION_PROGRESS', 
                payload: { 
                    segmentId: targetSegmentId, 
                    waypointIndex: segmentWaypointIndex, 
                    totalWaypoints: totalWaypoints 
                } 
            });
            
            // If simulation is running, it will continue from this new position
            // If not running, this just positions the drone at the new location
            if (!isSimulating) {
                // Maybe trigger a one-time position update or similar action
                console.log(`Positioned at segment: ${targetSegmentId}, waypoint: ${segmentWaypointIndex}`);
            }
        }
        
        setIsScrubbing(false);
    };

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
                    disabled={!currentMission || totalWaypoints <= 1} 
                    sx={{ flexGrow: 1 }}
                    valueLabelDisplay="auto" 
                    valueLabelFormat={(value) => `${value + 1}/${totalWaypoints}`}
                    onChange={handleTimelineScrub}
                    onChangeCommitted={handleScrubCommit}
                />

                {/* Speed Control */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '150px' }}>
                    <FastRewindIcon fontSize="small" sx={{ color: 'text.secondary' }}/>
                    <Slider
                        aria-label="Simulation Speed"
                        value={simulationSpeed}
                        onChange={handleSpeedChange}
                        min={0.1}
                        max={10}
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