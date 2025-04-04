import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, 
    Typography, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel, 
    TextField, 
    Button, 
    Stack, 
    Paper, 
    Slider, 
    SelectChangeEvent
} from '@mui/material';
import { useMission } from '../../context/MissionContext';
import { calculateFOV, getEffectiveFocalLength, CameraSpecs } from '../../utils/sensorCalculations'; // Need FOV calculation & CameraSpecs type
import { generateOverlapWaypoints } from '../../utils/pathGeneration'; // Import waypoint generation utility
import { localToLatLng, generateUUID } from '../../utils/coordinateUtils'; // Import coordinate conversion
import { PathSegment, PathType, Waypoint, LocalCoord, LatLng, AltitudeReference, CameraParams, MissionTargetFace, HardwareState, SceneObject } from '../../types/mission'; // Corrected import path
import { calculateFaceGeometryENU, transformFaceRelativeENU, FaceGeometryENU, vecAdd, vecScale, vecAddScaled, vecNormalize, vecSub } from '../../utils/geometryUtils'; // Import geometry utilities
import { calculateOverlapSpacing, feetToMeters, metersToFeet } from '../../utils/sensorCalculations'; // Import overlap spacing calculation
import * as THREE from 'three';

const FaceMissionPanel: React.FC = () => {
    const { state, dispatch } = useMission();
    const { 
        missionTargetFace, 
        currentMission, 
        hardware, 
        sceneObjects 
    } = state;

    // Local state for mission parameters
    const [overlap, setOverlap] = useState<number | string>(70); // Default 70%
    const [scanDirection, setScanDirection] = useState<'Horizontal' | 'Vertical'>('Horizontal');
    const [standoffDistanceFt, setStandoffDistanceFt] = useState<number | string>(20); // <-- New state for standoff distance

    // Derived state
    const selectedObject = useMemo(() => {
        if (!missionTargetFace) return null;
        return sceneObjects.find(obj => obj.id === missionTargetFace.objectId);
    }, [missionTargetFace, sceneObjects]);

    const cameraFOV = useMemo(() => {
        if (!hardware?.cameraDetails || !hardware?.lensDetails) {
            return { horizontal: null, vertical: null };
        }
        const focalLength = getEffectiveFocalLength(hardware.lensDetails);
        const hFOV = calculateFOV(focalLength, hardware.cameraDetails.sensorWidth);
        const vFOV = calculateFOV(focalLength, hardware.cameraDetails.sensorHeight);
        return { horizontal: hFOV.toFixed(1), vertical: vFOV.toFixed(1) };
    }, [hardware?.cameraDetails, hardware?.lensDetails]);

    useEffect(() => {
        // Reset panel state if the target face changes or is cleared
        if (!missionTargetFace) {
            setOverlap(70);
            setScanDirection('Horizontal');
            setStandoffDistanceFt(20);
        } 
        // You could potentially load settings from the last segment if missionTargetFace matches
    }, [missionTargetFace]);

    const handleCalculatePath = () => {
        if (!missionTargetFace || 
            !hardware || 
            !hardware.cameraDetails || 
            !hardware.lensDetails || 
            !currentMission || 
            !currentMission.localOrigin) { 
            console.error("FaceMissionPanel: Missing required data (face, hardware details, mission, or localOrigin).");
            // TODO: Add user feedback (e.g., snackbar message)
            return;
        }

        // Find the target object (check sceneObjects exists)
        const targetObject = sceneObjects?.find(obj => obj.id === missionTargetFace.objectId);
        if (!targetObject) {
            console.error("FaceMissionPanel: Target object not found in sceneObjects.");
            return;
        }

        // --- 1. Get Standoff Distance ---
        const standoffDistFtNum = typeof standoffDistanceFt === 'string' ? parseFloat(standoffDistanceFt) : standoffDistanceFt;
        if (isNaN(standoffDistFtNum) || standoffDistFtNum <= 0) {
            console.error("FaceMissionPanel: Invalid standoff distance entered.");
            return; 
        }
        const standoffDistanceMeters = feetToMeters(standoffDistFtNum);
        console.log(`FaceMissionPanel: Using standoff distance: ${standoffDistFtNum} ft (${standoffDistanceMeters.toFixed(2)} m)`);

        // --- 2. Calculate Face Geometry ---
        const geometry = calculateFaceGeometryENU(targetObject, missionTargetFace.normal);
        if (!geometry) {
            console.error("FaceMissionPanel: Failed to calculate face geometry.");
            return;
        }
        const normalizedNormal = vecNormalize(geometry.normal); 

        // --- 3. Calculate Spacing based on Standoff Distance ---
        // Hardware checks passed, so cameraDetails and lensDetails are non-null here
        const cameraSpecsForSpacing: CameraSpecs = {
            sensorWidth: hardware.cameraDetails.sensorWidth,
            sensorHeight: hardware.cameraDetails.sensorHeight,
            focalLength: getEffectiveFocalLength(hardware.lensDetails), // lensDetails is confirmed non-null
        };

        // --- Convert and Validate Single Overlap Value ---
        const overlapValue = typeof overlap === 'string' ? parseFloat(overlap) : overlap;
        // Validate: Must be between 0 (inclusive) and 100 (exclusive)
        if (isNaN(overlapValue) || overlapValue < 0 || overlapValue >= 100) { 
            console.error(`FaceMissionPanel: Invalid overlap percentage: ${overlapValue}. Must be >= 0 and < 100.`);
            // TODO: Add user feedback (snackbar)
            return;
        }
        const overlapDecimal = overlapValue / 100;
        console.log(`FaceMissionPanel: Using Overlap: ${overlapValue}% (${overlapDecimal})`);

        // --- Calculate Spacing ---
        const spacingResult = calculateOverlapSpacing(
            cameraSpecsForSpacing,
            overlapDecimal,          // Correct position for overlapH
            overlapDecimal,          // Correct position for overlapV
            standoffDistanceMeters   // Correct position for flightAltitude (using standoff distance)
        );

        if (!spacingResult) {
            console.error("FaceMissionPanel: Failed to calculate overlap spacing.");
            // TODO: User feedback
            return;
        }
        const { horizontalSpacing, verticalSpacing } = spacingResult;
        console.log(`FaceMissionPanel: Calculated Spacing - H: ${horizontalSpacing.toFixed(2)}m, V: ${verticalSpacing.toFixed(2)}m`);

        // --- 4. Generate Grid Waypoints (Offset from Face) ---
        const localWaypoints: LocalCoord[] = [];
        const halfWidth = geometry.width / 2;
        const halfHeight = geometry.height / 2;
        
        const uDim = geometry.width;
        const vDim = geometry.height;
        const uSpacing = horizontalSpacing;
        const vSpacing = verticalSpacing;

        const numU = Math.max(1, Math.ceil(uDim / uSpacing));
        const numV = Math.max(1, Math.ceil(vDim / vSpacing));
        
        console.log(`FaceMissionPanel: Grid Dimensions - uLines: ${numU}, vLines: ${numV}`);

        const calculatePointOnFace = (u: number, v: number): LocalCoord => {
            const uOffset = vecScale(geometry.xAxis, u);
            const vOffset = vecScale(geometry.yAxis, v);
            return vecAdd(geometry.center, vecAdd(uOffset, vOffset));
        };
        
        if (scanDirection === 'Horizontal') {
            for (let j = 0; j < numV; j++) {
                const v = -halfHeight + j * vSpacing + vSpacing / 2;
                if (j % 2 === 0) { // Even rows: sweep positive U direction
                    for (let i = 0; i < numU; i++) {
                        const u = -halfWidth + i * uSpacing + uSpacing/2;
                        const pointOnFace = calculatePointOnFace(u, v); // Use helper
                        const finalWaypointPos = vecAddScaled(pointOnFace, normalizedNormal, standoffDistanceMeters);
                        localWaypoints.push(finalWaypointPos);
                    }
                } else { // Odd rows: sweep negative U direction (serpentine)
                    for (let i = numU - 1; i >= 0; i--) {
                        const u = -halfWidth + i * uSpacing + uSpacing/2;
                        const pointOnFace = calculatePointOnFace(u, v); // Use helper
                        const finalWaypointPos = vecAddScaled(pointOnFace, normalizedNormal, standoffDistanceMeters);
                        localWaypoints.push(finalWaypointPos);
                    }
                }
            }
        } else { // Vertical scan direction
            for (let i = 0; i < numU; i++) {
                const u = -halfWidth + i * uSpacing + uSpacing / 2;
                if (i % 2 === 0) { // Even columns: sweep positive V direction
                    for (let j = 0; j < numV; j++) {
                        const v = -halfHeight + j * vSpacing + vSpacing/2;
                        const pointOnFace = calculatePointOnFace(u, v); // Use helper
                        const finalWaypointPos = vecAddScaled(pointOnFace, normalizedNormal, standoffDistanceMeters);
                        localWaypoints.push(finalWaypointPos);
                    }
                } else { // Odd columns: sweep negative V direction
                    for (let j = numV - 1; j >= 0; j--) {
                        const v = -halfHeight + j * vSpacing + vSpacing/2;
                        const pointOnFace = calculatePointOnFace(u, v); // Use helper
                        const finalWaypointPos = vecAddScaled(pointOnFace, normalizedNormal, standoffDistanceMeters);
                        localWaypoints.push(finalWaypointPos);
                    }
                }
            }
        }

        if (localWaypoints.length === 0) {
            console.error("FaceMissionPanel: No waypoints generated.");
            return;
        }

        console.log(`FaceMissionPanel: Generated ${localWaypoints.length} local waypoints.`);

        // --- 5. Convert Local Coords to Full Waypoints ---
        const defaultCameraParams: CameraParams = { 
            heading: 0, // Base heading (will be overwritten)
            pitch: -90, // Default pitch towards face
            roll: 0,
            fov: hardware.cameraDetails?.fov || 60, 
            aspectRatio: (hardware.cameraDetails.sensorWidth && hardware.cameraDetails.sensorHeight) 
                           ? hardware.cameraDetails.sensorWidth / hardware.cameraDetails.sensorHeight 
                           : 16/9, 
            near: 0.1, 
            far: 1000, 
        };

        const waypoints: Waypoint[] = localWaypoints.map((local, index) => {
            const latLngResult = localToLatLng(local, currentMission.localOrigin!); 
            
            const targetVector = vecNormalize(vecSub(geometry.center, local)); 
            const heading = (Math.atan2(targetVector.x, targetVector.y) * (180 / Math.PI) + 360) % 360;
            
            return {
                id: generateUUID(),
                lat: latLngResult.latitude, 
                lng: latLngResult.longitude,
                altitude: local.z, // Use calculated Z from offset position
                altReference: AltitudeReference.RELATIVE, // Use correct enum member
                local: local, // Include optional local coordinates
                camera: { 
                    ...defaultCameraParams, // Spread defaults
                    heading: heading,       // Set calculated heading
                    pitch: defaultCameraParams.pitch // Keep default pitch (e.g., -90)
                },
                speed: currentMission.defaultSpeed ?? 5, // Optional speed per waypoint (use mission default)
                actions: [], // Default empty actions
            };
        });

        // --- 6. Create Path Segment ---
        const newSegment: PathSegment = {
            id: generateUUID(),
            type: PathType.GRID, 
            waypoints: waypoints,
            speed: currentMission.defaultSpeed ?? 5, // Optional speed for the segment
        };

        // --- 7. Dispatch Action to Add Segment ---
        dispatch({ type: 'ADD_PATH_SEGMENT', payload: newSegment });
        console.log("FaceMissionPanel: New path segment added:", newSegment);
    };

    // Render only if a face is selected
    if (!missionTargetFace || !selectedObject) {
        return null; 
    }

    return (
        <Paper elevation={3} sx={{ p: 2, mt: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>
                Face Scan Mission
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
                Object: {selectedObject.type} ({selectedObject.id.substring(0, 8)}...)
            </Typography>
            {cameraFOV.horizontal && (
                <Typography variant="caption" display="block" sx={{ mb: 2, color: 'text.secondary' }}>
                    Cam FOV: {cameraFOV.horizontal}° H / {cameraFOV.vertical}° V
                </Typography>
            )}

            <Stack spacing={2.5}> 
                <FormControl fullWidth size="small">
                    <InputLabel id="mission-type-label">Scan Direction</InputLabel>
                    <Select
                        labelId="mission-type-label"
                        value={scanDirection}
                        label="Scan Direction"
                        onChange={(e: SelectChangeEvent<'Horizontal' | 'Vertical'>) => setScanDirection(e.target.value as 'Horizontal' | 'Vertical')}
                    >
                        <MenuItem value="Horizontal">Horizontal</MenuItem>
                        <MenuItem value="Vertical">Vertical</MenuItem>
                    </Select>
                </FormControl>

                <Box>
                    <Typography gutterBottom variant="body2">
                        Overlap ({typeof overlap === 'number' ? overlap : parseFloat(overlap || '0')}%)
                    </Typography>
                    <Slider
                        value={typeof overlap === 'number' ? overlap : parseFloat(overlap || '0')}
                        onChange={(e, newValue) => setOverlap(newValue as number)}
                        aria-labelledby="overlap-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={0}
                        max={99} // Max 99% to ensure value < 100
                        size="small"
                    />
                </Box>

                <TextField
                    label="Standoff Distance (ft)"
                    type="number"
                    value={standoffDistanceFt}
                    onChange={(e) => setStandoffDistanceFt(e.target.value)}
                    InputProps={{ 
                        inputProps: { min: 1 }, // Min distance 1ft
                        endAdornment: <Typography variant="caption" sx={{ pl: 0.5 }}>ft</Typography> 
                    }}
                    fullWidth
                    margin="normal"
                    size="small"
                    variant="outlined"
                    sx={{ mb: 2 }}
                />

                <Button 
                    variant="contained" 
                    onClick={handleCalculatePath}
                    disabled={!hardware?.cameraDetails || !hardware?.lensDetails} // Disable if no camera info
                >
                    Generate Face Scan Path
                </Button>
                {(!hardware?.cameraDetails || !hardware?.lensDetails) && (
                    <Typography variant="caption" color="error" sx={{ textAlign: 'center' }}>
                        Select Camera & Lens in Hardware settings.
                    </Typography>
                )}
            </Stack>
        </Paper>
    );
};

export default FaceMissionPanel; 