import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Button, Stack, Paper, Divider } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { useMission } from '../../context/MissionContext';
import { cameras, lenses, droneModels, getCameraById, getLensById, getDroneModelById, getCompatibleLenses } from '../../utils/hardwareDatabase';
import { Camera, Lens, DroneModel, SensorType } from '../../types/hardware';
import { 
    calculateFieldOfView, 
    calculateFootprint, 
    getDOFCalculations, 
    calculateGSD,
    metersToFeet
} from '../../utils/sensorCalculations';

// Define the props if any specific inputs are needed from the modal
interface HardwareFormProps {
    onSaveSuccess?: () => void; // Add prop to call after saving
}

// Default hardware IDs - consistent with DroneSceneViewerWrapper
const DEFAULT_CAMERA_ID = 'phase-one-ixm-100';
const DEFAULT_LENS_ID = 'phaseone-rsm-80mm';
const DEFAULT_SENSOR_TYPE = 'Medium Format';
const DEFAULT_DRONE_ID = 'freefly-alta-x';
const DEFAULT_LIDAR_ID = 'ouster';

// DOF Information Box Component
interface DofInfoBoxProps {
    label: string;
    value: string;
    primary?: boolean;
}

const DofInfoBox: React.FC<DofInfoBoxProps> = ({ label, value, primary = false }) => (
    <Paper
        elevation={0}
        sx={{
            p: 1.5,
            textAlign: 'center',
            borderRadius: 1,
            backgroundColor: primary ? 'rgba(79, 195, 247, 0.15)' : 'rgba(20, 20, 20, 0.8)', // Darker boxes with better contrast
            border: '1px solid',
            borderColor: primary ? 'rgba(79, 195, 247, 0.4)' : 'rgba(50, 50, 50, 0.8)', // More visible borders
        }}
    >
        <Typography variant="caption" component="div" sx={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.7rem',
            mb: 0.5
        }}>
            {label}
        </Typography>
        <Typography sx={{ 
            fontFamily: '"Roboto Mono", monospace',
            fontWeight: primary ? 600 : 500, // Increased weight for better visibility
            fontSize: '0.95rem', // Slightly larger for readability
            color: primary ? '#4fc3f7' : 'rgba(255, 255, 255, 0.95)' // Brighter text for better contrast
        }}>
            {value}
        </Typography>
    </Paper>
);

const HardwareForm: React.FC<HardwareFormProps> = ({ onSaveSuccess }) => {
    const { state: missionState, dispatch } = useMission();
    const hardwareFromContext = missionState.hardware; // Get context hardware state

    // --- Local state for selections - Initialize with defaults or context values ---
    const [selectedDroneId, setSelectedDroneId] = useState<string>(
        () => hardwareFromContext?.drone || DEFAULT_DRONE_ID
    );
    const [selectedLidarId, setSelectedLidarId] = useState<string>(
        () => hardwareFromContext?.lidar || DEFAULT_LIDAR_ID
    );
    const [selectedSensorType, setSelectedSensorType] = useState<SensorType | 'All'> (
        () => hardwareFromContext?.sensorType || DEFAULT_SENSOR_TYPE
    );
    const [selectedCameraId, setSelectedCameraId] = useState<string>(
        () => hardwareFromContext?.camera || DEFAULT_CAMERA_ID
    );
    const [selectedLensId, setSelectedLensId] = useState<string>(
        () => hardwareFromContext?.lens || DEFAULT_LENS_ID
    );

    // Track if initialization has been done
    const [initialized, setInitialized] = useState(false);

    // Initialize hardware defaults to context if not already set
    useEffect(() => {
        if (initialized || !dispatch) return;

        // Only initialize default hardware to context if they don't already exist
        if (!hardwareFromContext) {
            // Get objects for the default selections
            const defaultCamera = getCameraById(DEFAULT_CAMERA_ID);
            const defaultLens = getLensById(DEFAULT_LENS_ID);
            
            if (defaultCamera && defaultLens) {
                // Set camera and lens details in context
                dispatch({
                    type: 'SET_HARDWARE',
                    payload: {
                        camera: DEFAULT_CAMERA_ID,
                        cameraDetails: defaultCamera,
                        lens: DEFAULT_LENS_ID,
                        lensDetails: defaultLens,
                        sensorType: DEFAULT_SENSOR_TYPE,
                        drone: DEFAULT_DRONE_ID,
                        lidar: DEFAULT_LIDAR_ID
                    }
                });
            }
        }

        setInitialized(true);
    }, [hardwareFromContext, dispatch, initialized]);

    // --- Derived State ---
    // Available Cameras based on Sensor Type
    const availableCameras = useMemo(() => {
        if (selectedSensorType === 'All') {
            return cameras;
        }
        return cameras.filter(camera => camera.sensorType === selectedSensorType);
    }, [selectedSensorType]);

    // Compatible Lenses based on Selected Camera
    const compatibleLenses = useMemo(() => {
        return getCompatibleLenses(selectedCameraId);
    }, [selectedCameraId]);

    // Selected Objects
    const selectedDrone = useMemo(() => getDroneModelById(selectedDroneId), [selectedDroneId]);
    const selectedCamera = useMemo(() => getCameraById(selectedCameraId), [selectedCameraId]);
    const selectedLens = useMemo(() => getLensById(selectedLensId), [selectedLensId]);
    
    // LiDAR Options (Hardcoded for now as in Vue example)
    const availableLidars = [
        { id: 'ouster', name: 'Ouster OS0-128' },
        { id: 'hovermap', name: 'Emesent Hovermap' },
        { id: 'none', name: 'None' }
    ];

    // Sensor Type Options
    const sensorTypes: Array<SensorType | 'All'> = [
        'All', 'Medium Format', 'Full Frame', 'APS-C', 'Micro Four Thirds', '1-inch', '1/2-inch'
    ];

    // Calculate DOF info
    const dofInfo = useMemo(() => {
        if (!selectedCamera || !selectedLens || !hardwareFromContext?.fStop || !hardwareFromContext?.focusDistance) {
            return null;
        }

        const focusDistanceM = hardwareFromContext.focusDistance;
        const aperture = hardwareFromContext.fStop;

        // Calculate values
        const dof = getDOFCalculations(focusDistanceM, selectedCamera, selectedLens, aperture);
        const gsd = calculateGSD(focusDistanceM, selectedCamera, selectedLens) * 10; // mm/pixel
        const footprint = calculateFootprint(focusDistanceM, selectedCamera, selectedLens);

        // Calculate megapixels coverage
        const megapixelsCoverage = (selectedCamera.megapixels).toFixed(1);
        const focalLength = selectedLens.focalLength;

        return {
            gsd: gsd.toFixed(2) + ' mm/px',
            nearLimit: metersToFeet(dof.nearLimit).toFixed(1) + ' ft',
            farLimit: dof.farLimit === Infinity ? '∞' : metersToFeet(dof.farLimit).toFixed(1) + ' ft',
            totalDOF: dof.totalDOF === Infinity ? '∞' : metersToFeet(dof.totalDOF).toFixed(1) + ' ft',
            footprintWidth: metersToFeet(footprint.width).toFixed(1) + ' ft',
            footprintHeight: metersToFeet(footprint.height).toFixed(1) + ' ft',
            footprintArea: (metersToFeet(footprint.width) * metersToFeet(footprint.height)).toFixed(1) + ' ft²',
            focalLength: focalLength + 'mm',
            megapixels: megapixelsCoverage + 'MP'
        };
    }, [selectedCamera, selectedLens, hardwareFromContext?.fStop, hardwareFromContext?.focusDistance]);

    // --- Effects ---
    // Reset camera/lens when sensor type changes
    useEffect(() => {
        // Only reset if the selected sensor type *actually* changes from what might be in context
        // This prevents resetting on initial load if context already has a different sensor type
        if (hardwareFromContext?.sensorType !== selectedSensorType) {
             // Check if the *currently selected* camera matches the *new* sensor type filter
             const currentCamera = getCameraById(selectedCameraId);
             if (selectedSensorType !== 'All' && currentCamera?.sensorType !== selectedSensorType) {
                 setSelectedCameraId(''); // Reset camera only if it no longer matches the filter
                 setSelectedLensId('');
             }
        }
    }, [selectedSensorType, hardwareFromContext?.sensorType, selectedCameraId]); // Add deps

    // Reset lens when camera changes
    useEffect(() => {
        // Prevent resetting on initial load if context already provided a lens for the camera
        if (hardwareFromContext?.camera !== selectedCameraId || !hardwareFromContext?.lens) {
            setSelectedLensId('');
             // Auto-select first compatible lens if possible and no lens was loaded from context
             if (!hardwareFromContext?.lens && selectedCameraId) {
                const lenses = getCompatibleLenses(selectedCameraId);
                if (lenses.length > 0) {
                    // If the default lens is compatible, keep it, otherwise select the first compatible
                    const defaultLensIsCompatible = lenses.some(l => l.id === DEFAULT_LENS_ID);
                    setSelectedLensId(defaultLensIsCompatible ? DEFAULT_LENS_ID : lenses[0].id);
                }
             }
        }
    }, [selectedCameraId, hardwareFromContext?.camera, hardwareFromContext?.lens]); // Add deps
    
    // --- Handlers ---
    const handleDroneChange = (event: SelectChangeEvent<string>) => {
        setSelectedDroneId(event.target.value);
        // Don't update context immediately for drone changes
    };
    const handleLidarChange = (event: SelectChangeEvent<string>) => {
        setSelectedLidarId(event.target.value);
        // Don't update context immediately for lidar changes
    };
    const handleSensorTypeChange = (event: SelectChangeEvent<SensorType | 'All'>) => {
        setSelectedSensorType(event.target.value as SensorType | 'All');
        // Don't update context immediately for sensor type changes
    };
    
    // Update these handlers to immediately dispatch to context
    const handleCameraChange = (event: SelectChangeEvent<string>) => {
        const newCameraId = event.target.value;
        setSelectedCameraId(newCameraId);
        
        // Immediately update camera in context if it's valid
        if (newCameraId) {
            const newCamera = getCameraById(newCameraId);
            if (newCamera) {
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { 
                        field: 'camera', 
                        value: newCameraId 
                    }
                });
                
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { 
                        field: 'cameraDetails', 
                        value: newCamera 
                    }
                });
            }
        }
    };
    
    const handleLensChange = (event: SelectChangeEvent<string>) => {
        const newLensId = event.target.value;
        setSelectedLensId(newLensId);
        
        // Immediately update lens in context if it's valid
        if (newLensId) {
            const newLens = getLensById(newLensId);
            if (newLens) {
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { 
                        field: 'lens', 
                        value: newLensId 
                    }
                });
                
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { 
                        field: 'lensDetails', 
                        value: newLens 
                    }
                });
            }
        }
    };

    const handleSaveHardware = () => {
        // Get potentially updated details based on current IDs
        const currentSelectedDrone = getDroneModelById(selectedDroneId);
        const currentSelectedCamera = getCameraById(selectedCameraId);
        const currentSelectedLens = getLensById(selectedLensId);
        
        if (!currentSelectedDrone || !currentSelectedCamera || !currentSelectedLens) {
            console.error("Cannot save incomplete hardware selection.");
            // TODO: Show notification to user
            return;
        }

        // Dispatch SET_HARDWARE with the complete current selection
        dispatch({
            type: 'SET_HARDWARE',
            payload: {
                drone: selectedDroneId,
                lidar: selectedLidarId,
                sensorType: selectedSensorType,
                camera: selectedCameraId,
                lens: selectedLensId,
                // Include details objects as well
                droneDetails: currentSelectedDrone,
                cameraDetails: currentSelectedCamera,
                lensDetails: currentSelectedLens,
                // Ensure other fields from HardwareState are preserved or defaulted
                // The reducer already handles merging and defaulting fStop, focusDistance etc.
                // so we only need to pass the core IDs and details here.
            }
        });
        
        console.log("Hardware selection saved to context:", {
             droneId: selectedDroneId, 
             lidarId: selectedLidarId, 
             cameraId: selectedCameraId, 
             lensId: selectedLensId, 
             sensorType: selectedSensorType,
             // Include details in log for clarity
             droneDetails: currentSelectedDrone,
             cameraDetails: currentSelectedCamera,
             lensDetails: currentSelectedLens
        });
        
        if (onSaveSuccess) {
            onSaveSuccess(); // Call the callback to close the modal
        }
    };

    const isSelectionComplete = !!selectedDroneId && !!selectedCameraId && !!selectedLensId;

    const formStyle = {
        '& .MuiOutlinedInput-root': {
            color: 'rgba(255, 255, 255, 0.95)',
            '& fieldset': {
                borderColor: 'rgba(70, 70, 70, 0.8)',
            },
            '&:hover fieldset': {
                borderColor: 'rgba(100, 100, 100, 0.9)',
            },
            '&.Mui-focused fieldset': {
                borderColor: '#4fc3f7',
            },
        },
        '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-focused': {
                color: '#4fc3f7',
            },
        },
        '& .MuiMenuItem-root': {
            color: 'rgba(255, 255, 255, 0.9)',
        },
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, color: 'rgba(255, 255, 255, 0.95)' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ mb: 1, color: '#4fc3f7', fontWeight: 500 }}>
                Select Hardware Components
            </Typography>
            
            {/* Add note about instant updates */}
            <Typography variant="caption" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic' }}>
                Changes to camera, lens, aperture and focus distance apply instantly.
            </Typography>
            
            <Stack spacing={2.5} sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}> {/* Add spacing between form controls */}
                {/* Drone Selection */}
                <FormControl fullWidth size="small" sx={formStyle}>
                    <InputLabel id="drone-select-label">Drone</InputLabel>
                    <Select
                        labelId="drone-select-label"
                        id="drone-select"
                        value={selectedDroneId}
                        label="Drone"
                        onChange={handleDroneChange}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    bgcolor: '#111111',
                                    borderRadius: 1,
                                    boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
                                }
                            }
                        }}
                    >
                        {droneModels.map((drone) => (
                            <MenuItem key={drone.id} value={drone.id}>
                                {drone.brand} {drone.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* LiDAR Selection */}
                <FormControl fullWidth size="small" sx={formStyle}>
                    <InputLabel id="lidar-select-label">LiDAR</InputLabel>
                    <Select
                        labelId="lidar-select-label"
                        id="lidar-select"
                        value={selectedLidarId}
                        label="LiDAR"
                        onChange={handleLidarChange}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    bgcolor: '#111111',
                                    borderRadius: 1,
                                    boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
                                }
                            }
                        }}
                    >
                        {availableLidars.map((lidar) => (
                            <MenuItem key={lidar.id} value={lidar.id}>
                                {lidar.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Sensor Type Selection */}
                <FormControl fullWidth size="small" sx={formStyle}>
                    <InputLabel id="sensor-type-select-label">Sensor Type Filter</InputLabel>
                    <Select
                        labelId="sensor-type-select-label"
                        id="sensor-type-select"
                        value={selectedSensorType}
                        label="Sensor Type Filter"
                        onChange={handleSensorTypeChange}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    bgcolor: '#111111',
                                    borderRadius: 1,
                                    boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
                                }
                            }
                        }}
                    >
                        {sensorTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                                {type}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Camera Selection */}
                <FormControl fullWidth size="small" sx={formStyle}>
                    <InputLabel id="camera-select-label">Camera</InputLabel>
                    <Select
                        labelId="camera-select-label"
                        id="camera-select"
                        value={selectedCameraId}
                        label="Camera"
                        onChange={handleCameraChange}
                        disabled={availableCameras.length === 0}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    bgcolor: '#111111',
                                    borderRadius: 1,
                                    boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
                                }
                            }
                        }}
                    >
                        {availableCameras.map((camera) => (
                            <MenuItem key={camera.id} value={camera.id}>
                                {`${camera.brand} ${camera.model} (${camera.megapixels}MP, ${camera.sensorType})`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Lens Selection */}
                <FormControl fullWidth size="small" disabled={!selectedCameraId || compatibleLenses.length === 0} sx={formStyle}>
                    <InputLabel id="lens-select-label">Lens</InputLabel>
                    <Select
                        labelId="lens-select-label"
                        id="lens-select"
                        value={selectedLensId}
                        label="Lens"
                        onChange={handleLensChange}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    bgcolor: '#111111',
                                    borderRadius: 1,
                                    boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
                                }
                            }
                        }}
                    >
                        {compatibleLenses.map((lens) => (
                            <MenuItem key={lens.id} value={lens.id}>
                                {`${lens.brand} ${lens.model} (Mount: ${lens.lensMount})`}
                            </MenuItem>
                        ))}
                    </Select>
                    {!selectedCameraId && <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Select a camera first</Typography>}
                    {selectedCameraId && compatibleLenses.length === 0 && <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>No compatible lenses found for this camera</Typography>}
                </FormControl>

                {/* DOF Information Section */}
                {dofInfo && (
                    <Box sx={{ mt: 2 }}>
                        <Divider sx={{ mb: 2, borderColor: 'rgba(70, 70, 70, 0.5)' }} />
                        <Typography variant="subtitle2" gutterBottom sx={{ color: '#4fc3f7', mb: 1, fontWeight: 600 }}>
                            Calculated DOF Values
                        </Typography>
                        <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1.5}>
                                <Box sx={{ flex: 1 }}>
                                    <DofInfoBox label="GSD" value={dofInfo.gsd} primary={true} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <DofInfoBox label="Total DOF" value={dofInfo.totalDOF} primary={true} />
                                </Box>
                            </Stack>
                            <Stack direction="row" spacing={1.5}>
                                <Box sx={{ flex: 1 }}>
                                    <DofInfoBox label="Near Focus" value={dofInfo.nearLimit} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <DofInfoBox label="Far Focus" value={dofInfo.farLimit} />
                                </Box>
                            </Stack>
                        </Stack>
                        
                        {/* Large Footprint Box - Enhanced for more prominence */}
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ 
                                color: '#4fc3f7', 
                                fontWeight: 600,
                                fontSize: '1rem'
                            }}>
                                Image Footprint
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    height: 'auto',
                                    textAlign: 'center',
                                    borderRadius: 1,
                                    backgroundColor: 'rgba(79, 195, 247, 0.1)',
                                    border: '1px solid rgba(79, 195, 247, 0.35)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                }}
                            >
                                <Box sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    mb: 2,
                                    pb: 1,
                                    borderBottom: '1px solid rgba(79, 195, 247, 0.15)'
                                }}>
                                    <Typography 
                                        sx={{ 
                                            fontFamily: '"Roboto Mono", monospace',
                                            color: 'rgba(255, 255, 255, 0.95)',
                                            fontSize: '1rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        {selectedCamera?.brand} {selectedCamera?.model}
                                    </Typography>
                                    <Typography 
                                        sx={{ 
                                            fontFamily: '"Roboto Mono", monospace',
                                            color: '#4fc3f7',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: '4px',
                                            bgcolor: 'rgba(79, 195, 247, 0.1)'
                                        }}
                                    >
                                        {dofInfo.megapixels}
                                    </Typography>
                                </Box>
                                
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    position: 'relative',
                                    my: 2,
                                    height: '130px', // Increased height
                                    border: '1px dashed rgba(79, 195, 247, 0.4)',
                                    borderRadius: 1,
                                    backgroundColor: 'rgba(79, 195, 247, 0.07)'
                                }}>
                                    {/* Width dimension */}
                                    <Box 
                                        sx={{ 
                                            position: 'absolute',
                                            top: 5,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            color: 'rgba(255, 255, 255, 0.85)',
                                            fontSize: '0.85rem',
                                            py: 0.5,
                                            px: 1,
                                            borderRadius: '4px',
                                            bgcolor: 'rgba(0, 0, 0, 0.3)'
                                        }}
                                    >
                                        {dofInfo.footprintWidth}
                                    </Box>
                                    
                                    {/* Height dimension - inside box */}
                                    <Box 
                                        sx={{ 
                                            position: 'absolute',
                                            left: 8,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'rgba(255, 255, 255, 0.85)',
                                            fontSize: '0.85rem',
                                            py: 0.5,
                                            px: 1,
                                            borderRadius: '4px',
                                            bgcolor: 'rgba(0, 0, 0, 0.3)',
                                            zIndex: 5
                                        }}
                                    >
                                        {dofInfo.footprintHeight}
                                    </Box>
                                    
                                    {/* Area text */}
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}>
                                        <Typography 
                                            sx={{ 
                                                fontFamily: '"Roboto Mono", monospace',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '0.85rem',
                                                mb: 0.5
                                            }}
                                        >
                                            Coverage Area
                                        </Typography>
                                        <Typography 
                                            sx={{ 
                                                fontFamily: '"Roboto Mono", monospace',
                                                color: '#4fc3f7',
                                                fontSize: '1.6rem',
                                                fontWeight: 700,
                                                textShadow: '0 0 10px rgba(79, 195, 247, 0.5)'
                                            }}
                                        >
                                            {dofInfo.footprintArea}
                                        </Typography>
                                    </Box>
                                </Box>
                                
                                <Box sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    mt: 2,
                                    pt: 1,
                                    borderTop: '1px solid rgba(79, 195, 247, 0.15)'
                                }}>
                                    <Typography 
                                        sx={{ 
                                            fontFamily: '"Roboto Mono", monospace',
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {selectedLens?.brand} {selectedLens?.model}
                                    </Typography>
                                    <Typography 
                                        sx={{ 
                                            fontFamily: '"Roboto Mono", monospace',
                                            color: '#4fc3f7',
                                            fontSize: '0.9rem',
                                            fontWeight: 500
                                        }}
                                    >
                                        {dofInfo.focalLength}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Box>
                    </Box>
                )}
            </Stack>

            {/* Apply button for drone and LiDAR changes */}
            <Box sx={{ pt: 3 }}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSaveHardware} 
                    disabled={!isSelectionComplete}
                    fullWidth
                    sx={{ 
                        py: 1.2,
                        backgroundColor: '#4fc3f7',
                        color: '#050505',
                        fontWeight: 600,
                        '&:hover': {
                            backgroundColor: '#81d4fa'
                        },
                        '&:disabled': {
                            backgroundColor: 'rgba(70, 70, 70, 0.3)',
                            color: 'rgba(255, 255, 255, 0.3)'
                        }
                    }}
                >
                    Apply Drone & LiDAR
                </Button>
            </Box>
        </Box>
    );
};

export default HardwareForm; 