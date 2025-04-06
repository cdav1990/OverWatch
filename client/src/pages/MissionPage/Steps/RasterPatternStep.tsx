import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    TextField, 
    Stack, 
    Button, 
    ToggleButtonGroup, 
    ToggleButton, 
    Switch, 
    FormControlLabel,
    Paper,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Avatar,
    Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMission } from '../../../context/MissionContext';
import { AltitudeReference, LocalCoord, CameraParams, PathSegment, PathType, Waypoint, LatLng } from '../../../types/mission';
import { generateRasterPattern } from '../../../utils/pathGeneration';
import { v4 as uuidv4 } from 'uuid';
import { localToLatLng } from '../../../utils/coordinateUtils';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RouteIcon from '@mui/icons-material/Route';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewInArIcon from '@mui/icons-material/ViewInAr';

// Styled components to match BuildSceneStep styling
const SectionTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 500,
    fontSize: '0.95rem',
    letterSpacing: '0.5px',
    marginBottom: theme.spacing(2),
    color: '#4fc3f7',
    textTransform: 'uppercase',
}));

const SectionSubtitle = styled(Typography)(({ theme }) => ({
    fontWeight: 500,
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing(1),
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderRadius: '4px',
    marginBottom: theme.spacing(1),
    '&:hover': {
        backgroundColor: 'rgba(40, 40, 40, 0.8)',
    },
}));

// Props interface including the new optional prop
interface RasterPatternStepProps {
    isEmbedded?: boolean;
}

// Default camera parameters (replace with actual logic later)
const defaultCameraParams: CameraParams = {
    fov: 60, // Example FOV
    aspectRatio: 16 / 9, // Example aspect ratio
    // Add missing properties indicated by linter error
    near: 0.1, // Default near clipping plane
    far: 1000, // Default far clipping plane
    heading: 0, // Default heading (degrees or radians? Assuming degrees for now)
    pitch: 0, // Default pitch (degrees or radians? Assuming degrees for now)
    // sensorWidth: 23.5, // REMOVED - Not in type def
    // sensorHeight: 15.6, // REMOVED - Not in type def
    // focalLength: 35, // REMOVED - Not in type def
    // imageWidthPx: 6000, // REMOVED - Not in type def
    // imageHeightPx: 4000, // REMOVED - Not in type def
};

// Apply the props interface
const RasterPatternStep: React.FC<RasterPatternStepProps> = ({ isEmbedded = false }) => {
    const { state, dispatch } = useMission();
    const { currentMission } = state;
    const [expanded, setExpanded] = useState<string | false>(false);
    const [copiedMissionId, setCopiedMissionId] = useState<boolean>(false);

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

    const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    // Function to handle copying mission ID
    const handleCopyMissionId = () => {
        if (currentMission && currentMission.id) {
            navigator.clipboard.writeText(currentMission.id)
                .then(() => {
                    setCopiedMissionId(true);
                    setTimeout(() => setCopiedMissionId(false), 2000);
                })
                .catch(err => {
                    console.error('Failed to copy mission ID:', err);
                });
        }
    };

    // Format date helper function
    const formatDate = (date: Date | string | undefined) => {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    // MissionList component
    const MissionList = () => {
        if (!currentMission) return null;
        
        // Get path segments safely with fallback
        const pathSegments = currentMission.pathSegments || [];
        
        return (
            <Paper 
                variant="outlined" 
                sx={{ 
                    p: 2, 
                    mt: 3, 
                    mb: 3,
                    bgcolor: (theme) => theme.palette.mode === 'dark' 
                        ? 'rgba(30, 30, 30, 0.5)'
                        : 'rgba(245, 245, 245, 0.7)',
                    borderColor: (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.1)',
                    boxShadow: (theme) => theme.palette.mode === 'dark'
                        ? '0px 2px 6px rgba(0, 0, 0, 0.2)'
                        : '0px 2px 6px rgba(0, 0, 0, 0.05)'
                }}
            >
                <SectionSubtitle variant="subtitle1">Mission List</SectionSubtitle>
                <List sx={{ p: 0 }}>
                    <StyledListItem 
                        sx={{
                            backgroundColor: (theme) => theme.palette.mode === 'dark' 
                                ? 'rgba(30, 30, 30, 0.6)'
                                : 'rgba(240, 240, 240, 0.6)',
                            '&:hover': {
                                backgroundColor: (theme) => theme.palette.mode === 'dark'
                                    ? 'rgba(40, 40, 40, 0.8)'
                                    : 'rgba(230, 230, 230, 0.8)'
                            }
                        }}
                    >
                        <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#4fc3f7', width: 30, height: 30 }}>
                                <RouteIcon fontSize="small" />
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={
                                <Typography variant="body2" sx={{ 
                                    color: (theme) => theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.9)'
                                        : 'rgba(0, 0, 0, 0.9)'
                                }}>
                                    {currentMission.name || 'Unnamed Mission'}
                                </Typography>
                            }
                            secondary={
                                <Typography 
                                    variant="caption" 
                                    component="div"
                                    sx={{ 
                                        color: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.6)'
                                            : 'rgba(0, 0, 0, 0.6)', 
                                        fontFamily: '"Roboto Mono", monospace',
                                    }}
                                >
                                    <strong>UUID:</strong> {currentMission.id}
                                    <br />
                                    {currentMission.region && (
                                        <>
                                            <strong>Region:</strong> {currentMission.region.name}
                                            <br />
                                        </>
                                    )}
                                    <strong>Default Alt:</strong> {currentMission.defaultAltitude || 0}m | <strong>Speed:</strong> {currentMission.defaultSpeed || 0}m/s
                                    <br />
                                    <strong>Created:</strong> {formatDate(currentMission.createdAt)}
                                </Typography>
                            }
                        />
                        <ListItemSecondaryAction sx={{ position: 'relative' }}>
                            {copiedMissionId && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        right: '100%',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        marginRight: 1,
                                        backgroundColor: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(76, 175, 80, 0.9)'
                                            : 'rgba(76, 175, 80, 0.8)',
                                        color: '#fff',
                                        borderRadius: 0.5,
                                        fontSize: '0.7rem',
                                        padding: '2px 6px',
                                        whiteSpace: 'nowrap',
                                        animation: 'fadeIn 0.3s ease-in-out',
                                        '@keyframes fadeIn': {
                                            '0%': { opacity: 0, transform: 'translateY(-50%) translateX(5px)' },
                                            '100%': { opacity: 1, transform: 'translateY(-50%) translateX(0)' },
                                        }
                                    }}
                                >
                                    Copied!
                                </Box>
                            )}
                            <Tooltip title="Copy Mission UUID">
                                <IconButton
                                    edge="end"
                                    aria-label="copy-id"
                                    onClick={handleCopyMissionId}
                                    size="small"
                                    sx={{
                                        color: 'rgba(79, 195, 247, 0.7)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(79, 195, 247, 0.15)',
                                            color: '#4fc3f7'
                                        }
                                    }}
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </ListItemSecondaryAction>
                    </StyledListItem>
                </List>
                
                {pathSegments.length > 0 && (
                    <>
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                display: 'block', 
                                color: (theme) => theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.7)'
                                    : 'rgba(0, 0, 0, 0.7)', 
                                mt: 2, 
                                mb: 1,
                                fontWeight: 500
                            }}
                        >
                            Path Segments: {pathSegments.length}
                        </Typography>
                        <Box 
                            sx={{ 
                                backgroundColor: (theme) => theme.palette.mode === 'dark'
                                    ? 'rgba(79, 195, 247, 0.1)' 
                                    : 'rgba(79, 195, 247, 0.08)',
                                borderRadius: 1, 
                                p: 1, 
                                fontFamily: '"Roboto Mono", monospace',
                                fontSize: '0.75rem',
                                color: (theme) => theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.7)'
                                    : 'rgba(0, 0, 0, 0.7)',
                            }}
                        >
                            {pathSegments.map((segment, idx) => (
                                <Box key={segment.id} sx={{ mb: idx < pathSegments.length - 1 ? 1 : 0 }}>
                                    <Typography variant="caption" sx={{ 
                                        color: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.9)'
                                            : 'rgba(0, 0, 0, 0.9)'
                                    }}>
                                        {segment.type} ({segment.waypoints?.length || 0} waypoints)
                                    </Typography>
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            display: 'block',
                                            color: (theme) => theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.5)'
                                                : 'rgba(0, 0, 0, 0.5)',
                                            fontSize: '0.65rem',
                                            mt: 0.5
                                        }}
                                    >
                                        ID: {segment.id ? segment.id.substring(0, 8) : 'N/A'}...
                                    </Typography>
                                    {idx < pathSegments.length - 1 && (
                                        <Divider sx={{ 
                                            my: 1, 
                                            borderColor: (theme) => theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.05)'
                                                : 'rgba(0, 0, 0, 0.05)' 
                                        }} />
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </>
                )}
            </Paper>
        );
    };

    const ManualGridContent = (
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

    // If embedded, just return the content. Otherwise, wrap in Box/Paper with accordion.
    if (isEmbedded) {
        return ManualGridContent;
    } else {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Mission Generator Tools</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Accordion 
                    expanded={expanded === 'manualGrid'} 
                    onChange={handleAccordionChange('manualGrid')}
                    sx={{ mb: 1 }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="manual-grid-content"
                        id="manual-grid-header"
                    >
                        <Typography variant="subtitle1">Manual Grid</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        {ManualGridContent}
                    </AccordionDetails>
                </Accordion>
                
                <Accordion 
                    expanded={expanded === '2dMission'} 
                    onChange={handleAccordionChange('2dMission')}
                    sx={{ mb: 1 }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="2d-mission-content"
                        id="2d-mission-header"
                    >
                        <Typography variant="subtitle1">2D Mission</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                The 2D Mission generator creates paths based on a selected 2D area. Select an area and configure coverage parameters.
                            </Typography>
                            <Button 
                                variant="outlined" 
                                color="primary"
                                disabled={!currentMission}
                                fullWidth
                            >
                                Select Area on Map
                            </Button>
                            <TextField 
                                label="Altitude (AGL, m)" 
                                variant="outlined" 
                                size="small" 
                                type="number"
                                fullWidth
                                defaultValue="20"
                                InputProps={{ inputProps: { min: 0, step: 1 } }}
                            />
                            <TextField 
                                label="Coverage Overlap (%)" 
                                variant="outlined" 
                                size="small" 
                                type="number"
                                fullWidth
                                defaultValue="70"
                                InputProps={{ inputProps: { min: 0, max: 95, step: 5 } }}
                            />
                            <Button 
                                variant="contained" 
                                disabled={!currentMission}
                            >
                                Generate 2D Mission
                            </Button>
                        </Stack>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion 
                    expanded={expanded === '3dMission'} 
                    onChange={handleAccordionChange('3dMission')}
                    sx={{ mb: 1 }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="3d-mission-content"
                        id="3d-mission-header"
                    >
                        <Typography variant="subtitle1">3D Mission</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                The 3D Mission generator creates paths to cover 3D structures from multiple angles and heights. Select a structure and define coverage parameters.
                            </Typography>
                            <Button 
                                variant="outlined" 
                                color="primary"
                                disabled={!currentMission}
                                fullWidth
                            >
                                Select 3D Structure
                            </Button>
                            <TextField 
                                label="Min Altitude (AGL, m)" 
                                variant="outlined" 
                                size="small" 
                                type="number"
                                fullWidth
                                defaultValue="10"
                                InputProps={{ inputProps: { min: 5, step: 1 } }}
                            />
                            <TextField 
                                label="Max Altitude (AGL, m)" 
                                variant="outlined" 
                                size="small" 
                                type="number"
                                fullWidth
                                defaultValue="40"
                                InputProps={{ inputProps: { min: 10, step: 1 } }}
                            />
                            <TextField 
                                label="Altitude Layers" 
                                variant="outlined" 
                                size="small" 
                                type="number"
                                fullWidth
                                defaultValue="3"
                                InputProps={{ inputProps: { min: 1, max: 10, step: 1 } }}
                            />
                            <TextField 
                                label="Structure Distance (m)" 
                                variant="outlined" 
                                size="small" 
                                type="number"
                                fullWidth
                                defaultValue="15"
                                InputProps={{ inputProps: { min: 5, step: 1 } }}
                            />
                            <Button 
                                variant="contained" 
                                disabled={!currentMission}
                            >
                                Generate 3D Mission
                            </Button>
                        </Stack>
                    </AccordionDetails>
                </Accordion>
                
                {/* Add Mission List component here */}
                {currentMission && <MissionList />}
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Additional mission generators will be added in future updates.
                </Typography>
            </Box>
        );
    }
};

export default RasterPatternStep;
