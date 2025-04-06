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
    Typography
} from '@mui/material';
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
    pitch: 0,
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

        if (isNaN(lengthNum) || lengthNum <= 0 ||
            isNaN(spacingNum) || spacingNum <= 0 ||
            isNaN(passesNum) || passesNum <= 0 ||
            isNaN(altitudeNum) || altitudeNum < 0) {
            console.error("Invalid raster parameters. Please enter valid numbers (Length/Spacing/Passes > 0, Altitude >= 0).");
            return;
        }

        const absoluteStartCoord: LocalCoord = {
            x: takeoffPoint.x + rasterStartOffset.x,
            y: takeoffPoint.y + rasterStartOffset.y,
            z: takeoffPoint.z + rasterStartOffset.z 
        };
        
        const altRef = AltitudeReference.RELATIVE;
        const params = {
            startCoord: absoluteStartCoord, 
            localOrigin: localOrigin, 
            length: lengthNum,
            spacing: spacingNum,
            passes: passesNum,
            altitude: altitudeNum,
            orientation: orientation, 
            snake: snakePattern, 
            defaultCamera: defaultCameraParams,
            altReference: altRef,
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
                speed: defaultSpeed ?? 5
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

    return (
        <Stack spacing={2}>
            <TextField 
                label="Pattern Length (m)" 
                variant="outlined" 
                size="small" 
                fullWidth
                type="number"
                value={patternLength}
                onChange={(e) => setPatternLength(e.target.value)}
                helperText={orientation === 'horizontal' ? "Length of each East/West row" : "Length of each North/South column"}
                InputProps={{ inputProps: { min: 1, step: 1 } }}
            />
            <TextField 
                label="Pattern Spacing (m)" 
                variant="outlined" 
                size="small" 
                fullWidth
                type="number"
                value={patternSpacing}
                onChange={(e) => setPatternSpacing(e.target.value)}
                helperText={orientation === 'horizontal' ? "Distance between North/South rows" : "Distance between East/West columns"}
                InputProps={{ inputProps: { min: 1, step: 1 } }}
            />
            <TextField 
                label="Number of Passes" 
                variant="outlined" 
                size="small" 
                fullWidth
                type="number"
                value={numPasses}
                onChange={(e) => setNumPasses(e.target.value)}
                helperText={orientation === 'horizontal' ? "Number of rows" : "Number of columns"}
                InputProps={{ inputProps: { min: 1, step: 1 } }}
            />
            <TextField 
                label="Flight Altitude (AGL, m)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                value={startAltitudeAGL}
                onChange={(e) => setStartAltitudeAGL(e.target.value)}
                InputProps={{ inputProps: { min: 0, step: 1 } }}
            />
            {/* Placeholder for selecting start position */}
            <TextField 
                label="Start Offset (from Takeoff) X (m)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                value={rasterStartOffset.x}
                onChange={(e) => setRasterStartOffset(p => ({ ...p, x: parseFloat(e.target.value) || 0 }))}
            />
            <TextField 
                label="Start Offset (from Takeoff) Y (m)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                value={rasterStartOffset.y}
                onChange={(e) => setRasterStartOffset(p => ({ ...p, y: parseFloat(e.target.value) || 0 }))}
            />
            <TextField 
                label="Start Offset (from Takeoff) Z (m)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                value={rasterStartOffset.z}
                onChange={(e) => setRasterStartOffset(p => ({ ...p, z: parseFloat(e.target.value) || 0 }))}
                helperText="Vertical offset from takeoff point for pattern start."
            />
            
            {/* Orientation Toggle */}
            <Box>
                <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>Pattern Orientation</Typography>
                <ToggleButtonGroup
                    value={orientation}
                    exclusive
                    onChange={handleOrientationChange}
                    aria-label="pattern orientation"
                    size="small"
                    fullWidth
                >
                    <ToggleButton value="horizontal" aria-label="horizontal pattern">
                    Horizontal (E/W)
                    </ToggleButton>
                    <ToggleButton value="vertical" aria-label="vertical pattern">
                    Vertical (N/S)
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Snake Pattern Toggle */}
            <FormControlLabel
                control={
                    <Switch
                        checked={snakePattern}
                        onChange={(e) => setSnakePattern(e.target.checked)}
                        name="snakePattern"
                        size="small"
                    />
                }
                label="Snake Pattern (Zigzag)"
                labelPlacement="start"
                sx={{ justifyContent: 'space-between', ml: 0, mr: 0.5 }}
            />
            
            <Button 
                variant="contained" 
                onClick={handleGeneratePath}
                disabled={!currentMission || !currentMission.takeoffPoint || !currentMission.localOrigin}
            >
                Generate & Add Path Segment
            </Button>
        </Stack>
    );
};

export default ManualGridGenerator; 