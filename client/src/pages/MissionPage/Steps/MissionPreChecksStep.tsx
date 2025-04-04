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
        // Initialize edit state with current GCP data (converted to strings)
        setEditedGcpData({ 
            name: gcp.name,
            x: String(gcp.local.x),
            y: String(gcp.local.y),
            z: String(gcp.local.z),
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
    const handleSaveGcp = () => {
        if (!editingGcpId || !currentMission) return;
        
        const gcpToUpdate = currentMission.gcps.find(g => g.id === editingGcpId);
        if (!gcpToUpdate) return;

        // Parse coordinates from the string edit state
        const parsedX = parseFloat(editedGcpData.x);
        const parsedY = parseFloat(editedGcpData.y);
        const parsedZ = parseFloat(editedGcpData.z);

        // Validate parsed numbers
        if (isNaN(parsedX) || isNaN(parsedY) || isNaN(parsedZ)) {
            console.error("Invalid coordinate format entered. Please enter numbers.");
            // TODO: Show user feedback (e.g., using a Snackbar)
            return; 
        }

        // Construct the final GCP object for dispatch
        const updatedGcp: GCP = {
            ...gcpToUpdate, // Keep original non-edited fields (lat, lng, etc.)
            name: editedGcpData.name.trim() || gcpToUpdate.name, // Use trimmed edited name or fallback
            local: {
                x: parsedX,
                y: parsedY,
                z: parsedZ,
            }
        };

        console.log("Dispatching UPDATE_GCP:", updatedGcp);
        // Assuming UPDATE_GCP action exists and works in the reducer
        dispatch({ type: 'UPDATE_GCP', payload: updatedGcp });
        
        setEditingGcpId(null); // Exit edit mode
        setEditedGcpData({ name: '', x: '', y: '', z: '' }); // Reset edit state
    };

    // Handler for safety parameter changes
    const handleSafetyParamChange = (param: keyof SafetyParams, value: any) => {
        let processedValue = value;
        // Ensure numeric conversion for sliders/numeric fields
        if (typeof value === 'number' || param === 'rtlAltitude' || param === 'climbSpeed') {
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
                         Set: (X: {currentMission.takeoffPoint.x.toFixed(1)}, Y: {currentMission.takeoffPoint.y.toFixed(1)}, Z: {currentMission.takeoffPoint.z.toFixed(1)})
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
                                            label="X" 
                                            value={editedGcpData.x} 
                                            onChange={(e) => handleEditFieldChange('x', e.target.value)}
                                            size="small" variant="outlined" sx={{ width: '70px' }} 
                                            // type="number" // Keep as text to allow intermediate invalid states
                                        />
                                        <TextField 
                                            label="Y" 
                                            value={editedGcpData.y} 
                                            onChange={(e) => handleEditFieldChange('y', e.target.value)}
                                            size="small" variant="outlined" sx={{ width: '70px' }} 
                                        />
                                        <TextField 
                                            label="Z" 
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
                                    <Typography variant="body2" sx={{ width: '60px', textAlign: 'right' }}>X: {gcp.local.x.toFixed(2)}</Typography>
                                    <Typography variant="body2" sx={{ width: '60px', textAlign: 'right' }}>Y: {gcp.local.y.toFixed(2)}</Typography>
                                    <Typography variant="body2" sx={{ width: '60px', textAlign: 'right' }}>Z: {gcp.local.z.toFixed(2)}</Typography>
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
             <Grid container spacing={3}> {/* Increased spacing slightly */} 
                 
                 {/* RTL Altitude */} 
                 <Grid item xs={12}> 
                    <Typography variant="body2" gutterBottom id="rtl-altitude-slider-label">
                        Return-To-Launch Altitude (m)
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Slider
                            aria-labelledby="rtl-altitude-slider-label"
                            value={currentMission.safetyParams?.rtlAltitude ?? 50}
                            onChange={(event, newValue) => handleSafetyParamChange('rtlAltitude', newValue as number)}
                            min={10} max={200} step={5}
                            valueLabelDisplay="auto" 
                            sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2" sx={{ minWidth: '40px', textAlign: 'right' }}>
                            {currentMission.safetyParams?.rtlAltitude ?? 50} m
                        </Typography>
                    </Stack>
                    <Typography variant="caption" display="block" sx={{mt: 0.5}}>Altitude relative to takeoff for RTL.</Typography>
                 </Grid>

                 {/* Climb Speed */} 
                 <Grid item xs={12}> 
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
                         <Typography variant="body2" sx={{ minWidth: '40px', textAlign: 'right' }}>
                             {(currentMission.safetyParams?.climbSpeed ?? 2.0).toFixed(1)} m/s
                         </Typography>
                     </Stack>
                 </Grid>

                 {/* Failsafe Action */} 
                 <Grid item xs={12} sm={6}> 
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
                 <Grid item xs={12} sm={6}> 
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