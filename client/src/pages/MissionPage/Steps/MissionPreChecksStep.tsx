import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Paper, 
    TextField, 
    Divider, 
    Stack, 
    IconButton, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel,
    Grid, // For layout
    Slider // Import Slider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useMission } from '../../../context/MissionContext';
import { GCP, LocalCoord, SafetyParams } from '../../../types/mission'; // Import types
import { generateUUID } from '../../../utils/coordinateUtils'; // Import utility
import { metersToFeet, feetToMeters } from '../../../utils/sensorCalculations'; // Import conversion functions

// Placeholder for interacting with the 3D viewer to select a point
const selectPointOnMap = async (): Promise<LocalCoord | null> => {
    console.warn("selectPointOnMap needs implementation!");
    // Simulate selecting a point near origin for now
    return { x: 1, y: 1, z: 0 }; 
};

const MissionPreChecksStep: React.FC = () => {
    const { state, dispatch } = useMission();
    const { currentMission } = state;
    // State for tracking which GCP is being edited
    const [editingGcpId, setEditingGcpId] = useState<string | null>(null);
    // State to hold the temporary string values during editing
    const [editedGcpData, setEditedGcpData] = useState<{ name: string; x: string; y: string; z: string }>({ name: '', x: '', y: '', z: '' });

    // --- Handlers ---

    // Updated handler to dispatch start selection action
    const handleSetTakeoffPoint = async () => {
        console.log("Dispatching START_SELECTING_TAKEOFF_POINT");
        dispatch({ type: 'START_SELECTING_TAKEOFF_POINT' });
        // Remove old alert and placeholder call
        // alert("Click on the 3D map to set the takeoff location (Not implemented yet).");
        // const point = await selectPointOnMap(); 
        // if (point && currentMission) {
        //     dispatch({ type: 'SET_TAKEOFF_POINT', payload: point });
        // }
    };

    const handleAddGcp = () => {
         if (!currentMission) return;
         const newGcp: GCP = {
             id: generateUUID(),
             name: `GCP-${currentMission.gcps.length + 1}`,
             lat: 0, lng: 0, altitude: 0, // Will need calculation or user input
             local: { x: 0, y: 0, z: 0 }, // Default to origin
             color: '#ffff00', size: 1,
         };
         dispatch({ type: 'ADD_GCP', payload: newGcp });
         // TODO: Add UI to edit the newly added GCP's coordinates
    };

    const handleDeleteGcp = (id: string) => {
        dispatch({ type: 'DELETE_GCP', payload: id });
    };
    
    const handleEditGcp = (gcp: GCP) => {
        setEditingGcpId(gcp.id);
        // Initialize edit state with current GCP data (converted from meters to feet)
        setEditedGcpData({ 
            name: gcp.name,
            x: String(metersToFeet(gcp.local.x)),
            y: String(metersToFeet(gcp.local.y)),
            z: String(metersToFeet(gcp.local.z)),
        }); 
    };

    const handleCancelEditGcp = () => {
        setEditingGcpId(null);
        setEditedGcpData({ name: '', x: '', y: '', z: '' }); // Reset edit state
    };

    // Update the temporary string state as the user types
    const handleEditFieldChange = (field: 'name' | 'x' | 'y' | 'z', value: string) => {
        setEditedGcpData(prev => ({ 
            ...prev,
            [field]: value 
        }));
    };

    // Save: Parse strings, validate, and dispatch update
    // Values entered by user are in feet, convert to meters for storage
    const handleSaveGcp = () => {
        if (!editingGcpId || !currentMission) return;
        
        const gcpToUpdate = currentMission.gcps.find(g => g.id === editingGcpId);
        if (!gcpToUpdate) return;

        // Parse coordinates from the string edit state (values in feet)
        const parsedXFeet = parseFloat(editedGcpData.x);
        const parsedYFeet = parseFloat(editedGcpData.y);
        const parsedZFeet = parseFloat(editedGcpData.z);

        // Validate parsed numbers
        if (isNaN(parsedXFeet) || isNaN(parsedYFeet) || isNaN(parsedZFeet)) {
            console.error("Invalid coordinate format entered. Please enter numbers.");
            // TODO: Show user feedback (e.g., using a Snackbar)
            return; 
        }

        // Convert feet to meters for internal storage
        const parsedXMeters = feetToMeters(parsedXFeet);
        const parsedYMeters = feetToMeters(parsedYFeet);
        const parsedZMeters = feetToMeters(parsedZFeet);

        // Construct the final GCP object for dispatch
        const updatedGcp: GCP = {
            ...gcpToUpdate, // Keep original non-edited fields (lat, lng, etc.)
            name: editedGcpData.name.trim() || gcpToUpdate.name, // Use trimmed edited name or fallback
            local: {
                x: parsedXMeters,
                y: parsedYMeters,
                z: parsedZMeters,
            }
        };

        console.log("Dispatching UPDATE_GCP:", updatedGcp);
        // Assuming UPDATE_GCP action exists and works in the reducer
        dispatch({ type: 'UPDATE_GCP', payload: updatedGcp });
        
        setEditingGcpId(null); // Exit edit mode
        setEditedGcpData({ name: '', x: '', y: '', z: '' }); // Reset edit state
    };

    // Handler for safety parameter changes
    // Convert from feet to meters when sending to state
    const handleSafetyParamChange = (param: keyof SafetyParams, value: any) => {
        let processedValue = value;
        
        // Handle numeric conversions for rtlAltitude and climbSpeed
        if (param === 'rtlAltitude') {
            // Value is in feet from slider, convert to meters for storage
            processedValue = feetToMeters(parseFloat(value)); 
            if (isNaN(processedValue)) return; // Prevent NaN updates
        } 
        else if (param === 'climbSpeed') {
            // Keep climb speed in meters per second (no conversion needed)
            processedValue = parseFloat(value);
            if (isNaN(processedValue)) return; // Prevent NaN updates
        }
        
        dispatch({
            type: 'SET_SAFETY_PARAMS',
            payload: { [param]: processedValue } as Partial<SafetyParams> 
        });
    };

    if (!currentMission) {
        return <Typography>No mission loaded. Please create or load a mission first.</Typography>;
    }

    return (
        <Box> 
             <Typography variant="h6" gutterBottom>Step 1: Mission Pre-checks</Typography>
             <Divider sx={{ mb: 2 }} />

            {/* --- Takeoff Location --- */}
            <Typography variant="subtitle1" gutterBottom>Takeoff Location</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Button 
                    variant="outlined" 
                    startIcon={<MyLocationIcon />}
                    onClick={handleSetTakeoffPoint}
                    size="small"
                >
                    Set Takeoff Point on Map
                </Button>
                {currentMission.takeoffPoint ? (
                     <Typography variant="body2">
                         Set: (X: {metersToFeet(currentMission.takeoffPoint.x).toFixed(1)}, 
                              Y: {metersToFeet(currentMission.takeoffPoint.y).toFixed(1)}, 
                              Z: {metersToFeet(currentMission.takeoffPoint.z).toFixed(1)}) ft
                     </Typography>
                ) : (
                    <Typography variant="body2" color="textSecondary">Not Set</Typography>
                )}
            </Stack>
            <Divider sx={{ mb: 2 }} />
            
            {/* --- Ground Control Points (GCPs) --- */}
            <Box sx={{ mb: 2 }}>
                 <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                     <Typography variant="subtitle1">Ground Control Points (GCPs)</Typography>
                     <Button 
                         variant="outlined" 
                         size="small" 
                         startIcon={<AddCircleOutlineIcon />}
                         onClick={handleAddGcp}
                     >
                         Add GCP
                     </Button>
                 </Stack>
                 <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                     Define at least 3 known points to scale and orient the local 3D scene.
                 </Typography>
                 {currentMission.gcps.length === 0 && (
                      <Typography color="textSecondary" sx={{my: 2}}>No GCPs defined.</Typography>
                 )}
                 <Stack spacing={1}>
                     {currentMission.gcps.map((gcp) => (
                         <Paper key={gcp.id} variant="outlined" sx={{ p: 1.5 }}>
                            {editingGcpId === gcp.id ? (
                                // --- EDITING VIEW ---
                                <Stack spacing={1}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <TextField 
                                            label="Name" 
                                            value={editedGcpData.name} 
                                            onChange={(e) => handleEditFieldChange('name', e.target.value)}
                                            size="small" variant="outlined" sx={{ flexGrow: 1 }}
                                        />
                                        <TextField 
                                            label="X (ft)" 
                                            value={editedGcpData.x} 
                                            onChange={(e) => handleEditFieldChange('x', e.target.value)}
                                            size="small" variant="outlined" sx={{ width: '70px' }} 
                                            // type="number" // Keep as text to allow intermediate invalid states
                                        />
                                        <TextField 
                                            label="Y (ft)" 
                                            value={editedGcpData.y} 
                                            onChange={(e) => handleEditFieldChange('y', e.target.value)}
                                            size="small" variant="outlined" sx={{ width: '70px' }} 
                                        />
                                        <TextField 
                                            label="Z (ft)" 
                                            value={editedGcpData.z} 
                                            onChange={(e) => handleEditFieldChange('z', e.target.value)}
                                            size="small" variant="outlined" sx={{ width: '70px' }} 
                                        />
                                    </Stack>
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                         <Button size="small" onClick={handleCancelEditGcp} startIcon={<CloseIcon />}>Cancel</Button>
                                         <Button size="small" onClick={handleSaveGcp} variant="contained" startIcon={<CheckIcon />}>Save</Button>
                                    </Stack>
                                </Stack>
                            ) : (
                                // --- READ-ONLY VIEW ---
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 'medium' }}>{gcp.name}</Typography>
                                    <Typography variant="body2" sx={{ width: '60px', textAlign: 'right' }}>
                                        X: {metersToFeet(gcp.local.x).toFixed(1)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ width: '60px', textAlign: 'right' }}>
                                        Y: {metersToFeet(gcp.local.y).toFixed(1)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ width: '60px', textAlign: 'right' }}>
                                        Z: {metersToFeet(gcp.local.z).toFixed(1)}
                                    </Typography>
                                    <IconButton size="small" onClick={() => handleEditGcp(gcp)}> 
                                        <EditIcon fontSize="inherit" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDeleteGcp(gcp.id)} color="error">
                                        <DeleteIcon fontSize="inherit"/>
                                    </IconButton>
                                </Stack>
                            )}
                         </Paper>
                     ))}
                 </Stack>
             </Box>
            <Divider sx={{ mb: 2 }} />

            {/* --- MAVLink Safety Parameters --- */}
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Safety Parameters</Typography>
             <Grid container spacing={3}>
                 
                 {/* RTL Altitude */}
                 <Grid size={{ xs: 12 }}> 
                    <Typography variant="body2" gutterBottom id="rtl-altitude-slider-label">
                        Return-To-Launch Altitude (ft)
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Slider
                            aria-labelledby="rtl-altitude-slider-label"
                            value={metersToFeet(currentMission.safetyParams?.rtlAltitude ?? 50)}
                            onChange={(event, newValue) => handleSafetyParamChange('rtlAltitude', newValue as number)}
                            min={30}
                            max={650}
                            step={10}
                            valueLabelDisplay="auto" 
                            sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'right' }}>
                            {metersToFeet(currentMission.safetyParams?.rtlAltitude ?? 50).toFixed(0)} ft
                        </Typography>
                    </Stack>
                    <Typography variant="caption" display="block" sx={{mt:.5}}>Altitude relative to takeoff for RTL.</Typography>
                 </Grid>

                 {/* --- Add Climb To Altitude Slider --- */}
                 <Grid size={{ xs: 12 }}> 
                    <Typography variant="body2" gutterBottom id="climb-to-altitude-slider-label">
                        Mission Start Altitude (ft AGL)
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Slider
                            aria-labelledby="climb-to-altitude-slider-label"
                            // Get value from context, convert meters to feet, provide default
                            value={metersToFeet(currentMission?.safetyParams?.climbToAltitude ?? 40)} 
                            onChange={(event, newValue) => {
                                // Convert feet back to meters before dispatching
                                const valueMeters = feetToMeters(newValue as number);
                                handleSafetyParamChange('climbToAltitude', valueMeters);
                            }}
                            min={30} // Example min
                            max={650} // Example max
                            step={10}
                            valueLabelDisplay="auto" 
                            sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'right' }}>
                            {metersToFeet(currentMission?.safetyParams?.climbToAltitude ?? 40).toFixed(0)} ft
                        </Typography>
                    </Stack>
                    <Typography variant="caption" display="block" sx={{mt:.5}}>Altitude relative to takeoff before first mission waypoint.</Typography>
                 </Grid>
                 {/* --- End Climb To Altitude --- */}

                 {/* Climb Speed */}
                 <Grid size={{ xs: 12 }}> 
                     <Typography variant="body2" gutterBottom id="climb-speed-slider-label">
                         Default Climb Speed (m/s)
                     </Typography>
                     <Stack direction="row" spacing={2} alignItems="center">
                         <Slider
                             aria-labelledby="climb-speed-slider-label"
                             value={currentMission.safetyParams?.climbSpeed ?? 2.0}
                             onChange={(event, newValue) => handleSafetyParamChange('climbSpeed', newValue as number)}
                             min={0.5} max={10.0} step={0.1}
                             valueLabelDisplay="auto"
                             sx={{ flexGrow: 1 }}
                         />
                         <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'right' }}>
                             {(currentMission.safetyParams?.climbSpeed ?? 2.0).toFixed(1)} m/s
                         </Typography>
                     </Stack>
                 </Grid>

                 {/* Failsafe Action */}
                 <Grid size={{ xs: 12, sm: 6 }}> 
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                         <InputLabel id="failsafe-action-label">Failsafe Action</InputLabel> {/* Added id */} 
                         <Select
                             labelId="failsafe-action-label" // Link to label
                             label="Failsafe Action"
                             value={currentMission.safetyParams?.failsafeAction ?? 'RTL'}
                             onChange={(e) => handleSafetyParamChange('failsafeAction', e.target.value)}
                         >
                             <MenuItem value={'RTL'}>Return To Launch (RTL)</MenuItem>
                             <MenuItem value={'LAND'}>Land Immediately</MenuItem>
                             <MenuItem value={'HOLD'}>Hold Position (Loiter)</MenuItem>
                         </Select>
                     </FormControl>
                 </Grid>

                 {/* Mission End Action */}
                 <Grid size={{ xs: 12, sm: 6 }}> 
                     <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                         <InputLabel id="mission-end-action-label">Mission End Action</InputLabel> {/* Added id */} 
                         <Select
                             labelId="mission-end-action-label" // Link to label
                             label="Mission End Action"
                             value={currentMission.safetyParams?.missionEndAction ?? 'RTL'}
                             onChange={(e) => handleSafetyParamChange('missionEndAction', e.target.value)}
                         >
                             <MenuItem value={'RTL'}>Return To Launch (RTL)</MenuItem>
                             <MenuItem value={'LAND'}>Land at Last Waypoint</MenuItem>
                             <MenuItem value={'HOLD'}>Hold at Last Waypoint</MenuItem>
                         </Select>
                     </FormControl>
                 </Grid>
                 
             </Grid>
        </Box>
    );
};

export default MissionPreChecksStep;