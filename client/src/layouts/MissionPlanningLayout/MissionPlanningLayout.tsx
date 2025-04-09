import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom'; // Keep Outlet for potential future nested views if needed, but not used for steps now
import {
    Box,
    Toolbar,
    Typography,
    CssBaseline,
    AppBar,
    Paper,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Stack,
    Divider,
    Button,
    Tabs,
    Tab,
    Tooltip,
    SpeedDial,
    SpeedDialIcon,
    SpeedDialAction,
    FormControlLabel,
    Switch,
    Slider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormGroup,
    CircularProgress,
    Checkbox
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'; // Icon for Pre-checks
import RouteIcon from '@mui/icons-material/Route'; // Icon for Raster Pattern/Controls
import CategoryIcon from '@mui/icons-material/Category'; // Icon for Build Scene (Example)
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // <-- Add icon for Accordion
import { keyframes } from '@mui/system'; // Import keyframes

// Import context and basic utilities
import { useMission } from '../../context/MissionContext';
import { metersToFeet } from '../../utils/sensorCalculations';
import { PathType } from '../../types/mission';
import { useThemeContext } from '../../context/ThemeContext';
import { HardwareState } from '../../context/MissionContext';
import { SelectChangeEvent } from '@mui/material/Select';
import { feetToMeters } from '../../utils/sensorCalculations';

// Lazy-loaded components (heavier components)
const PlayCircleOutlineIcon = lazy(() => import('@mui/icons-material/PlayCircleOutline'));
const SensorsIcon = lazy(() => import('@mui/icons-material/Sensors'));
const SettingsIcon = lazy(() => import('@mui/icons-material/Settings'));
const AddLocationIcon = lazy(() => import('@mui/icons-material/AddLocation'));
const PolylineIcon = lazy(() => import('@mui/icons-material/Polyline'));
const GridOnIcon = lazy(() => import('@mui/icons-material/GridOn'));
const PlayArrowIcon = lazy(() => import('@mui/icons-material/PlayArrow'));
const PauseIcon = lazy(() => import('@mui/icons-material/Pause'));
const RestartAltIcon = lazy(() => import('@mui/icons-material/RestartAlt'));
const PublishIcon = lazy(() => import('@mui/icons-material/Publish'));
const SaveIcon = lazy(() => import('@mui/icons-material/Save'));
const DeleteIcon = lazy(() => import('@mui/icons-material/Delete'));
const AddIcon = lazy(() => import('@mui/icons-material/Add'));
const EditLocationIcon = lazy(() => import('@mui/icons-material/EditLocation'));
const CameraIcon = lazy(() => import('@mui/icons-material/Camera'));
const CameraAltIcon = lazy(() => import('@mui/icons-material/CameraAlt'));
const TimerIcon = lazy(() => import('@mui/icons-material/Timer'));
const StraightenIcon = lazy(() => import('@mui/icons-material/Straighten'));

// Lazy-loaded component imports for heavy components
const HardwareSelectionModal = lazy(() => import('../../components/HardwareSelection/HardwareSelectionModal'));
const SceneSettingsPanel = lazy(() => import('../../components/SceneControls/SceneSettingsPanel'));
const TimelineControls = lazy(() => import('../../components/TimelineControls/TimelineControls'));
const Local3DViewer = lazy(() => import('../../components/Local3DViewer'));
const AssetTree = lazy(() => import('../../components/AssetTree/AssetTree'));
const BuildSceneStep = lazy(() => import('../../pages/MissionPage/Steps/BuildSceneStep'));
const MissionPreChecksStep = lazy(() => import('../../pages/MissionPage/Steps/MissionPreChecksStep'));
const MissionPlanningStep = lazy(() => import('../../pages/MissionPage/Steps/MissionPlanningStep'));

// Lazy-load utility functions that are more complex
const { 
  calculateSegmentDistance, 
  countPhotosInSegment, 
  calculateSegmentTime, 
  formatTimeMMSS 
} = await import('../../utils/pathUtils');

// Lazy-load hardware database
const { 
  cameras, 
  lenses, 
  droneModels, 
  getCameraById, 
  getLensById, 
  getDroneModelById, 
  getCompatibleLenses, 
  getLensFStops 
} = await import('../../utils/hardwareDatabase');

// Update the import to use our new SceneSettings type
import { SceneSettings } from '../../components/Local3DViewer/types/SceneSettings';

// Loading fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" p={2}>
    <CircularProgress color="info" size={30} />
  </Box>
);

// Icon loading fallback (smaller)
const IconFallback = () => (
  <Box width={24} height={24} display="flex" justifyContent="center" alignItems="center">
    <CircularProgress color="inherit" size={16} />
  </Box>
);

const leftPaneWidth = 450; // Keep defined width
const bottomPanelHeight = '350px'; // INCREASED height by 100px

// Define options for new dropdowns
const SHUTTER_SPEED_OPTIONS = [ "1/8000", "1/4000", "1/2000", "1/1000", "1/500", "1/250", "1/125", "1/60", "1/30", "1/15", "1/8", "1/4", "1/2", "1" ];
const ISO_OPTIONS = [ 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800 ];

// Define constants for button values
const SIMULATE_MODE = 'simulation';
const LIVE_MODE = 'live';

// Define the flashing animation
const flashAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; } /* Adjust opacity for desired flash intensity */
`;

const MissionPlanningLayout: React.FC = () => {
    const { state: missionState, dispatch: missionDispatch } = useMission();
    const { 
        activeControlPane, 
        isSimulating, 
        sceneSettings, 
        missions, // Get the list of all missions
        currentMission, // Get the currently active mission
        isLive, 
        hardware,
        selectedPathSegmentIds // Get selected segment IDs
    } = missionState;
    const { mode, setThemeMode } = useThemeContext();
    const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

    // Default pane is set by initial state in context, no useEffect needed now

    // REVISED handler for ToggleButtonGroup
    const handlePaneChange = (
        event: React.MouseEvent<HTMLElement>,
        newPane: 'pre-checks' | 'build-scene' | 'mission-planning' | null, // MUI provides null if deselected
    ) => {
        const currentPane = missionState.activeControlPane; // Get current state value

        if (newPane === null) {
            // Clicked the active button again
            setIsLeftPanelOpen(false);
            // DO NOT dispatch here, keep the activeControlPane state as is
        } else if (newPane !== currentPane) {
            // Clicked a different button
            setIsLeftPanelOpen(true); // Ensure panel is open
            missionDispatch({ type: 'SET_ACTIVE_CONTROL_PANE', payload: newPane });
        } else {
             // Clicked the current button when the panel was closed
             setIsLeftPanelOpen(true);
        }
    };

    const toggleBottomPanel = () => { // Add handler to toggle panel
        setIsBottomPanelOpen(!isBottomPanelOpen);
    };

    // Function to open the hardware modal
    const handleOpenHardwareModal = () => {
        setIsHardwareModalOpen(true);
        // Keep hardware modal opening separate from left panel visibility toggle
    };

    // Function to close the hardware modal
    const handleCloseHardwareModal = () => {
        setIsHardwareModalOpen(false);
    };

    // --- Handlers for inline hardware edits --- FIX Field Names
    const handleHardwareFieldChange = (field: keyof HardwareState, value: any) => {
        missionDispatch({
            type: 'UPDATE_HARDWARE_FIELD',
            payload: { field, value },
        });
    };

    const handleHardwareSelectChange = (field: 'camera' | 'lens' | 'drone' | 'fStop' | 'shutterSpeed' | 'iso', event: SelectChangeEvent<string | number>) => { // Allow number & add new fields
        // Ensure numeric values are treated as numbers
        const value = (field === 'fStop' || field === 'iso') ? Number(event.target.value) : event.target.value;
        handleHardwareFieldChange(field, value);
    };

    const handleSliderChange = (field: 'focusDistance', event: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) => {
        // For focus distance, convert feet back to meters before dispatching
        const dispatchValue = feetToMeters(value as number);
        handleHardwareFieldChange(field, dispatchValue);
    };
    // --- End Handlers ---

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTabIndex(newValue);
    };

    // --- Define handlers from SceneToolbar directly here ---
    const addWaypoint = () => console.log('Add waypoint clicked (placeholder)');
    const addPathSegment = (type: PathType) => console.log(`Add path segment of type ${type} (placeholder)`);
    const startSimulation = () => missionDispatch({ type: 'START_SIMULATION' });
    const pauseSimulation = () => missionDispatch({ type: 'STOP_SIMULATION' });
    const resetSimulation = () => {
        missionDispatch({ type: 'STOP_SIMULATION' });
        // Assuming SET_SIMULATION_TIME is a valid action, otherwise adjust
        // dispatch({ type: 'SET_SIMULATION_TIME', payload: 0 }); 
        console.log('Reset Simulation clicked (placeholder)'); 
    };
    const startPolygonDrawing = () => missionDispatch({ type: 'START_POLYGON_DRAWING' });
    const importModel = () => console.log('Import 3D Model clicked (placeholder)');
    const saveMission = () => console.log('Save Mission clicked (placeholder)');
    const deleteSelected = () => console.log('Delete Selected clicked (placeholder)');
    
    // Define actions for the speed dial
    const speedDialActions = [
        { 
            icon: (
                <Suspense fallback={<IconFallback />}>
                    <AddLocationIcon />
                </Suspense>
            ), 
            name: 'Add Waypoint', 
            onClick: addWaypoint 
        },
        { 
            icon: (
                <Suspense fallback={<IconFallback />}>
                    <RouteIcon />
                </Suspense>
            ), 
            name: 'Path: Straight', 
            onClick: () => addPathSegment(PathType.STRAIGHT) 
        },
        { 
            icon: (
                <Suspense fallback={<IconFallback />}>
                    <PolylineIcon />
                </Suspense>
            ), 
            name: 'Path: Bezier', 
            onClick: () => addPathSegment(PathType.BEZIER) 
        },
        { 
            icon: (
                <Suspense fallback={<IconFallback />}>
                    <GridOnIcon />
                </Suspense>
            ), 
            name: 'Path: Grid', 
            onClick: () => addPathSegment(PathType.GRID) 
        },
        { 
            icon: (
                <Suspense fallback={<IconFallback />}>
                    <EditLocationIcon />
                </Suspense>
            ), 
            name: 'Draw Polygon Area', 
            onClick: startPolygonDrawing 
        },
    ];
    // --- End handlers ---

    // Handler for theme toggle switch
    const handleThemeChange = () => {
        // Determine the next mode (simple toggle between light and dark for now)
        const nextMode = mode === 'light' ? 'dark' : 'light'; 
        setThemeMode(nextMode);

        // Update scene settings based on the *next* theme that will be applied
        // The defaults are now handled directly in the MissionContext reducer based on theme
        // So we just dispatch an empty payload to trigger the theme-based update if needed
        // Or better, we could potentially add a dedicated action like 'APPLY_THEME_DEFAULTS' to the context
        // For now, relying on the existing context/theme provider logic should suffice,
        // as sceneSettings are likely already managed there based on the theme mode.
        // If not, we'd need to adjust MissionContext to react to theme changes.
        
        // Remove dependency on local defaults:
        // const newSceneDefaults = nextMode === 'dark' ? defaultDarkSceneSettings : defaultLightSceneSettings;
        // missionDispatch({ type: 'UPDATE_SCENE_SETTINGS', payload: newSceneDefaults });
    };
    
    // Handler for scene setting slider changes
    const handleSceneSettingChange = (param: keyof SceneSettings, value: any) => {
        let processedValue = value;
        if (param === 'fov' || param === 'gridSize' || param === 'gridDivisions') {
             processedValue = parseFloat(value);
             if (isNaN(processedValue)) return; 
        }
        // Add handling for color pickers later if needed
        missionDispatch({
            type: 'UPDATE_SCENE_SETTINGS',
            payload: { [param]: processedValue } as Partial<SceneSettings> 
        });
    };

    // Calculate these outside the JSX for clarity
    const compatibleLenses = getCompatibleLenses(missionState.hardware?.camera ?? null);
    const availableFStops = getLensFStops(missionState.hardware?.lensDetails ?? undefined);
    const focusDistanceFt = metersToFeet(missionState.hardware?.focusDistance ?? 10);

    // --- New Handler for Mode Change ---
    // This function will be passed to the ToggleButtonGroup
    const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: string | null) => {
        if (newMode !== null) { // Ensure a value was selected
            if (newMode === SIMULATE_MODE) {
                missionDispatch({ type: 'SET_LIVE_MODE', payload: false });
                // If you need to stop simulation when switching back from live:
                // missionDispatch({ type: 'STOP_SIMULATION' }); 
            } else if (newMode === LIVE_MODE) {
                missionDispatch({ type: 'STOP_SIMULATION' }); // Ensure simulation stops when going live
                missionDispatch({ type: 'SET_LIVE_MODE', payload: true });
            }
        }
    };
    // --- End New Handler ---

    // --- Handler for Mission Selection Dropdown ---
    const handleMissionSelect = (event: SelectChangeEvent<string>) => {
        const selectedMissionId = event.target.value;
        if (selectedMissionId) {
            missionDispatch({ type: 'SET_ACTIVE_MISSION', payload: selectedMissionId });
        }
    };
    // --- End Handler ---

    // --- Handler for Path Segment Checkbox Change ---
    const handleSegmentToggle = (segmentId: string) => {
        missionDispatch({ type: 'TOGGLE_PATH_SEGMENT_SELECTION', payload: segmentId });
    };
    // --- End Handler ---

    // --- Handler for Deleting Path Segment (can reuse if simple) ---
    const handleDeleteSegment = (segmentId: string) => {
        // Optional: Add confirmation dialog here
        console.log(`Dispatching DELETE_PATH_SEGMENT from Layout for ID: ${segmentId}`);
        missionDispatch({ type: 'DELETE_PATH_SEGMENT', payload: segmentId });
    };
    // --- End Handler ---

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
            <CssBaseline />
            <Paper 
                square 
                elevation={1} 
                sx={{ 
                    zIndex: (theme) => theme.zIndex.appBar - 1, 
                    backgroundColor: 'rgba(21, 21, 21, 0.97)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    flexShrink: 0
                }}
            >
                <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
                    {/* Left side: Pane Toggles & Hardware Button */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <ToggleButtonGroup
                            value={activeControlPane}
                            exclusive
                            onChange={handlePaneChange}
                            aria-label="Control Pane Selection"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    borderColor: 'rgba(255, 255, 255, 0.12)',
                                    textTransform: 'none',
                                    fontSize: '0.85rem',
                                    py: 0.75,
                                    '&.Mui-selected': {
                                        backgroundColor: 'rgba(79, 195, 247, 0.15)',
                                        color: '#4fc3f7',
                                        borderColor: 'rgba(79, 195, 247, 0.5)',
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    },
                                }
                            }}
                        >
                            <ToggleButton value="pre-checks" aria-label="Pre-Checks">
                                <FlightTakeoffIcon sx={{ mr: 0.5, fontSize: '1rem' }}/> Pre-Checks
                            </ToggleButton>
                            <ToggleButton value="build-scene" aria-label="Build Scene">
                                <CategoryIcon sx={{ mr: 0.5, fontSize: '1rem' }}/> Build Scene
                            </ToggleButton>
                            {/* RENAMED Controls to Mission Tools */}
                            <ToggleButton value="mission-planning" aria-label="Mission Planning">
                                <RouteIcon sx={{ mr: 0.5, fontSize: '1rem' }}/> Mission Planning
                            </ToggleButton>
                        </ToggleButtonGroup>
                        
                        {/* Hardware Button in toolbar */}
                        <Button 
                            startIcon={<CameraIcon sx={{ fontSize: '1rem' }}/>} 
                            onClick={handleOpenHardwareModal}
                            sx={{ 
                                textTransform: 'none',
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '0.85rem',
                                px: 1.5,
                                py: 0.75,
                                ml: 1,
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: 1,
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                }
                            }}
                        >
                            Hardware
                        </Button>
                    </Stack>
                    
                    {/* Right side: Advanced Toggle, Simulation/Live Toggles */}
                    <Stack direction="row" spacing={1.5} alignItems="center"> {/* Increased spacing slightly */}
                        {/* Theme Toggle Switch */}
                        <FormControlLabel
                            control={
                                <Switch 
                                    checked={mode === 'dark' || mode === 'gecko'} 
                                    onChange={handleThemeChange} 
                                    size="small"
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: '#4fc3f7',
                                            '& + .MuiSwitch-track': {
                                                backgroundColor: 'rgba(79, 195, 247, 0.6)',
                                            },
                                        },
                                    }}
                                />
                            }
                            label={<Typography sx={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>{mode === 'light' ? 'Light' : 'Dark'}</Typography>}
                            sx={{ mr: 1 }}
                        />
                         {/* Add Gear Icon Button */}
                         <IconButton 
                            onClick={toggleBottomPanel} 
                            size="small" 
                            title="Toggle Advanced Panel"
                            sx={{ 
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                }
                            }}
                        >
                             <SettingsIcon fontSize="small" />
                         </IconButton>

                         {/* --- Replace Buttons with ToggleButtonGroup --- */}
                         <ToggleButtonGroup
                            value={isLive ? LIVE_MODE : SIMULATE_MODE}
                            exclusive
                            onChange={handleModeChange}
                            aria-label="application mode"
                            size="small" // Match button size if needed
                            sx={{ 
                                // Add some styling to make the group look cohesive
                                // borderRadius: 1, 
                                // border: '1px solid rgba(255, 255, 255, 0.12)',
                            }}
                         >
                            <ToggleButton 
                                value={SIMULATE_MODE} 
                                aria-label="simulate mode"
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '0.85rem',
                                    color: isLive ? 'rgba(255, 255, 255, 0.7)' : '#4fc3f7', // Active color based on isLive
                                    borderColor: isLive ? 'rgba(255, 255, 255, 0.12)' : 'rgba(79, 195, 247, 0.5)',
                                    animation: isSimulating && !isLive ? `${flashAnimation} 1.5s linear infinite` : 'none',
                                    '&.Mui-selected': {
                                        color: '#4fc3f7',
                                        backgroundColor: 'rgba(79, 195, 247, 0.08)', 
                                        borderColor: 'rgba(79, 195, 247, 0.5)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(79, 195, 247, 0.15)',
                                        },
                                    },
                                    '&:not(.Mui-selected)': { // Style for the non-selected state
                                        borderColor: 'rgba(255, 255, 255, 0.12)',
                                         '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                        }
                                    },
                                }}
                            >
                                <PlayCircleOutlineIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} /> 
                                {!isLive && isSimulating ? 'Simulate' : 'Planning'}
                            </ToggleButton>
                            <ToggleButton 
                                value={LIVE_MODE} 
                                aria-label="live mode"
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '0.85rem',
                                    color: isLive ? '#ff3366' : 'rgba(255, 255, 255, 0.7)', // Active color based on isLive
                                    borderColor: isLive ? 'rgba(255, 51, 102, 0.5)' : 'rgba(255, 255, 255, 0.12)',
                                     '&.Mui-selected': {
                                        color: '#ff3366',
                                        backgroundColor: 'rgba(255, 51, 102, 0.08)',
                                        borderColor: 'rgba(255, 51, 102, 0.5)',
                                         '&:hover': {
                                            backgroundColor: 'rgba(255, 51, 102, 0.15)',
                                        },
                                    },
                                     '&:not(.Mui-selected)': { // Style for the non-selected state
                                        borderColor: 'rgba(255, 255, 255, 0.12)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                        }
                                    },
                                }}
                            >
                                 <SensorsIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} /> Live
                            </ToggleButton>
                         </ToggleButtonGroup>
                         {/* --- End Replacement --- */}
                    </Stack>
                </Toolbar>
            </Paper>

            {/* Main Content Area - Flex row, grows to fill space */}
            <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}> 
                
                {/* Left Pane - MODIFIED for collapse animation */}
                <Box
                    component={Paper} // Use Paper directly for elevation and background
                    square
                    elevation={0} // No shadow needed if using border
                    sx={{
                        width: isLeftPanelOpen ? leftPaneWidth : 0, // Animate width
                        flexShrink: 0,
                        backgroundColor: 'rgba(21, 21, 21, 0.97)',
                        borderRight: isLeftPanelOpen ? '1px solid rgba(255, 255, 255, 0.08)' : 'none', // Conditional border
                        overflow: 'hidden', // Hide content when collapsing
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        transition: (theme) => theme.transitions.create('width', { // Add transition
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.leavingScreen, // Use leavingScreen duration
                        }),
                        // Ensure content doesn't wrap when collapsing
                        whiteSpace: 'nowrap' 
                    }}
                >
                    {/* Step/Control Content Area - Add check for activeControlPane */}
                    <Box sx={{ flexGrow: 1, p: isLeftPanelOpen ? 2 : 0, overflowY: 'auto' }}> {/* Conditional padding */}
                        {/* Only render content if pane is active and open */}
                        {isLeftPanelOpen && activeControlPane === 'pre-checks' && (
                            <Suspense fallback={<LoadingFallback />}>
                                <MissionPreChecksStep />
                            </Suspense>
                        )}
                        {isLeftPanelOpen && activeControlPane === 'build-scene' && (
                            <Suspense fallback={<LoadingFallback />}>
                                <BuildSceneStep />
                            </Suspense>
                        )}
                        {isLeftPanelOpen && activeControlPane === 'mission-planning' && (
                            <Suspense fallback={<LoadingFallback />}>
                                <MissionPlanningStep />
                            </Suspense>
                        )}
                    </Box>
                    
                    {/* Hardware Accordion - only show if panel is open */}
                    {isLeftPanelOpen && missionState.hardware && (
                         <Accordion 
                            sx={{ 
                                flexShrink: 0, 
                                backgroundColor: 'transparent',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
                                m: 0,
                                '&::before': {
                                    display: 'none', // Remove default accordion divider
                                },
                                '& .MuiAccordionSummary-root': {
                                    backgroundColor: 'rgba(30, 30, 30, 0.6)',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                    minHeight: '48px',
                                },
                                '& .MuiAccordionSummary-content': {
                                    margin: '8px 0',
                                },
                                '& .MuiAccordionDetails-root': {
                                    backgroundColor: 'rgba(25, 25, 25, 0.7)',
                                    padding: '12px',
                                },
                            }}
                        >
                             <AccordionSummary
                                expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}
                                aria-controls="hardware-panel-content"
                                id="hardware-panel-header"
                            >
                                <Typography 
                                    variant="subtitle2" 
                                    sx={{ 
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    Hardware Configuration
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 1.5 }}> {/* Reduced padding slightly */}
                                <Stack spacing={1.5}>
                                     {/* Drone Model Select - Use 'drone' field */}
                                     <FormControl fullWidth size="small" variant="outlined" sx={{ minWidth: 120 }}>
                                         <InputLabel 
                                            id="drone-model-label" 
                                            sx={{ 
                                                color: 'rgba(255, 255, 255, 0.5)',
                                                fontSize: '0.8rem',
                                                '&.Mui-focused': {
                                                    color: '#4fc3f7'
                                                }
                                            }}
                                        >
                                            Drone
                                        </InputLabel>
                                         <Select
                                             labelId="drone-model-label"
                                             value={missionState.hardware.drone ?? ''}
                                             label="Drone"
                                             onChange={(e) => handleHardwareFieldChange('drone', e.target.value)}
                                             sx={{
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                fontSize: '0.85rem',
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(255, 255, 255, 0.15)'
                                                },
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(255, 255, 255, 0.3)'
                                                },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#4fc3f7'
                                                },
                                                '& .MuiSelect-icon': {
                                                    color: 'rgba(255, 255, 255, 0.5)'
                                                }
                                             }}
                                             MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        bgcolor: 'rgba(21, 21, 21, 0.97)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
                                                        '& .MuiMenuItem-root': {
                                                            color: 'rgba(255, 255, 255, 0.9)',
                                                            fontSize: '0.85rem',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(255, 255, 255, 0.08)'
                                                            },
                                                            '&.Mui-selected': {
                                                                backgroundColor: 'rgba(79, 195, 247, 0.15)',
                                                                color: '#4fc3f7'
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                         >
                                             <MenuItem value=""><em>Select Drone...</em></MenuItem>
                                             {droneModels.map(drone => (
                                                 <MenuItem key={drone.id} value={drone.id}>{`${drone.brand} ${drone.name}`}</MenuItem>
                                             ))}
                                         </Select>
                                     </FormControl>

                                     {/* Camera Select - Use 'camera' field */}
                                      <FormControl fullWidth size="small" variant="outlined" sx={{ minWidth: 120 }}>
                                          <InputLabel 
                                            id="camera-model-label"
                                            sx={{ 
                                                color: 'rgba(255, 255, 255, 0.5)',
                                                fontSize: '0.8rem',
                                                '&.Mui-focused': {
                                                    color: '#4fc3f7'
                                                }
                                            }}
                                          >
                                            Camera
                                          </InputLabel>
                                          <Select
                                              labelId="camera-model-label"
                                              value={missionState.hardware.camera ?? ''}
                                              label="Camera"
                                              onChange={(e) => handleHardwareFieldChange('camera', e.target.value)}
                                              sx={{
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                fontSize: '0.85rem',
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(255, 255, 255, 0.15)'
                                                },
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(255, 255, 255, 0.3)'
                                                },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#4fc3f7'
                                                },
                                                '& .MuiSelect-icon': {
                                                    color: 'rgba(255, 255, 255, 0.5)'
                                                }
                                             }}
                                             MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        bgcolor: 'rgba(21, 21, 21, 0.97)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
                                                        '& .MuiMenuItem-root': {
                                                            color: 'rgba(255, 255, 255, 0.9)',
                                                            fontSize: '0.85rem',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(255, 255, 255, 0.08)'
                                                            },
                                                            '&.Mui-selected': {
                                                                backgroundColor: 'rgba(79, 195, 247, 0.15)',
                                                                color: '#4fc3f7'
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                          >
                                             <MenuItem value=""><em>Select Camera...</em></MenuItem>
                                             {cameras.map(camera => (
                                                 <MenuItem key={camera.id} value={camera.id}>{`${camera.brand} ${camera.model} (${camera.megapixels}MP)`}</MenuItem>
                                             ))}
                                         </Select>
                                      </FormControl>
                                     
                                      {/* Lens Select - Use 'lens' field, check hardware.camera */}
                                      <FormControl fullWidth size="small" disabled={!missionState.hardware.camera}>
                                         <InputLabel id="lens-model-label">Lens</InputLabel>
                                         <Select
                                             labelId="lens-model-label"
                                             value={missionState.hardware.lens ?? ''}
                                             label="Lens"
                                             onChange={(e) => handleHardwareFieldChange('lens', e.target.value)}
                                         >
                                             <MenuItem value=""><em>Select Lens...</em></MenuItem>
                                             {/* Pass hardware.camera to getCompatibleLenses */}
                                             {compatibleLenses.map(lens => (
                                                 <MenuItem key={lens.id} value={lens.id}>{`${lens.brand} ${lens.model}`}</MenuItem>
                                             ))}
                                         </Select>
                                      </FormControl>

                                     {/* Aperture (f-stop) Select - Use 'fStop' field */}
                                     <FormControl fullWidth size="small" disabled={!missionState.hardware.lensDetails}>
                                         <InputLabel id="aperture-label">Aperture (f/)</InputLabel>
                                         <Select
                                             labelId="aperture-label"
                                             value={missionState.hardware.fStop ?? ''}
                                             label="Aperture (f/)"
                                             onChange={(e) => handleHardwareFieldChange('fStop', Number(e.target.value) || null)}
                                         >
                                             <MenuItem value=""><em>Select Aperture...</em></MenuItem>
                                             {/* Use calculated availableFStops */}
                                             {availableFStops.map(fStop => (
                                                 <MenuItem key={fStop} value={fStop}>f/{fStop.toFixed(1)}</MenuItem>
                                             ))}
                                         </Select>
                                     </FormControl>
                                    
                                     {/* Shutter Speed Select - Use 'shutterSpeed' field */}
                                     <FormControl fullWidth size="small">
                                         <InputLabel id="shutter-speed-label">Shutter Speed (s)</InputLabel>
                                         <Select
                                             labelId="shutter-speed-label"
                                             value={missionState.hardware.shutterSpeed ?? ''}
                                             label="Shutter Speed (s)"
                                             onChange={(e) => handleHardwareFieldChange('shutterSpeed', e.target.value)}
                                         >
                                             <MenuItem value=""><em>Select Shutter Speed...</em></MenuItem>
                                             {SHUTTER_SPEED_OPTIONS.map(speed => (
                                                 <MenuItem key={speed} value={speed}>{speed}</MenuItem>
                                             ))}
                                         </Select>
                                     </FormControl>

                                     {/* ISO Select - Use 'iso' field */}
                                      <FormControl fullWidth size="small">
                                          <InputLabel id="iso-label">ISO</InputLabel>
                                          <Select
                                              labelId="iso-label"
                                              value={missionState.hardware.iso ?? ''}
                                              label="ISO"
                                              onChange={(e) => handleHardwareFieldChange('iso', Number(e.target.value) || null)}
                                          >
                                             <MenuItem value=""><em>Select ISO...</em></MenuItem>
                                             {ISO_OPTIONS.map(iso => (
                                                 <MenuItem key={iso} value={iso}>{iso}</MenuItem>
                                             ))}
                                         </Select>
                                      </FormControl>

                                     {/* Focus Distance Slider - Use calculated focusDistanceFt */}
                                     <Box sx={{ px: 1 }}>
                                         <Typography variant="caption" id="focus-distance-slider" gutterBottom>
                                             Focus Distance ({focusDistanceFt.toFixed(1)} ft)
                                         </Typography>
                                         <Slider
                                             aria-labelledby="focus-distance-slider"
                                             value={focusDistanceFt}
                                             onChange={(e, newValue) => handleSliderChange('focusDistance', e, newValue as number)}
                                             min={3}
                                             max={400}
                                             step={1}
                                             size="small"
                                             valueLabelDisplay="auto"
                                             valueLabelFormat={(value) => `${value.toFixed(0)} ft`}
                                             disabled={!missionState.hardware.lensDetails}
                                         />
                                     </Box>
                                 </Stack>
                            </AccordionDetails>
                         </Accordion>
                     )}
                </Box>

                {/* Right Main Area - Now a flex column container */}
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 0, 
                        display: 'flex',         // Use flexbox
                        flexDirection: 'column', // Arrange children vertically
                        height: '100%',
                        overflow: 'hidden'       // Prevent layout overflow
                    }}
                >
                    {/* New Wrapper for Viewer and Toolbar */}
                    <Box sx={{ 
                        flexGrow: 1,          // Takes available vertical space
                        position: 'relative', // Positioning context for SceneToolbar
                        overflow: 'hidden',   // Hide viewer overflow if it exceeds this box
                        minHeight: 0         // Needed for flex-grow in some scenarios
                    }}>
                        <Suspense fallback={<LoadingFallback />}>
                            <Local3DViewer height="100%" /> {/* Ensure viewer fills this wrapper */}
                        </Suspense>
                    </Box>
                    
                    {/* Sliding Bottom Panel (Remains the second flex item) */} 
                    <Paper 
                        square 
                        elevation={4} 
                        sx={{ 
                            width: '100%',
                            height: isBottomPanelOpen ? bottomPanelHeight : '0px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            backgroundColor: 'rgba(21, 21, 21, 0.97)',
                            overflow: 'hidden', 
                            transition: 'height 0.3s ease-in-out', 
                            zIndex: 2,
                            display: 'flex', // Use flex column for panel layout
                            flexDirection: 'column' // Arrange tabs and content vertically
                        }}
                    >
                        {/* Tab Navigation */} 
                        <Box sx={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
                            flexShrink: 0,
                            backgroundColor: 'rgba(25, 25, 25, 0.6)',
                        }}>
                            <Tabs 
                                value={activeTabIndex} 
                                onChange={handleTabChange} 
                                aria-label="Advanced Features Tabs"
                                sx={{
                                    minHeight: '42px',
                                    '& .MuiTabs-indicator': {
                                        backgroundColor: '#4fc3f7'
                                    },
                                    '& .MuiTab-root': {
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        fontSize: '0.85rem',
                                        fontWeight: 400,
                                        textTransform: 'none',
                                        minHeight: '42px',
                                        padding: '0 16px',
                                        '&.Mui-selected': {
                                            color: '#4fc3f7'
                                        }
                                    }
                                }}
                            >
                                <Tab label="Mission Controls" id="tab-0" aria-controls="tabpanel-0" />
                                <Tab label="Timeline" id="tab-1" aria-controls="tabpanel-1" />
                                <Tab label="Asset Tree" id="tab-2" aria-controls="tabpanel-2" />
                                <Tab label="ROS Data" id="tab-3" aria-controls="tabpanel-3" />
                                <Tab label="Settings" id="tab-4" aria-controls="tabpanel-4" />
                            </Tabs>
                        </Box>

                        {/* Tab Content Area */} 
                        <Box sx={{ 
                            flexGrow: 1, 
                            p: 2, 
                            overflowY: 'auto', 
                            minHeight: 0,
                            backgroundColor: 'rgba(25, 25, 25, 0.3)',
                            color: 'rgba(255, 255, 255, 0.9)'
                        }}> {/* Allow content to scroll */} 
                            {/* Tab Panel for Mission Controls (index 0) */}
                            <TabPanel value={activeTabIndex} index={0}>
                                {/* Active Mission Selection Dropdown */} 
                                <FormControl fullWidth size="small" sx={{ mb: 2 }}> {/* Reduced bottom margin */}
                                    <InputLabel id="active-mission-select-label" sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-focused': { color: '#4fc3f7' }}}>Active Mission</InputLabel>
                                    <Select
                                        labelId="active-mission-select-label"
                                        value={currentMission?.id ? (missions.some(m => m.id === currentMission.id) ? currentMission.id : '') : ''}
                                        label="Active Mission"
                                        onChange={handleMissionSelect}
                                        sx={{
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4fc3f7' },
                                            '& .MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.7)' }
                                        }}
                                        MenuProps={{
                                             PaperProps: {
                                                 sx: {
                                                     bgcolor: 'rgba(40, 40, 40, 0.95)', // Darker background for dropdown
                                                     border: '1px solid rgba(255, 255, 255, 0.12)',
                                                     '& .MuiMenuItem-root': {
                                                         color: 'rgba(255, 255, 255, 0.8)',
                                                         fontSize: '0.9rem',
                                                         '&:hover': {
                                                             backgroundColor: 'rgba(255, 255, 255, 0.08)'
                                                         },
                                                         '&.Mui-selected': {
                                                             backgroundColor: 'rgba(79, 195, 247, 0.15)', // Match theme highlight
                                                             color: '#ffffff'
                                                         }
                                                     }
                                                 }
                                             }
                                        }}
                                    >
                                        <MenuItem value=""><em>Select Mission...</em></MenuItem>
                                        {missions.map((mission) => (
                                            <MenuItem key={mission.id} value={mission.id}>
                                                {mission.name} ({mission.id.substring(0, 6)}...)
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                {/* Path Segment Selection Checkboxes */} 
                                {currentMission && currentMission.pathSegments.length > 0 && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                                            Visible Path Segments
                                        </Typography>
                                        <FormGroup sx={{ pl: 1 }}>
                                            {currentMission.pathSegments.map((segment) => {
                                                // Calculate derived data for the segment
                                                const distanceMeters = calculateSegmentDistance(segment.waypoints);
                                                const distanceFeet = metersToFeet(distanceMeters);
                                                const photoCount = countPhotosInSegment(segment.waypoints);
                                                const timeSeconds = calculateSegmentTime(distanceMeters, segment.speed, currentMission.defaultSpeed);
                                                const timeFormatted = formatTimeMMSS(timeSeconds);

                                                return (
                                                  <Box 
                                                    key={segment.id} 
                                                    sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}
                                                  >
                                                    {/* Checkbox and Label */}
                                                    <FormControlLabel
                                                      sx={{ flexGrow: 1, mr: 1 }} // Let it grow, leave space for button
                                                      control={
                                                        <Checkbox 
                                                          checked={selectedPathSegmentIds.includes(segment.id)}
                                                          onChange={() => handleSegmentToggle(segment.id)}
                                                          size="small"
                                                          sx={{
                                                            color: 'rgba(255, 255, 255, 0.6)',
                                                            '&.Mui-checked': {
                                                              color: '#4fc3f7', 
                                                            },
                                                            padding: '4px 8px' // Adjust padding if needed
                                                          }}
                                                        />
                                                      }
                                                      label={
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                          {/* Line 1: Type and Waypoint Count */}
                                                          <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                                                            {segment.type || 'Path'} ({segment.waypoints?.length || 0} wp)
                                                          </Typography>
                                                          {/* Line 2: Derived Data */}
                                                          <Stack 
                                                            direction="row" 
                                                            spacing={1} 
                                                            alignItems="center" 
                                                            sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', mt: 0.25 }}
                                                          >
                                                            <Tooltip title="Distance" placement="top">
                                                              <Stack direction="row" alignItems="center" spacing={0.2}>
                                                                <StraightenIcon sx={{ fontSize: '0.75rem' }} />
                                                                <span>{distanceFeet.toFixed(0)} ft</span>
                                                              </Stack>
                                                            </Tooltip>
                                                            <Tooltip title="Est. Time" placement="top">
                                                              <Stack direction="row" alignItems="center" spacing={0.2}>
                                                                <TimerIcon sx={{ fontSize: '0.75rem' }} />
                                                                <span>{timeFormatted}</span>
                                                              </Stack>
                                                            </Tooltip>
                                                            <Tooltip title="Photos" placement="top">
                                                              <Stack direction="row" alignItems="center" spacing={0.2}>
                                                                <CameraAltIcon sx={{ fontSize: '0.75rem' }} />
                                                                <span>{photoCount}</span>
                                                              </Stack>
                                                            </Tooltip>
                                                          </Stack>
                                                          {/* Line 3: ID */}
                                                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.1, fontFamily: '"Roboto Mono", monospace' }}>
                                                            ID: {segment.id.substring(0, 6)}...
                                                          </Typography>
                                                        </Box>
                                                      } // Closing brace for label prop
                                                    /> {/* Closing tag for FormControlLabel */}

                                                    {/* Delete Button */}
                                                    <Tooltip title="Delete Path Segment">
                                                      <IconButton
                                                        aria-label="delete segment"
                                                        onClick={() => handleDeleteSegment(segment.id)}
                                                        size="small"
                                                        sx={{
                                                          color: 'rgba(255, 100, 100, 0.6)',
                                                          '&:hover': {
                                                            backgroundColor: 'rgba(255, 100, 100, 0.1)',
                                                            color: '#ff6464'
                                                          },
                                                          ml: 'auto' // Push to the right
                                                        }}
                                                      >
                                                        <DeleteIcon fontSize="inherit" />
                                                      </IconButton>
                                                    </Tooltip>
                                                  </Box> // Closing tag for outer Box
                                                ); // Closing parenthesis for return
                                            })} {/* Closing brace and parenthesis for map */}
                                        </FormGroup>
                                    </Box>
                                )}
                                {/* ... End Path Segment Selection ... */}

                                <Stack spacing={4} divider={<Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} orientation="horizontal" flexItem />}>
                                    {/* General Controls Section */}
                                    <Box>
                                        <Typography 
                                            variant="subtitle2" 
                                            gutterBottom 
                                            align="center"
                                            sx={{
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                fontSize: '0.85rem',
                                                fontWeight: 500,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                mb: 1.5
                                            }}
                                        >
                                            General
                                        </Typography>
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Tooltip title="Import 3D Model (Placeholder)">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={importModel}
                                                    sx={{
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                            color: '#4fc3f7'
                                                        }
                                                    }}
                                                >
                                                    <PublishIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Save Mission (Placeholder)">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={saveMission}
                                                    sx={{
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                            color: '#4fc3f7'
                                                        }
                                                    }}
                                                >
                                                    <SaveIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Selected (Placeholder)">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={deleteSelected}
                                                    sx={{
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 51, 102, 0.15)',
                                                            color: '#ff3366'
                                                        }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Box>

                                    {/* Simulation Controls Section */}
                                    <Box>
                                        <Typography 
                                            variant="subtitle2" 
                                            gutterBottom 
                                            align="center"
                                            sx={{
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                fontSize: '0.85rem',
                                                fontWeight: 500,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                mb: 1.5
                                            }}
                                        >
                                            Simulation
                                        </Typography>
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            {!isSimulating ? (
                                                <Tooltip title="Start Simulation">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={startSimulation}
                                                    sx={{
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        backgroundColor: 'rgba(79, 195, 247, 0.1)',
                                                        border: '1px solid rgba(79, 195, 247, 0.3)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(79, 195, 247, 0.2)',
                                                            color: '#4fc3f7'
                                                        }
                                                    }}
                                                >
                                                    <PlayArrowIcon fontSize="small" />
                                                </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Pause Simulation">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={pauseSimulation}
                                                    sx={{
                                                        color: '#4fc3f7',
                                                        backgroundColor: 'rgba(79, 195, 247, 0.1)',
                                                        border: '1px solid rgba(79, 195, 247, 0.3)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(79, 195, 247, 0.2)',
                                                        }
                                                    }}
                                                >
                                                    <PauseIcon fontSize="small" />
                                                </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Reset Simulation (Placeholder)">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={resetSimulation}
                                                    sx={{
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                            color: '#4fc3f7'
                                                        }
                                                    }}
                                                >
                                                    <RestartAltIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Box>

                                    {/* Add Elements Section (Speed Dial) */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}> {/* Center Speed Dial */} 
                                        <Typography variant="subtitle2" gutterBottom align="center">Add Elements</Typography>
                                        <SpeedDial
                                            ariaLabel="Mission planning actions"
                                            icon={<AddIcon />}
                                            direction="up"
                                            FabProps={{ size: 'small' }} // Make FAB smaller
                                        >
                                            {speedDialActions.map((action) => (
                                                <SpeedDialAction
                                                    key={action.name}
                                                    icon={action.icon}
                                                    tooltipTitle={action.name}
                                                    onClick={action.onClick}
                                                    FabProps={{ size: 'small' }} // Make action buttons smaller
                                                />
                                            ))}
                                        </SpeedDial>
                                    </Box>
                                </Stack>
                            </TabPanel>
                            
                            {/* Tab Panel for Timeline */} 
                            <TabPanel value={activeTabIndex} index={1}>
                                <Typography variant="h6">Timeline</Typography>
                                <Typography>Timeline content goes here...</Typography>
                            </TabPanel>

                            {/* Tab Panel for Asset Tree */} 
                            <TabPanel value={activeTabIndex} index={2}>
                                <AssetTree /> {/* Render the AssetTree component here */} 
                            </TabPanel>

                            {/* Tab Panel for ROS Data */} 
                            <TabPanel value={activeTabIndex} index={3}>
                                <Typography variant="h6">ROS Data</Typography>
                                <Typography>ROS Data content goes here...</Typography>
                            </TabPanel>

                            {/* Settings Tab Panel (index 4) */}
                            <TabPanel value={activeTabIndex} index={4}>
                                <SceneSettingsPanel 
                                    settings={sceneSettings} 
                                    onChange={handleSceneSettingChange} 
                                />
                            </TabPanel>
                         </Box>

                         {/* Render TimelineControls when panel is open */}
                         {isBottomPanelOpen && <TimelineControls />}
                    </Paper>
                </Box>
            </Box>

            <Suspense fallback={<LoadingFallback />}>
                <HardwareSelectionModal 
                    open={isHardwareModalOpen} 
                    onClose={handleCloseHardwareModal} 
                    onConfirm={handleCloseHardwareModal} 
                />
            </Suspense>
        </Box>
    );
};

// Helper TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ height: '100%' }} // Ensure panel tries to fill height
    >
      {value === index && (
        <Box sx={{ height: '100%' }}> {/* Ensure Box takes height */} 
          {children}
        </Box>
      )}
    </div>
  );
}


export default MissionPlanningLayout; 