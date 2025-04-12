import React, { useState, useEffect } from 'react';
import { 
    TextField, 
    Stack, 
    Button, 
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Tooltip,
    Slider,
    Box,
    Divider,
    Paper,
    Grid,
    CircularProgress
} from '@mui/material';
import { useMission } from '../../../../context/MissionContext';
import { 
    generate2DPathFromFace, 
    Generate2DPathParams, 
    AglReferenceType,
    calculateMissionStatistics,
    MissionStatistics 
} from '../../../../utils/pathUtils';
import InfoIcon from '@mui/icons-material/Info';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import RouteIcon from '@mui/icons-material/Route';

interface Mission2DGeneratorProps {
    isEmbedded?: boolean;
}

const Mission2DGenerator: React.FC<Mission2DGeneratorProps> = ({ isEmbedded = false }) => {
    const { state, dispatch } = useMission();
    const { currentMission, selectedFace, hardware, sceneObjects } = state;
    const [altitude, setAltitude] = useState('20');
    const [overlap, setOverlap] = useState('70');
    const [aglReferenceType, setAglReferenceType] = useState<AglReferenceType>(AglReferenceType.FACE_LOWEST);
    const [enableTerrainFollow, setEnableTerrainFollow] = useState(false);
    const [useObstacleAvoidance, setUseObstacleAvoidance] = useState(false);
    const [showGroundPath, setShowGroundPath] = useState(true);
    const [customPathWidth, setCustomPathWidth] = useState<string>('');
    const [minSafeHeight, setMinSafeHeight] = useState('2');
    const [coverageMethod, setCoverageMethod] = useState<'image-centers' | 'raster-lines'>('image-centers');
    
    // Mission statistics state
    const [missionStats, setMissionStats] = useState<MissionStatistics | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    
    // Function to calculate mission statistics based on current parameters
    const calculateStats = async () => {
        if (!selectedFace || !currentMission || !hardware) {
            setMissionStats(null);
            return;
        }
        
        setIsCalculating(true);
        
        try {
            // Create params object with current settings
            const params: Generate2DPathParams = {
                altitudeAGL: parseFloat(altitude) || 20,
                overlap: parseFloat(overlap) || 70,
                aglReferenceType,
                enableTerrainFollow,
                useObstacleAvoidance,
                showGroundPath,
                coverageMethod,
                minSafeHeight: parseFloat(minSafeHeight) || 2
            };
            
            // Add custom path width if specified
            if (customPathWidth && !isNaN(parseFloat(customPathWidth)) && parseFloat(customPathWidth) > 0) {
                params.customPathWidth = parseFloat(customPathWidth);
            }
            
            // Generate the path segment (this is a potentially expensive operation)
            const segment = generate2DPathFromFace(
                selectedFace,
                currentMission,
                hardware,
                sceneObjects,
                params
            );
            
            if (segment) {
                // Calculate statistics from the generated segment
                const stats = calculateMissionStatistics(
                    segment.waypoints,
                    currentMission.defaultSpeed || 5,
                    hardware.drone || undefined
                );
                
                setMissionStats(stats);
            } else {
                setMissionStats(null);
            }
        } catch (error) {
            console.error("Error calculating mission statistics:", error);
            setMissionStats(null);
        } finally {
            setIsCalculating(false);
        }
    };
    
    // Recalculate stats when relevant parameters change
    useEffect(() => {
        // Use a debounce to avoid excessive calculations
        const timer = setTimeout(() => {
            calculateStats();
        }, 500);
        
        return () => clearTimeout(timer);
    }, [
        altitude, 
        overlap, 
        aglReferenceType, 
        coverageMethod, 
        customPathWidth,
        selectedFace,
        hardware
    ]);

    const handleGenerateMission = () => {
        if (!selectedFace) {
            alert('Please select a mission area face first using the "Select Area Face" tool.');
            return;
        }
        if (!currentMission || !hardware) {
             alert('Cannot generate path: Mission or Hardware context is missing.');
            return;
        }

        const altitudeNum = parseFloat(altitude);
        const overlapNum = parseFloat(overlap);
        if (isNaN(altitudeNum) || isNaN(overlapNum)) {
            alert('Invalid Altitude or Overlap value.');
            return;
        }
        
        console.log("Generating 2D mission using selected face:", selectedFace);
        
        const params: Generate2DPathParams = {
            altitudeAGL: altitudeNum,
            overlap: overlapNum,
            aglReferenceType,
            enableTerrainFollow,
            useObstacleAvoidance,
            showGroundPath,
            coverageMethod,
            minSafeHeight: parseFloat(minSafeHeight) || 2
        };
        
        // Only include custom path width if a valid value is entered
        if (customPathWidth && !isNaN(parseFloat(customPathWidth)) && parseFloat(customPathWidth) > 0) {
            params.customPathWidth = parseFloat(customPathWidth);
        }

        const newSegment = generate2DPathFromFace(
            selectedFace,
            currentMission,
            hardware,
            sceneObjects,
            params
        );

        if (newSegment) {
            console.log("Dispatching ADD_PATH_SEGMENT with:", newSegment);
            dispatch({ type: 'ADD_PATH_SEGMENT', payload: newSegment });
            dispatch({ type: 'SET_SELECTED_FACE', payload: null }); 
        } else {
            alert('Failed to generate path segment. Check console for errors.');
        }
    };
    
    // Format time nicely as MM:SS
    const formatTime = (minutes: number) => {
        const mins = Math.floor(minutes);
        const seconds = Math.round((minutes - mins) * 60);
        return `${mins}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                The 2D Mission generator creates paths based on a selected 2D area. Select an area and configure coverage parameters.
            </Typography>
            
            {/* Primary Settings */}
            <TextField 
                label="Altitude (AGL, m)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                value={altitude}
                onChange={(e) => setAltitude(e.target.value)}
                InputProps={{ inputProps: { min: 0, step: 1 } }}
            />
            <TextField 
                label="Coverage Overlap (%)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                value={overlap}
                onChange={(e) => setOverlap(e.target.value)}
                InputProps={{ inputProps: { min: 0, max: 95, step: 5 } }}
            />
            
            <FormControl fullWidth size="small">
                <InputLabel>AGL Reference</InputLabel>
                <Select
                    value={aglReferenceType}
                    label="AGL Reference"
                    onChange={(e) => setAglReferenceType(e.target.value as AglReferenceType)}
                >
                    <MenuItem value={AglReferenceType.GROUND_LEVEL}>
                        Ground Level (Z=0)
                    </MenuItem>
                    <MenuItem value={AglReferenceType.FACE_LOWEST}>
                        Lowest Point of Face
                    </MenuItem>
                    <MenuItem value={AglReferenceType.FACE_AVERAGE}>
                        Average Height of Face
                    </MenuItem>
                    <MenuItem value={AglReferenceType.TAKEOFF_POINT}>
                        Takeoff Point
                    </MenuItem>
                </Select>
            </FormControl>
            
            {/* Coverage Method Selector */}
            <FormControl fullWidth size="small">
                <InputLabel>Coverage Method</InputLabel>
                <Select
                    value={coverageMethod}
                    label="Coverage Method"
                    onChange={(e) => setCoverageMethod(e.target.value as 'image-centers' | 'raster-lines')}
                >
                    <MenuItem value="image-centers">
                        Image Centers (Optimized Photogrammetry)
                    </MenuItem>
                    <MenuItem value="raster-lines">
                        Raster Lines (Traditional)
                    </MenuItem>
                </Select>
            </FormControl>
            
            {/* Mission Statistics Info Card */}
            {selectedFace && (
                <Paper 
                    elevation={0} 
                    variant="outlined" 
                    sx={{ 
                        p: 1.5, 
                        mt: 2, 
                        mb: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.03)'
                    }}
                >
                    <Typography variant="subtitle2" gutterBottom>
                        Mission Statistics
                    </Typography>
                    
                    {isCalculating ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                            <CircularProgress size={24} thickness={5} />
                        </Box>
                    ) : missionStats ? (
                        <Grid container spacing={1}>
                            <Grid size={{ xs: 6 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <PhotoCameraIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">
                                        {missionStats.imageCount} photos
                                    </Typography>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <RouteIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">
                                        {missionStats.flightDistanceMeters.toFixed(0)}m distance
                                    </Typography>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <AccessTimeIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">
                                        {formatTime(missionStats.estimatedTimeMinutes)} min
                                    </Typography>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <BatteryFullIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">
                                        {missionStats.estimatedBatteryPercentage}% battery
                                    </Typography>
                                </Stack>
                            </Grid>
                        </Grid>
                    ) : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 1 }}>
                            Select a face to view statistics
                        </Typography>
                    )}
                </Paper>
            )}
            
            {/* Advanced Controls */}
            <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Advanced Path Settings
                </Typography>
                
                <TextField 
                    label="Custom Path Width (m)" 
                    variant="outlined" 
                    size="small" 
                    type="number"
                    fullWidth
                    value={customPathWidth}
                    onChange={(e) => setCustomPathWidth(e.target.value)}
                    placeholder="Auto (based on camera)"
                    helperText="Leave empty to calculate from altitude and camera"
                    sx={{ mb: 2 }}
                    InputProps={{ inputProps: { min: 0.1, step: 0.5 } }}
                />
                
                <TextField 
                    label="Minimum Safe Height (m)" 
                    variant="outlined" 
                    size="small" 
                    type="number"
                    fullWidth
                    value={minSafeHeight}
                    onChange={(e) => setMinSafeHeight(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{ inputProps: { min: 0.5, step: 0.5 } }}
                />
                
                <FormControlLabel
                    control={
                        <Switch 
                            checked={enableTerrainFollow}
                            onChange={(e) => setEnableTerrainFollow(e.target.checked)}
                        />
                    }
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography>Terrain Following</Typography>
                            <Tooltip title="Follow the contours of the selected face">
                                <InfoIcon fontSize="small" color="action" />
                            </Tooltip>
                        </Stack>
                    }
                />
                
                <FormControlLabel
                    control={
                        <Switch 
                            checked={useObstacleAvoidance}
                            onChange={(e) => setUseObstacleAvoidance(e.target.checked)}
                        />
                    }
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography>Obstacle Avoidance</Typography>
                            <Tooltip title="Generate paths that avoid scene objects marked as obstacles">
                                <InfoIcon fontSize="small" color="action" />
                            </Tooltip>
                        </Stack>
                    }
                />
                
                <FormControlLabel
                    control={
                        <Switch 
                            checked={showGroundPath}
                            onChange={(e) => setShowGroundPath(e.target.checked)}
                        />
                    }
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography>Show Ground Path</Typography>
                            <Tooltip title="Show a shadow of the flight path on the ground">
                                <InfoIcon fontSize="small" color="action" />
                            </Tooltip>
                        </Stack>
                    }
                />
            </Box>
            
            <Button 
                variant="contained" 
                disabled={!currentMission}
                onClick={handleGenerateMission}
            >
                Generate 2D Mission
            </Button>
        </Stack>
    );
};

export default Mission2DGenerator; 