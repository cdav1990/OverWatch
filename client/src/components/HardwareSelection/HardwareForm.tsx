import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Button, Stack } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { useMission } from '../../context/MissionContext';
import { cameras, lenses, droneModels, getCameraById, getLensById, getDroneModelById, getCompatibleLenses } from '../../utils/hardwareDatabase';
import { Camera, Lens, DroneModel, SensorType } from '../../types/hardware';

// Define the props if any specific inputs are needed from the modal
interface HardwareFormProps {
    onSaveSuccess?: () => void; // Add prop to call after saving
}

const HardwareForm: React.FC<HardwareFormProps> = ({ onSaveSuccess }) => {
    const { state: missionState, dispatch } = useMission();
    const hardwareFromContext = missionState.hardware; // Get context hardware state

    // --- Default IDs ---
    const defaultDroneId = 'freefly-alta-x';
    const defaultLidarId = 'ouster';
    const defaultCameraId = 'phase-one-ixm-100';
    const defaultLensId = 'phaseone-rsm-80mm';
    const defaultSensorType = 'Medium Format';

    // --- Local state for selections - Initialize with defaults or context values ---
    const [selectedDroneId, setSelectedDroneId] = useState<string>(
        () => hardwareFromContext?.drone || defaultDroneId
    );
    const [selectedLidarId, setSelectedLidarId] = useState<string>(
        () => hardwareFromContext?.lidar || defaultLidarId
    );
    const [selectedSensorType, setSelectedSensorType] = useState<SensorType | 'All'>(
        () => hardwareFromContext?.sensorType || defaultSensorType
    );
    const [selectedCameraId, setSelectedCameraId] = useState<string>(
        () => hardwareFromContext?.camera || defaultCameraId
    );
    const [selectedLensId, setSelectedLensId] = useState<string>(
        () => hardwareFromContext?.lens || defaultLensId
    );

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
        'All', 'Medium Format', 'Full Frame', 'APS-C', '1-inch', '1/2-inch'
    ];

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
                    const defaultLensIsCompatible = lenses.some(l => l.id === defaultLensId);
                    setSelectedLensId(defaultLensIsCompatible ? defaultLensId : lenses[0].id);
                }
             }
        }
    }, [selectedCameraId, hardwareFromContext?.camera, hardwareFromContext?.lens]); // Add deps
    
    // --- Handlers ---
    const handleDroneChange = (event: SelectChangeEvent<string>) => {
        setSelectedDroneId(event.target.value);
    };
    const handleLidarChange = (event: SelectChangeEvent<string>) => {
        setSelectedLidarId(event.target.value);
    };
    const handleSensorTypeChange = (event: SelectChangeEvent<SensorType | 'All'>) => {
        setSelectedSensorType(event.target.value as SensorType | 'All');
    };
    const handleCameraChange = (event: SelectChangeEvent<string>) => {
        setSelectedCameraId(event.target.value);
    };
    const handleLensChange = (event: SelectChangeEvent<string>) => {
        setSelectedLensId(event.target.value);
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

        dispatch({
            type: 'SET_HARDWARE',
            payload: {
                drone: selectedDroneId,
                lidar: selectedLidarId,
                camera: selectedCameraId,
                lens: selectedLensId,
                sensorType: selectedSensorType,
                // Store the full details as well
                droneDetails: currentSelectedDrone, // Use current details
                cameraDetails: currentSelectedCamera, // Use current details
                lensDetails: currentSelectedLens, // Use current details
                // Keep fStop and focusDistance if they exist in context, otherwise set defaults
                fStop: hardwareFromContext?.fStop || 5.6, // Use existing or default
                focusDistance: hardwareFromContext?.focusDistance || 10, // Use existing or default
            }
        });
        console.log("Hardware selection saved to context:", {
             droneId: selectedDroneId, lidarId: selectedLidarId, cameraId: selectedCameraId, lensId: selectedLensId, sensorType: selectedSensorType
        });
        // TODO: Show success notification
        if (onSaveSuccess) {
            onSaveSuccess(); // Call the callback to close the modal
        }
    };

    const isSelectionComplete = !!selectedDroneId && !!selectedCameraId && !!selectedLensId;

    return (
        <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                Select Hardware Components
            </Typography>
            <Stack spacing={2.5}> {/* Add spacing between form controls */}
                {/* Drone Selection */}
                <FormControl fullWidth size="small">
                    <InputLabel id="drone-select-label">Drone</InputLabel>
                    <Select
                        labelId="drone-select-label"
                        id="drone-select"
                        value={selectedDroneId}
                        label="Drone"
                        onChange={handleDroneChange}
                    >
                        {droneModels.map((drone) => (
                            <MenuItem key={drone.id} value={drone.id}>
                                {drone.brand} {drone.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* LiDAR Selection */}
                <FormControl fullWidth size="small">
                    <InputLabel id="lidar-select-label">LiDAR</InputLabel>
                    <Select
                        labelId="lidar-select-label"
                        id="lidar-select"
                        value={selectedLidarId}
                        label="LiDAR"
                        onChange={handleLidarChange}
                    >
                        {availableLidars.map((lidar) => (
                            <MenuItem key={lidar.id} value={lidar.id}>
                                {lidar.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Sensor Type Selection */}
                <FormControl fullWidth size="small">
                    <InputLabel id="sensor-type-select-label">Sensor Type Filter</InputLabel>
                    <Select
                        labelId="sensor-type-select-label"
                        id="sensor-type-select"
                        value={selectedSensorType}
                        label="Sensor Type Filter"
                        onChange={handleSensorTypeChange}
                    >
                        {sensorTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                                {type}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Camera Selection */}
                <FormControl fullWidth size="small">
                    <InputLabel id="camera-select-label">Camera</InputLabel>
                    <Select
                        labelId="camera-select-label"
                        id="camera-select"
                        value={selectedCameraId}
                        label="Camera"
                        onChange={handleCameraChange}
                        disabled={availableCameras.length === 0}
                    >
                        {availableCameras.map((camera) => (
                            <MenuItem key={camera.id} value={camera.id}>
                                {`${camera.brand} ${camera.model} (${camera.megapixels}MP, ${camera.sensorType})`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Lens Selection */}
                <FormControl fullWidth size="small" disabled={!selectedCameraId || compatibleLenses.length === 0}>
                    <InputLabel id="lens-select-label">Lens</InputLabel>
                    <Select
                        labelId="lens-select-label"
                        id="lens-select"
                        value={selectedLensId}
                        label="Lens"
                        onChange={handleLensChange}
                    >
                        {compatibleLenses.map((lens) => (
                            <MenuItem key={lens.id} value={lens.id}>
                                {`${lens.brand} ${lens.model} (Mount: ${lens.lensMount})`}
                            </MenuItem>
                        ))}
                    </Select>
                    {!selectedCameraId && <Typography variant="caption" color="textSecondary">Select a camera first</Typography>}
                    {selectedCameraId && compatibleLenses.length === 0 && <Typography variant="caption" color="textSecondary">No compatible lenses found for this camera</Typography>}
                </FormControl>

                {/* Save Button */}
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSaveHardware} 
                    disabled={!isSelectionComplete}
                    sx={{ mt: 2 }} // Add some margin top
                >
                    Confirm Selection
                </Button>
            </Stack>
        </Box>
    );
};

export default HardwareForm; 