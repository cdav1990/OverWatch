import React, { useState } from 'react';
import { 
    TextField, 
    Stack, 
    Button, 
    ToggleButtonGroup, 
    ToggleButton, 
    Switch, 
    FormControlLabel,
    Box,
    Typography,
    Slider,
    Grid,
    Divider,
    Paper,
    Tooltip,
    InputAdornment
} from '@mui/material';
import { 
    Straighten as StraightenIcon,
    GridOn as GridOnIcon, 
    Layers as LayersIcon,
    Terrain as TerrainIcon,
    CameraAlt as CameraAltIcon,
    SettingsEthernet as SettingsEthernetIcon,
    LensBlur as LensBlurIcon,
    ZoomOutMap as ZoomOutMapIcon,
    SwapHoriz as SwapHorizIcon,
    ArrowRightAlt as ArrowRightAltIcon
} from '@mui/icons-material';
import { useMission } from '../../../../context/MissionContext';
import { AltitudeReference, LocalCoord, CameraParams, PathSegment, PathType, Waypoint, LatLng } from '../../../../types/mission';
import { generateRasterPattern } from '../../../../utils/pathGeneration';
import { v4 as uuidv4 } from 'uuid';
import { localToLatLng } from '../../../../utils/coordinateUtils';

// Default camera parameters
const defaultCameraParams: CameraParams = {
    fov: 60,
    aspectRatio: 16 / 9,
    near: 0.1,
    far: 1000,
    heading: 0,
    pitch: -90, // Default to looking straight down
};

interface ManualGridGeneratorProps {
    isEmbedded?: boolean;
}

const ManualGridGenerator: React.FC<ManualGridGeneratorProps> = ({ isEmbedded = false }) => {
    const { state, dispatch } = useMission();
    const { currentMission } = state;

    // State for Raster Pattern Inputs
    const [patternLength, setPatternLength] = useState<string>('50');
    const [patternSpacing, setPatternSpacing] = useState<string>('10');
    const [numPasses, setNumPasses] = useState<string>('5');
    const [startAltitudeAGL, setStartAltitudeAGL] = useState<string>('20');
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const [snakePattern, setSnakePattern] = useState<boolean>(true);
    const [rasterStartOffset, setRasterStartOffset] = useState<LocalCoord>({ x: 0, y: 0, z: 0 });
    
    // Camera orientation state
    const [cameraPitch, setCameraPitch] = useState<number>(-90); // -90 is straight down (nadir)
    const [cameraYawOffset, setCameraYawOffset] = useState<number>(0); // 0 is along path direction
    const [cameraPitchType, setCameraPitchType] = useState<'nadir' | 'custom'>('nadir');
    // Add state for mission type toggle
    const [missionType, setMissionType] = useState<'photogrammetry' | 'lidar'>('photogrammetry');

    // Helper to create a full Waypoint object from LocalCoord
    const createWaypointFromLocal = (local: LocalCoord, origin: LatLng, altRef: AltitudeReference, camera: CameraParams): Waypoint => {
        if (!origin) throw new Error("Local Origin is required to create waypoint");
        const { latitude, longitude } = localToLatLng(local, origin);
        return {
            id: uuidv4(),
            lat: latitude,
            lng: longitude,
            altitude: local.z, // Use the Z from LocalCoord as the primary altitude
            altReference: altRef,
            local: { ...local }, // Store the local coords too
            camera: { ...camera }, // Use default camera params
            actions: [] // Placeholder for future actions
        };
    };

    const handleGeneratePath = () => {
        if (!currentMission) {
            console.error("Cannot generate path: No current mission selected.");
            return;
        }
        const { localOrigin, takeoffPoint, safetyParams, defaultSpeed } = currentMission;
        if (!localOrigin) {
            console.error("Cannot generate path: Mission local origin is not set.");
            return;
        }
        if (!takeoffPoint) {
            console.error("Cannot generate path: Mission takeoff point is not set.");
            return;
        }
        const missionEndAction = safetyParams?.missionEndAction ?? 'RTL';

        const lengthNum = parseFloat(patternLength);
        const spacingNum = parseFloat(patternSpacing);
        const passesNum = parseInt(numPasses, 10);
        const altitudeNum = parseFloat(startAltitudeAGL);

        if (isNaN(lengthNum) || 
            isNaN(spacingNum) || 
            isNaN(passesNum) || passesNum <= 0 ||
            isNaN(altitudeNum)) {
            console.error("Invalid raster parameters. Please enter valid numbers. Number of passes must be positive.");
            return;
        }

        const absoluteStartCoord: LocalCoord = {
            x: takeoffPoint.x + rasterStartOffset.x,
            y: takeoffPoint.y + rasterStartOffset.y,
            z: takeoffPoint.z + rasterStartOffset.z 
        };
        
        const altRef = AltitudeReference.RELATIVE;
        
        // Create camera parameters with orientation settings
        const cameraParamsWithOrientation: CameraParams = {
            ...defaultCameraParams,
            pitch: cameraPitch,
        };
        
        const params = {
            startCoord: absoluteStartCoord, 
            localOrigin: localOrigin, 
            length: lengthNum,
            spacing: spacingNum,
            passes: passesNum,
            altitude: altitudeNum,
            orientation: orientation, 
            snake: snakePattern, 
            defaultCamera: cameraParamsWithOrientation,
            altReference: altRef,
            cameraYawOffset: cameraYawOffset, // Add yaw offset to params
        };

        try {
            let patternWaypoints: Waypoint[] = [];
            patternWaypoints = generateRasterPattern(params);
            
            if (patternWaypoints.length === 0) {
                console.error("Path generation resulted in zero waypoints.");
                return;
            }

            const fullPathWaypoints: Waypoint[] = [];
            try {
                const takeoffGroundCoord: LocalCoord = { ...takeoffPoint, z: 0 };
                const takeoffGroundWaypoint = createWaypointFromLocal(takeoffGroundCoord, localOrigin, altRef, defaultCameraParams);
                fullPathWaypoints.push(takeoffGroundWaypoint);

                fullPathWaypoints.push(...patternWaypoints);

                if (missionEndAction === 'RTL' || missionEndAction === 'LAND') {
                    const landingGroundCoord: LocalCoord = { ...takeoffPoint, z: 0 };
                    const landingGroundWaypoint = createWaypointFromLocal(landingGroundCoord, localOrigin, altRef, defaultCameraParams);
                    const lastPatternWp = patternWaypoints[patternWaypoints.length - 1];
                    if (lastPatternWp.local?.x !== landingGroundCoord.x || 
                        lastPatternWp.local?.y !== landingGroundCoord.y || 
                        lastPatternWp.local?.z !== landingGroundCoord.z) {
                        fullPathWaypoints.push(landingGroundWaypoint);
                    }
                }

            } catch (error) {
                console.error("Error creating takeoff/landing waypoints:", error);
                return;
            }

            const newPathSegment: PathSegment = {
                id: uuidv4(),
                type: PathType.GRID,
                waypoints: fullPathWaypoints,
                speed: defaultSpeed ?? 5,
                metadata: {
                    isLidarMission: missionType === 'lidar',
                    isPhotogrammetry: missionType === 'photogrammetry'
                }
            };
    
            console.log(`Dispatching ADD_PATH_SEGMENT with ${fullPathWaypoints.length} waypoints:`, newPathSegment);
            dispatch({ type: 'ADD_PATH_SEGMENT', payload: newPathSegment });

        } catch (error) {
            console.error("Error during path generation:", error);
        }
    };

    const handleOrientationChange = (
        _event: React.MouseEvent<HTMLElement>,
        newOrientation: 'horizontal' | 'vertical' | null,
    ) => {
        if (newOrientation !== null) {
            setOrientation(newOrientation);
        }
    };
    
    const handleCameraPitchTypeChange = (
        _event: React.MouseEvent<HTMLElement>,
        newType: 'nadir' | 'custom' | null,
    ) => {
        if (newType !== null) {
            setCameraPitchType(newType);
            // If nadir is selected, set pitch to -90 degrees
            if (newType === 'nadir') {
                setCameraPitch(-90);
            }
        }
    };

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                p: 2, 
                borderRadius: 2, 
                backgroundColor: 'rgba(32, 41, 56, 0.05)'
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', color: '#0B5394', display: 'flex', alignItems: 'center' }}>
                        <GridOnIcon sx={{ mr: 1 }} /> Grid Pattern Configuration
                    </Typography>
                </Box>
                
                {/* Pattern Dimensions Group */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <StraightenIcon fontSize="small" sx={{ mr: 1 }} /> Pattern Dimensions
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid xs={6}>
                            <Tooltip title="Length of each pass in the pattern (can be negative)" arrow>
            <TextField 
                                    label="Pattern Length" 
                variant="outlined" 
                size="small" 
                fullWidth
                type="number"
                value={patternLength}
                onChange={(e) => setPatternLength(e.target.value)}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                        inputProps: { step: 5 }
                                    }}
                                />
                            </Tooltip>
                        </Grid>
                        <Grid xs={6}>
                            <Tooltip title="Distance between parallel passes (can be negative)" arrow>
            <TextField 
                                    label="Spacing" 
                variant="outlined" 
                size="small" 
                fullWidth
                type="number"
                value={patternSpacing}
                onChange={(e) => setPatternSpacing(e.target.value)}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                        inputProps: { step: 1 }
                                    }}
                                />
                            </Tooltip>
                        </Grid>
                    </Grid>
                </Box>
                
                {/* Pattern Details Group */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <LayersIcon fontSize="small" sx={{ mr: 1 }} /> Pattern Details
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid xs={6}>
                            <Tooltip title="Number of parallel passes to make" arrow>
            <TextField 
                                    label="Passes" 
                variant="outlined" 
                size="small" 
                fullWidth
                type="number"
                value={numPasses}
                onChange={(e) => setNumPasses(e.target.value)}
                                    InputProps={{
                                        inputProps: { min: 1, step: 1 }
                                    }}
            />
                            </Tooltip>
                        </Grid>
                        <Grid xs={6}>
                            <Tooltip title="Flight altitude above ground level (can be negative)" arrow>
            <TextField 
                                    label="Altitude (AGL)" 
                variant="outlined" 
                size="small" 
                                    fullWidth
                type="number"
                value={startAltitudeAGL}
                onChange={(e) => setStartAltitudeAGL(e.target.value)}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                        inputProps: { step: 5 }
                                    }}
                                />
                            </Tooltip>
                        </Grid>
                    </Grid>
                </Box>
                
                {/* Flight Pattern Orientation */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <SettingsEthernetIcon fontSize="small" sx={{ mr: 1 }} /> Pattern Orientation
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid xs={12}>
                <ToggleButtonGroup
                    value={orientation}
                    exclusive
                    onChange={handleOrientationChange}
                    aria-label="pattern orientation"
                    size="small"
                    fullWidth
                >
                    <ToggleButton value="horizontal" aria-label="horizontal pattern">
                                    <ArrowRightAltIcon sx={{ mr: 1 }} /> Horizontal (E/W)
                    </ToggleButton>
                    <ToggleButton value="vertical" aria-label="vertical pattern">
                                    <ArrowRightAltIcon sx={{ mr: 1, transform: 'rotate(90deg)' }} /> Vertical (N/S)
                    </ToggleButton>
                </ToggleButtonGroup>
                        </Grid>
                        <Grid xs={12}>
            <FormControlLabel
                control={
                    <Switch
                        checked={snakePattern}
                        onChange={(e) => setSnakePattern(e.target.checked)}
                        name="snakePattern"
                                        color="primary"
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <SwapHorizIcon fontSize="small" sx={{ mr: 0.5 }} />
                                        <Typography variant="body2">Snake Pattern (Zigzag)</Typography>
                                    </Box>
                                }
                                labelPlacement="end"
                                sx={{ m: 0 }}
                            />
                        </Grid>
                    </Grid>
                </Box>
                
                {/* Mission Type Selection */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <CameraAltIcon fontSize="small" sx={{ mr: 1 }} /> Mission Type
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid xs={12}>
                            <ToggleButtonGroup
                                value={missionType}
                                exclusive
                                onChange={(e, newType) => {
                                    if (newType !== null) {
                                        setMissionType(newType);
                                        // When switching to LiDAR, set camera to nadir (straight down)
                                        if (newType === 'lidar') {
                                            setCameraPitchType('nadir');
                                            setCameraPitch(-90);
                                        }
                                    }
                                }}
                                aria-label="mission type"
                                size="small"
                                fullWidth
                            >
                                <ToggleButton value="photogrammetry" aria-label="photogrammetry mission">
                                    <CameraAltIcon sx={{ mr: 1 }} /> Photogrammetry (Full Path)
                                </ToggleButton>
                                <ToggleButton value="lidar" aria-label="lidar mission">
                                    <TerrainIcon sx={{ mr: 1 }} /> LiDAR (Corners Only)
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                        {missionType === 'lidar' && (
                            <Grid xs={12}>
                                <Box sx={{ 
                                    p: 1, 
                                    mt: 1, 
                                    backgroundColor: 'rgba(22, 160, 133, 0.1)', 
                                    borderRadius: 1,
                                    border: '1px dashed rgba(22, 160, 133, 0.3)'
                                }}>
                                    <Typography variant="caption" color="secondary">
                                        <b>LiDAR Mode:</b> Creates a simplified path with only corner waypoints. This is ideal for LiDAR missions where continuous photo capture is not needed.
                                    </Typography>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </Box>
                
                {/* Camera Orientation Section */}
                <Box sx={{ 
                    mb: 2, 
                    p: 2, 
                    backgroundColor: 'rgba(18, 89, 146, 0.05)', 
                    borderRadius: 1,
                    border: '1px solid rgba(18, 89, 146, 0.1)',
                    opacity: missionType === 'lidar' ? 0.7 : 1
                }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: '#0B5394' }}>
                        <CameraAltIcon fontSize="small" sx={{ mr: 1 }} /> Camera Orientation
                    </Typography>
                    
                    <Grid container spacing={2}>
                        {/* Camera Pitch Type */}
                        <Grid xs={12}>
                            <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                                <LensBlurIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.9rem', verticalAlign: 'text-bottom' }} /> Viewing Angle
                            </Typography>
                            <ToggleButtonGroup
                                value={cameraPitchType}
                                exclusive
                                onChange={handleCameraPitchTypeChange}
                                aria-label="camera pitch type"
                                size="small"
                                fullWidth
                            >
                                <ToggleButton value="nadir" aria-label="nadir view">
                                    Nadir (Down)
                                </ToggleButton>
                                <ToggleButton value="custom" aria-label="custom angle">
                                    Custom Angle
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                        
                        {/* Camera Pitch Slider */}
                        {cameraPitchType === 'custom' && (
                            <Grid xs={12}>
                                <Box sx={{ px: 1 }}>
                                    <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Camera Pitch:</span>
                                        <span>{cameraPitch}°</span>
                                    </Typography>
                                    <Slider
                                        value={cameraPitch}
                                        onChange={(_, value) => setCameraPitch(value as number)}
                                        min={-90}
                                        max={0}
                                        step={5}
                                        marks={[
                                            { value: -90, label: '-90°' },
                                            { value: -45, label: '-45°' },
                                            { value: 0, label: '0°' }
                                        ]}
                                        valueLabelDisplay="auto"
                                        color="primary"
                                    />
                                </Box>
                            </Grid>
                        )}
                        
                        {/* Camera Yaw Offset Slider */}
                        <Grid xs={12}>
                            <Box sx={{ px: 1 }}>
                                <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Camera Direction:</span>
                                    <span>{cameraYawOffset}°</span>
                                </Typography>
                                <Slider
                                    value={cameraYawOffset}
                                    onChange={(_, value) => setCameraYawOffset(value as number)}
                                    min={-180}
                                    max={180}
                                    step={15}
                                    marks={[
                                        { value: -90, label: '-90°' },
                                        { value: 0, label: '0°' },
                                        { value: 90, label: '90°' }
                                    ]}
                                    valueLabelDisplay="auto"
                                    color="primary"
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    0° faces along path, ±90° faces perpendicular to path
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
                
                {/* Start Position Offset Group */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <ZoomOutMapIcon fontSize="small" sx={{ mr: 1 }} /> Start Position (Offset from Takeoff)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Use positive or negative values to position anywhere in the scene
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid xs={4}>
                            <TextField 
                                label="X" 
                                variant="outlined" 
                                size="small" 
                                fullWidth
                                type="number"
                                value={rasterStartOffset.x}
                                placeholder="+/- value"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Handle special case when user is typing "-" 
                                    if (val === "-") {
                                        setRasterStartOffset(p => ({ ...p, x: -0 }));
                                        return;
                                    }
                                    const parsed = parseFloat(val);
                                    setRasterStartOffset(p => ({ ...p, x: isNaN(parsed) ? 0 : parsed }));
                                }}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                    inputProps: { step: 10 }
                                }}
                            />
                            <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {[-100, -50, -10, 10, 50, 100].map((val) => (
                                    <Button 
                                        key={`x-${val}`}
                                        size="small" 
                                        variant="outlined" 
                                        sx={{ 
                                            minWidth: '36px', 
                                            height: '24px', 
                                            fontSize: '0.7rem',
                                            p: 0,
                                            borderColor: val < 0 ? 'error.main' : 'primary.main',
                                            color: val < 0 ? 'error.main' : 'primary.main',
                                        }}
                                        onClick={() => setRasterStartOffset(p => ({ ...p, x: val }))}
                                    >
                                        {val}
                                    </Button>
                                ))}
                            </Box>
                        </Grid>
                        <Grid xs={4}>
                            <TextField 
                                label="Y" 
                                variant="outlined" 
                                size="small" 
                                fullWidth
                                type="number"
                                value={rasterStartOffset.y}
                                placeholder="+/- value"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Handle special case when user is typing "-" 
                                    if (val === "-") {
                                        setRasterStartOffset(p => ({ ...p, y: -0 }));
                                        return;
                                    }
                                    const parsed = parseFloat(val);
                                    setRasterStartOffset(p => ({ ...p, y: isNaN(parsed) ? 0 : parsed }));
                                }}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                    inputProps: { step: 10 }
                                }}
                            />
                            <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {[-100, -50, -10, 10, 50, 100].map((val) => (
                                    <Button 
                                        key={`y-${val}`}
                                        size="small" 
                                        variant="outlined" 
                                        sx={{ 
                                            minWidth: '36px', 
                                            height: '24px', 
                                            fontSize: '0.7rem',
                                            p: 0,
                                            borderColor: val < 0 ? 'error.main' : 'primary.main',
                                            color: val < 0 ? 'error.main' : 'primary.main',
                                        }}
                                        onClick={() => setRasterStartOffset(p => ({ ...p, y: val }))}
                                    >
                                        {val}
                                    </Button>
                                ))}
                            </Box>
                        </Grid>
                        <Grid xs={4}>
                            <TextField 
                                label="Z" 
                                variant="outlined" 
                                size="small" 
                                fullWidth
                                type="number"
                                value={rasterStartOffset.z}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Handle special case when user is typing "-" 
                                    if (val === "-") {
                                        setRasterStartOffset(p => ({ ...p, z: -0 }));
                                        return;
                                    }
                                    const parsed = parseFloat(val);
                                    setRasterStartOffset(p => ({ ...p, z: isNaN(parsed) ? 0 : parsed }));
                                }}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                    inputProps: { step: 10 }
                                }}
                            />
                        </Grid>
                    </Grid>
                </Box>
                
                {/* Generate Button */}
            <Button 
                variant="contained" 
                onClick={handleGeneratePath}
                disabled={!currentMission || !currentMission.takeoffPoint || !currentMission.localOrigin}
                    color="primary"
                    size="large"
                    sx={{ 
                        mt: 1,
                        py: 1,
                        backgroundColor: '#0B5394',
                        fontWeight: 'bold',
                        '&:hover': {
                            backgroundColor: '#0a4983',
                        }
                    }}
                    fullWidth
                >
                    Generate & Add Path
            </Button>
        </Stack>
        </Paper>
    );
};

export default ManualGridGenerator; 