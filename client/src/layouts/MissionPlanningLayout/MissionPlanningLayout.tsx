import React, { useState } from 'react';
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
    InputLabel
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'; // Icon for Pre-checks
import RouteIcon from '@mui/icons-material/Route'; // Icon for Raster Pattern/Controls
import CategoryIcon from '@mui/icons-material/Category'; // Icon for Build Scene (Example)
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'; // Simulation icon placeholder
import SensorsIcon from '@mui/icons-material/Sensors'; // Live icon placeholder
import SettingsIcon from '@mui/icons-material/Settings'; // Import Settings icon
import AddLocationIcon from '@mui/icons-material/AddLocation';
import PolylineIcon from '@mui/icons-material/Polyline';
import GridOnIcon from '@mui/icons-material/GridOn';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PublishIcon from '@mui/icons-material/Publish';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditLocationIcon from '@mui/icons-material/EditLocation';
import CameraIcon from '@mui/icons-material/Camera'; // Import an icon for Hardware
import HardwareSelectionModal from '../../components/HardwareSelection/HardwareSelectionModal'; // Import placeholder
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // <-- Add icon for Accordion
import SceneSettingsPanel from '../../components/SceneControls/SceneSettingsPanel'; // Revert to the original import path based on error context
import TimelineControls from '../../components/TimelineControls/TimelineControls'; // <-- Import TimelineControls
import Local3DViewer from '../../components/Local3DViewer/Local3DViewer';
import AssetTree from '../../components/AssetTree/AssetTree';
import BuildSceneStep from '../../pages/MissionPage/Steps/BuildSceneStep';

// Context and Step Components
import { useMission } from '../../context/MissionContext';
import MissionPreChecksStep from '../../pages/MissionPage/Steps/MissionPreChecksStep';
import RasterPatternStep from '../../pages/MissionPage/Steps/RasterPatternStep';
import { PathType } from '../../types/mission'; // <-- Import PathType
import { useThemeContext } from '../../context/ThemeContext/ThemeContext'; // Import theme context hook
import { SceneSettings, HardwareState } from '../../context/MissionContext'; // Import types
import { SelectChangeEvent } from '@mui/material/Select'; // <-- Add SelectChangeEvent
import { cameras, lenses, droneModels, getCameraById, getLensById, getDroneModelById, getCompatibleLenses, getLensFStops } from '../../utils/hardwareDatabase'; // <-- Import hardware data & getLensFStops
import { feetToMeters, metersToFeet } from '../../utils/sensorCalculations'; // <-- Import conversions

const leftPaneWidth = 320; // Adjust width as needed
const bottomPanelHeight = '250px'; // Define height for reuse

// Define options for new dropdowns
const SHUTTER_SPEED_OPTIONS = [ "1/8000", "1/4000", "1/2000", "1/1000", "1/500", "1/250", "1/125", "1/60", "1/30", "1/15", "1/8", "1/4", "1/2", "1" ];
const ISO_OPTIONS = [ 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800 ];

const MissionPlanningLayout: React.FC = () => {
    const { state: missionState, dispatch: missionDispatch } = useMission();
    const { activeControlPane, isSimulating, sceneSettings, currentMission /* other state */ } = missionState;
    const { mode, setThemeMode } = useThemeContext(); // Use setThemeMode instead of toggleTheme
    const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false); // Add state for bottom panel
    const [activeTabIndex, setActiveTabIndex] = useState(0); // State for active tab
    const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false); // <-- Add state for hardware modal

    const handlePaneChange = (
        event: React.MouseEvent<HTMLElement>,
        newPane: 'pre-checks' | 'build-scene' | 'raster-pattern' | null,
    ) => {
        if (newPane !== null) {
            missionDispatch({ type: 'SET_ACTIVE_CONTROL_PANE', payload: newPane });
        }
    };

    const toggleBottomPanel = () => { // Add handler to toggle panel
        setIsBottomPanelOpen(!isBottomPanelOpen);
    };

    // Function to open the hardware modal
    const handleOpenHardwareModal = () => {
        setIsHardwareModalOpen(true);
    };

    // Function to close the hardware modal
    const handleCloseHardwareModal = () => {
        setIsHardwareModalOpen(false);
    };

    // --- Handlers for inline hardware edits ---
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

    const handleSliderChange = (field: 'fStop' | 'focusDistance', event: Event, value: number | number[]) => {
        // For focus distance, convert feet back to meters before dispatching
        const dispatchValue = field === 'focusDistance' ? feetToMeters(value as number) : value as number;
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
        { icon: <AddLocationIcon />, name: 'Add Waypoint', onClick: addWaypoint },
        { icon: <RouteIcon />, name: 'Path: Straight', onClick: () => addPathSegment(PathType.STRAIGHT) },
        { icon: <PolylineIcon />, name: 'Path: Bezier', onClick: () => addPathSegment(PathType.BEZIER) },
        { icon: <GridOnIcon />, name: 'Path: Grid', onClick: () => addPathSegment(PathType.GRID) },
        { icon: <EditLocationIcon />, name: 'Draw Polygon Area', onClick: startPolygonDrawing },
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
            <CssBaseline />
            <Paper 
                square 
                elevation={1} 
                sx={{ 
                    zIndex: (theme) => theme.zIndex.appBar - 1, 
                    backgroundColor: 'background.paper',
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
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
                            size="small"
                        >
                            <ToggleButton value="pre-checks" aria-label="Pre-Checks">
                                <FlightTakeoffIcon sx={{ mr: 0.5 }} fontSize="small"/> Pre-Checks
                            </ToggleButton>
                            <ToggleButton value="build-scene" aria-label="Build Scene">
                                <CategoryIcon sx={{ mr: 0.5 }} fontSize="small"/> Build Scene
                            </ToggleButton>
                            <ToggleButton value="raster-pattern" aria-label="Raster Pattern Controls">
                                <RouteIcon sx={{ mr: 0.5 }} fontSize="small"/> Controls
                            </ToggleButton>
                        </ToggleButtonGroup>
                        {/* Separate Button for Hardware Modal */}
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<CameraIcon fontSize="small"/>} 
                            onClick={handleOpenHardwareModal}
                            sx={{ ml: 1 }} // Add some margin if needed
                        >
                            Hardware
                        </Button>
                    </Stack>
                    
                    {/* Right side: Advanced Toggle, Simulation/Live Toggles */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        {/* Theme Toggle Switch */}
                        <FormControlLabel
                            control={<Switch checked={mode === 'dark' || mode === 'gecko'} onChange={handleThemeChange} size="small" />}
                            label={<Typography variant="caption">{mode === 'light' ? 'Light' : 'Dark'}</Typography>}
                            sx={{ mr: 1 }}
                        />
                         {/* Add Gear Icon Button */}
                         <IconButton onClick={toggleBottomPanel} size="small" title="Toggle Advanced Panel">
                             <SettingsIcon />
                         </IconButton>
                         <Button variant="outlined" size="small" startIcon={<PlayCircleOutlineIcon />}>
                             Simulate
                         </Button>
                         <Button variant="outlined" size="small" startIcon={<SensorsIcon />}>
                             Live
                         </Button>
                    </Stack>
                </Toolbar>
            </Paper>

            {/* Main Content Area - Flex row, grows to fill space */}
            <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}> 
                
                {/* Left Pane */}
                <Box
                    sx={{
                        width: leftPaneWidth,
                        flexShrink: 0,
                        borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                        overflowY: 'auto',
                        height: '100%',
                        display: 'flex', // Use flex column
                        flexDirection: 'column' // Stack children vertically
                    }}
                >
                    {/* Existing Step/Control Panes (occupy available space) */}
                    <Box sx={{ flexGrow: 1, p: 2 }}>
                        {activeControlPane === 'pre-checks' && <MissionPreChecksStep />}
                        {activeControlPane === 'build-scene' && (
                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <BuildSceneStep />
                            </Box>
                        )}
                        {activeControlPane === 'raster-pattern' && <RasterPatternStep />}
                    </Box>
                    
                    <Divider />

                    {/* --- Re-enable Accordion structure with static content --- */}
                    
                    {missionState.hardware && (
                        <Accordion defaultExpanded sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider', m: 0 }}> 
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="hardware-panel-content"
                                id="hardware-panel-header"
                            >
                                <Typography variant="subtitle2">Hardware Configuration</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0, pb: 1, px: 2 }}> 
                                
                                <Stack spacing={2}> 
                                    {/* --- Drone Select (Working) --- */}
                                    <FormControl fullWidth size="small">
                                        <InputLabel id="acc-drone-label">Drone</InputLabel>
                                        <Select
                                            labelId="acc-drone-label"
                                            value={missionState.hardware.drone || ''}
                                            label="Drone"
                                            onChange={(e) => handleHardwareSelectChange('drone', e)}
                                        >
                                            {droneModels.map((drone) => (
                                                <MenuItem key={drone.id} value={drone.id}>
                                                    {drone.brand} {drone.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    
                                    {/* --- Camera Select (Working) --- */}
                                    <FormControl fullWidth size="small">
                                        <InputLabel id="acc-camera-label">Camera</InputLabel>
                                        <Select
                                            labelId="acc-camera-label"
                                            value={missionState.hardware.camera || ''}
                                            label="Camera"
                                            onChange={(e) => handleHardwareSelectChange('camera', e)}
                                        >
                                            {cameras.map((camera) => (
                                                <MenuItem key={camera.id} value={camera.id}>
                                                    {`${camera.brand} ${camera.model} (${camera.megapixels}MP)`}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {/* --- Re-enable Lens Select --- */}
                                    <FormControl fullWidth size="small" disabled={!missionState.hardware.camera}>
                                        <InputLabel id="acc-lens-label">Lens</InputLabel>
                                        <Select
                                            labelId="acc-lens-label"
                                            value={missionState.hardware.lens || ''}
                                            label="Lens"
                                            onChange={(e) => handleHardwareSelectChange('lens', e)}
                                        >
                                            {/* Safer mapping: Only map if camera ID exists */}
                                            {missionState.hardware.camera && 
                                             getCompatibleLenses(missionState.hardware.camera).map((lens) => (
                                                <MenuItem key={lens.id} value={lens.id}>
                                                    {`${lens.brand} ${lens.model}`}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {missionState.hardware.camera && getCompatibleLenses(missionState.hardware.camera).length === 0 && 
                                            <Typography variant="caption" color="textSecondary" sx={{mt: 0.5}}>No compatible lenses</Typography>}
                                    </FormControl>

                                    {/* --- Replace Aperture Slider with Select --- */}
                                    <FormControl fullWidth size="small" disabled={!missionState.hardware.lensDetails}>
                                        <InputLabel id="acc-fstop-label">Aperture (f/)</InputLabel>
                                        <Select
                                            labelId="acc-fstop-label"
                                            value={missionState.hardware.fStop || ''} // Use current fStop or empty string
                                            label="Aperture (f/)"
                                            onChange={(e) => handleHardwareSelectChange('fStop', e)}
                                        >
                                            {(missionState.hardware.lensDetails ? getLensFStops(missionState.hardware.lensDetails) : []).map((fstop) => (
                                                <MenuItem key={fstop} value={fstop}>
                                                    f/{fstop.toFixed(1)} {/* Display with f/ prefix */}
                                                </MenuItem>
                                            ))}
                                            {/* Show message if no stops available */} 
                                            {!missionState.hardware.lensDetails && <MenuItem disabled value="">Select Lens</MenuItem>}
                                            {missionState.hardware.lensDetails && getLensFStops(missionState.hardware.lensDetails).length === 0 && 
                                                <MenuItem disabled value="">No defined stops</MenuItem>}
                                        </Select>
                                    </FormControl>

                                    {/* --- Add Shutter Speed Select --- */}
                                    <FormControl fullWidth size="small" disabled={!missionState.hardware.camera}> {/* Often tied to camera */} 
                                        <InputLabel id="acc-shutter-label">Shutter Speed (s)</InputLabel>
                                        <Select
                                            labelId="acc-shutter-label"
                                            value={missionState.hardware.shutterSpeed || ''}
                                            label="Shutter Speed (s)"
                                            onChange={(e) => handleHardwareSelectChange('shutterSpeed', e)}
                                        >
                                            {SHUTTER_SPEED_OPTIONS.map((speed) => (
                                                <MenuItem key={speed} value={speed}>
                                                    {speed}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    
                                    {/* --- Add ISO Select --- */}
                                     <FormControl fullWidth size="small" disabled={!missionState.hardware.camera}> {/* Often tied to camera */} 
                                        <InputLabel id="acc-iso-label">ISO</InputLabel>
                                        <Select
                                            labelId="acc-iso-label"
                                            value={missionState.hardware.iso || ''} 
                                            label="ISO"
                                            onChange={(e) => handleHardwareSelectChange('iso', e)}
                                        >
                                            {ISO_OPTIONS.map((isoVal) => (
                                                <MenuItem key={isoVal} value={isoVal}>
                                                    {isoVal}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {/* --- Focus Distance Slider --- */}
                                    <Box>
                                         <Typography variant="caption" gutterBottom id="acc-focus-dist-slider-label">
                                            Focus Distance ({metersToFeet(missionState.hardware.focusDistance || 10).toFixed(0)} ft)
                                        </Typography>
                                        <Slider
                                            aria-labelledby="acc-focus-dist-slider-label"
                                            value={metersToFeet(missionState.hardware.focusDistance || 10)}
                                            onChange={(e, v) => handleSliderChange('focusDistance', e, v)}
                                            min={3} // Min focus distance in feet
                                            max={400} // Max focus distance in feet
                                            step={1}
                                            valueLabelDisplay="auto"
                                            valueLabelFormat={(value) => `${value.toFixed(0)} ft`}
                                            size="small"
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
                        <Local3DViewer height="100%" /> {/* Ensure viewer fills this wrapper */}
                    </Box>
                    
                    {/* Sliding Bottom Panel (Remains the second flex item) */} 
                    <Paper 
                        square 
                        elevation={4} 
                        sx={{ 
                            width: '100%',
                            height: isBottomPanelOpen ? bottomPanelHeight : '0px',
                            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                            backgroundColor: 'background.paper',
                            overflow: 'hidden', 
                            transition: 'height 0.3s ease-in-out', 
                            zIndex: 2,
                            display: 'flex', // Use flex column for panel layout
                            flexDirection: 'column' // Arrange tabs and content vertically
                        }}
                    >
                        {/* Tab Navigation */} 
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                            <Tabs value={activeTabIndex} onChange={handleTabChange} aria-label="Advanced Features Tabs">
                                <Tab label="Mission Controls" id="tab-0" aria-controls="tabpanel-0" />
                                <Tab label="Timeline" id="tab-1" aria-controls="tabpanel-1" />
                                <Tab label="Asset Tree" id="tab-2" aria-controls="tabpanel-2" />
                                <Tab label="ROS Data" id="tab-3" aria-controls="tabpanel-3" />
                                <Tab label="Settings" id="tab-4" aria-controls="tabpanel-4" />
                            </Tabs>
                        </Box>

                        {/* Tab Content Area */} 
                        <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', minHeight: 0 }}> {/* Allow content to scroll */} 
                            {/* Tab Panel for Mission Controls (index 0) - Rebuilt UI */} 
                            <TabPanel value={activeTabIndex} index={0}>
                                <Stack spacing={2} divider={<Divider orientation="horizontal" flexItem />}> {/* Use horizontal divider */} 
                                    {/* General Controls Section */}
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom align="center">General</Typography>
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Tooltip title="Import 3D Model (Placeholder)">
                                                <IconButton size="small" onClick={importModel}><PublishIcon /></IconButton>
                                            </Tooltip>
                                            <Tooltip title="Save Mission (Placeholder)">
                                                <IconButton size="small" onClick={saveMission}><SaveIcon /></IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Selected (Placeholder)">
                                                <IconButton size="small" onClick={deleteSelected}><DeleteIcon /></IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Box>

                                    {/* Simulation Controls Section */}
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom align="center">Simulation</Typography>
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            {!isSimulating ? (
                                                <Tooltip title="Start Simulation">
                                                <IconButton size="small" onClick={startSimulation}><PlayArrowIcon /></IconButton>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Pause Simulation">
                                                <IconButton size="small" onClick={pauseSimulation}><PauseIcon /></IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Reset Simulation (Placeholder)">
                                                <IconButton size="small" onClick={resetSimulation}><RestartAltIcon /></IconButton>
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

            {/* Placeholder for Hardware Selection Modal */}
            <HardwareSelectionModal 
                open={isHardwareModalOpen} 
                onClose={handleCloseHardwareModal}
                onConfirm={handleCloseHardwareModal}
            />
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