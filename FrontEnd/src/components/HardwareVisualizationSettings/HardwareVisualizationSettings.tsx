import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Select as MuiSelect,
    MenuItem, 
    Slider, 
    Switch, 
    FormControlLabel,
    Paper,
    Divider,
    IconButton,
    SelectChangeEvent
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

import { useMission } from '../../context/MissionContext';
import { useThreeJSState } from '../../context/ThreeJSStateContext';
import { Camera, Lens } from '../../types/hardware';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';
import { getCameraById, getLensById, getLensFStops, getCompatibleLenses } from '../../utils/hardwareDatabase';

// Styled components that match DronePositionControlPanel
const PanelContainer = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(1.5),
    backgroundColor: 'transparent',
    color: theme.palette.common.white,
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    width: '100%'
}));

const Header = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
}));

const ControlRow = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
    gap: theme.spacing(1.5),
}));

const SliderLabel = styled(Typography)({
    minWidth: '130px',
    fontSize: '0.85rem',
    color: '#ddd',
    fontWeight: 400,
});

const StyledSlider = styled(Slider)(() => ({
    color: '#4fc3f7',
    height: 4,
    flexGrow: 1,
    '& .MuiSlider-rail': {
        opacity: 0.4,
        backgroundColor: '#444',
    },
    '& .MuiSlider-track': {
        border: 'none',
        height: 4,
    },
    '& .MuiSlider-thumb': {
        height: 14,
        width: 14,
        backgroundColor: '#4fc3f7',
        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
            boxShadow: '0 0 0 8px rgba(79, 195, 247, 0.16)',
        },
    },
    '& .MuiSlider-valueLabel': {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        fontSize: '0.7rem',
        padding: '2px 4px',
    },
}));

const StyledSwitch = styled(Switch)(() => ({
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: '#4fc3f7',
      '& + .MuiSwitch-track': {
        backgroundColor: 'rgba(79, 195, 247, 0.6)',
      },
    },
    '& .MuiSwitch-switchBase': {
      color: '#9e9e9e',
    },
    '& .MuiSwitch-track': {
      backgroundColor: 'rgba(158, 158, 158, 0.6)',
    },
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    fontWeight: 500,
    fontSize: '0.85rem',
    color: theme.palette.grey[300],
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
}));

// Restore StyledSelect styled component using MuiSelect alias
const StyledSelect = styled(MuiSelect)(({ theme }) => ({
    fontSize: '0.85rem',
    color: theme.palette.common.white,
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: '#4fc3f7',
    },
    '& .MuiSelect-icon': {
        color: 'rgba(255, 255, 255, 0.5)',
    },
}));

// Default camera and lens IDs
const DEFAULT_CAMERA_ID = 'phase-one-ixm-100';
const DEFAULT_LENS_ID = 'phaseone-rsm-80mm';

interface HardwareVisualizationSettingsProps {
    // Make isOpen and onClose optional as they are not needed when embedded in a tab
    // isOpen?: boolean;
    onClose?: () => void;
    onVisualizationSettingsChange?: (settings: {
        showNearFocusPlane: boolean;
        showFarFocusPlane: boolean;
        showFocusPlaneInfo: boolean;
        showDOFInfo: boolean;
        showFootprintInfo: boolean;
        showFocusPlaneLabels: boolean;
    }) => void;
}

const HardwareVisualizationSettings: React.FC<HardwareVisualizationSettingsProps> = ({ 
    // isOpen,
    onClose,
    onVisualizationSettingsChange
}) => {
    const { state, dispatch } = useMission();
    const { forceRerender } = useThreeJSState();
    const { hardware, isCameraFrustumVisible } = state;

    // Additional visualization settings (not in context)
    const [visualizationSettings, setVisualizationSettings] = useState({
        showNearFocusPlane: true,
        showFarFocusPlane: false,
        showFocusPlaneInfo: false,
        showDOFInfo: false,
        showFootprintInfo: false,
        showFocusPlaneLabels: false
    });

    // Get available cameras and lenses
    const [availableCameras, setAvailableCameras] = useState<Camera[]>([]);
    const [availableLenses, setAvailableLenses] = useState<Lens[]>([]);
    
    // Initialize state with current context values or defaults
    useEffect(() => {
        // Fetch available cameras 
        try {
            // This would normally come from an API or a more complete local database
            // For now, we'll use placeholder data based on what's set in the context
            if (hardware?.cameraDetails) {
                setAvailableCameras([hardware.cameraDetails]);
            } else {
                // Get default camera
                const defaultCamera = getCameraById(DEFAULT_CAMERA_ID);
                if (defaultCamera) {
                    setAvailableCameras([defaultCamera]);
                    
                    // If no hardware set in context, initialize with defaults
                    if (!hardware) {
                        const defaultLens = getLensById(DEFAULT_LENS_ID);
                        const fStops = defaultLens ? getLensFStops(defaultLens) : [5.6];
                        const defaultFStop = fStops.length > 0 ? fStops[0] : 5.6;
                        
                        // Set default hardware in context
                        dispatch({
                            type: 'SET_HARDWARE',
                            payload: {
                                camera: DEFAULT_CAMERA_ID,
                                lens: DEFAULT_LENS_ID,
                                cameraDetails: defaultCamera,
                                lensDetails: defaultLens,
                                fStop: defaultFStop,
                                focusDistance: feetToMeters(20), // 20 feet default
                                availableFStops: fStops
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error initializing camera data:", error);
        }
    }, [hardware, dispatch]);

    // Update lenses when camera changes
    useEffect(() => {
        if (hardware?.cameraDetails) {
            const compatibleLenses = getCompatibleLenses(hardware.camera);
            setAvailableLenses(compatibleLenses);
        } else {
            // Fallback to default lens
            const defaultLens = getLensById(DEFAULT_LENS_ID);
            if (defaultLens) {
                setAvailableLenses([defaultLens]);
            }
        }
    }, [hardware?.camera, hardware?.cameraDetails]);

    // Handle camera selection - fix type issues
    const handleCameraChange = (event: SelectChangeEvent<unknown>) => {
        const cameraId = event.target.value as string;
        const cameraDetails = getCameraById(cameraId);
        if (cameraDetails) {
            dispatch({
                type: 'UPDATE_HARDWARE_FIELD',
                payload: { field: 'camera', value: cameraId }
            });
            dispatch({
                type: 'UPDATE_HARDWARE_FIELD',
                payload: { field: 'cameraDetails', value: cameraDetails }
            });
            
            // Reset lens to null if not compatible with new camera
            if (hardware?.lens) {
                const compatibleLenses = getCompatibleLenses(cameraId);
                const isCurrentLensCompatible = compatibleLenses.some(l => l.id === hardware.lens);
                
                if (!isCurrentLensCompatible && compatibleLenses.length > 0) {
                    // Set to first compatible lens
                    const newLens = compatibleLenses[0];
                    dispatch({
                        type: 'UPDATE_HARDWARE_FIELD',
                        payload: { field: 'lens', value: newLens.id }
                    });
                    dispatch({
                        type: 'UPDATE_HARDWARE_FIELD',
                        payload: { field: 'lensDetails', value: newLens }
                    });
                    
                    // Update f-stops
                    const fStops = getLensFStops(newLens);
                    dispatch({
                        type: 'UPDATE_HARDWARE_FIELD',
                        payload: { field: 'availableFStops', value: fStops }
                    });
                    
                    // Set default f-stop
                    if (fStops.length > 0 && (!hardware.fStop || !fStops.includes(hardware.fStop))) {
                        dispatch({
                            type: 'UPDATE_HARDWARE_FIELD',
                            payload: { field: 'fStop', value: fStops[0] }
                        });
                    }
                }
            }
        }
    };

    // Handle lens selection - fix type issues
    const handleLensChange = (event: SelectChangeEvent<unknown>) => {
        const lensId = event.target.value as string;
        const lensDetails = getLensById(lensId);
        if (lensDetails) {
            dispatch({
                type: 'UPDATE_HARDWARE_FIELD',
                payload: { field: 'lens', value: lensId }
            });
            dispatch({
                type: 'UPDATE_HARDWARE_FIELD',
                payload: { field: 'lensDetails', value: lensDetails }
            });
            
            // Update f-stops
            const fStops = getLensFStops(lensDetails);
            dispatch({
                type: 'UPDATE_HARDWARE_FIELD',
                payload: { field: 'availableFStops', value: fStops }
            });
            
            // Set default f-stop
            if (fStops.length > 0 && (!hardware?.fStop || !fStops.includes(hardware.fStop))) {
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { field: 'fStop', value: fStops[0] }
                });
            }
        }
    };

    // Handle f-stop selection - fix type issues
    const handleFStopChange = (event: SelectChangeEvent<unknown>) => {
        const fStopValue = event.target.value as string;
        const fStop = Number(fStopValue);
        dispatch({
            type: 'UPDATE_HARDWARE_FIELD',
            payload: { field: 'fStop', value: fStop }
        });
    };

    // Handle focus distance change (in feet, convert to meters for storage)
    const handleFocusDistanceChange = (event: Event, value: number | number[]) => {
        const focusDistanceFeet = Array.isArray(value) ? value[0] : value;
        const focusDistanceMeters = feetToMeters(focusDistanceFeet);
        
        dispatch({
            type: 'UPDATE_HARDWARE_FIELD',
            payload: { field: 'focusDistance', value: focusDistanceMeters }
        });
    };

    // Handle focus distance input change
    const handleFocusDistanceInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let value = parseInt(event.target.value);
        
        // Validate input (1-400 feet)
        if (!isNaN(value)) {
            if (value < 1) value = 1;
            if (value > 400) value = 400;
            
            const focusDistanceMeters = feetToMeters(value);
            
            dispatch({
                type: 'UPDATE_HARDWARE_FIELD',
                payload: { field: 'focusDistance', value: focusDistanceMeters }
            });
        }
    };

    // Toggle camera frustum visibility
    const handleFrustumVisibilityToggle = () => {
        dispatch({ type: 'TOGGLE_CAMERA_FRUSTUM_VISIBILITY' });
    };

    // Update the handler for visualization settings
    const handleVisualizationSettingChange = (setting: keyof typeof visualizationSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSettings = {
            ...visualizationSettings,
            [setting]: event.target.checked
        };
        
        setVisualizationSettings(newSettings);
        
        if (onVisualizationSettingsChange) {
            onVisualizationSettingsChange(newSettings);
            // Force a re-render in Three.js using our shared context
            forceRerender();
        }
    };

    return (
        <PanelContainer>
            {onClose && (
                <Header>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 500, fontSize: '1rem' }}>
                        Camera Settings
                    </Typography>
                    <IconButton 
                        size="small" 
                        onClick={onClose}
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Header>
            )}
            {!onClose && (
                 <Typography variant="h6" component="h2" sx={{ fontWeight: 500, fontSize: '1rem', mb: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', pb: 1 }}>
                    Hardware Visualization
                 </Typography>
            )}

            {/* Camera & Lens Selection */}
            <SectionTitle>Camera & Lens</SectionTitle>
            <ControlRow>
                <SliderLabel>Camera</SliderLabel>
                <StyledSelect
                    fullWidth
                    size="small"
                    value={hardware?.camera || ''}
                    onChange={handleCameraChange}
                    MenuProps={{
                        PaperProps: {
                            sx: {
                                bgcolor: 'rgba(30, 30, 30, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                '& .MuiMenuItem-root': {
                                    fontSize: '0.85rem',
                                    color: 'rgba(255, 255, 255, 0.9)'
                                }
                            }
                        }
                    }}
                >
                    {availableCameras.map(camera => (
                        <MenuItem key={camera.id} value={camera.id}>
                            {camera.brand} {camera.model}
                        </MenuItem>
                    ))}
                </StyledSelect>
            </ControlRow>

            <ControlRow>
                <SliderLabel>Lens</SliderLabel>
                <StyledSelect
                    fullWidth
                    size="small"
                    value={hardware?.lens || ''}
                    onChange={handleLensChange}
                    disabled={!hardware?.camera}
                    MenuProps={{
                        PaperProps: {
                            sx: {
                                bgcolor: 'rgba(30, 30, 30, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                '& .MuiMenuItem-root': {
                                    fontSize: '0.85rem',
                                    color: 'rgba(255, 255, 255, 0.9)'
                                }
                            }
                        }
                    }}
                >
                    {availableLenses.map(lens => (
                        <MenuItem key={lens.id} value={lens.id}>
                            {lens.brand} {lens.model}
                        </MenuItem>
                    ))}
                </StyledSelect>
            </ControlRow>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mt: 1, mb: 1 }} />

            {/* Camera Settings */}
            <SectionTitle>Camera Settings</SectionTitle>
            <ControlRow>
                <SliderLabel>Aperture (f-stop)</SliderLabel>
                <StyledSelect
                    fullWidth
                    size="small"
                    value={String(hardware?.fStop || '')}
                    onChange={handleFStopChange}
                    displayEmpty
                    disabled={!hardware?.lens}
                    MenuProps={{
                        PaperProps: {
                            sx: {
                                bgcolor: 'rgba(30, 30, 30, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                '& .MuiMenuItem-root': {
                                    fontSize: '0.85rem',
                                    color: 'rgba(255, 255, 255, 0.9)'
                                }
                            }
                        }
                    }}
                >
                    {hardware?.availableFStops?.map(fStop => (
                        <MenuItem key={fStop} value={String(fStop)}>
                            f/{fStop}
                        </MenuItem>
                    ))}
                </StyledSelect>
            </ControlRow>

            <ControlRow>
                <SliderLabel>Focus Distance</SliderLabel>
                <StyledSlider 
                    value={hardware?.focusDistance ? metersToFeet(hardware.focusDistance) : 20}
                    onChange={handleFocusDistanceChange}
                    min={1}
                    max={400}
                    step={1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value} ft`}
                    disabled={!hardware?.lens}
                    sx={{ flexGrow: 0.7 }}
                />
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    width: '120px',
                    justifyContent: 'flex-end'
                }}>
                    <input
                        type="number"
                        value={hardware?.focusDistance ? Math.round(metersToFeet(hardware.focusDistance)) : 20}
                        onChange={handleFocusDistanceInputChange}
                        disabled={!hardware?.lens}
                        min={1}
                        max={400}
                        style={{
                            width: '60px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(40, 40, 40, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '4px',
                            color: '#4fc3f7',
                            fontSize: '0.9rem',
                            textAlign: 'right'
                        }}
                    />
                    <Typography sx={{ color: '#ddd', fontSize: '0.8rem' }}>ft</Typography>
                </Box>
            </ControlRow>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mt: 1, mb: 1 }} />

            {/* Visibility Options */}
            <SectionTitle>Visibility Options</SectionTitle>
            <ControlRow>
                <FormControlLabel
                    control={
                        <StyledSwitch 
                            checked={isCameraFrustumVisible}
                            onChange={handleFrustumVisibilityToggle}
                        />
                    }
                    label="Show Camera Frustum"
                    sx={{ fontSize: '0.85rem', color: '#ddd' }}
                />
            </ControlRow>

            {/* Depth of Field Visualization */}
            <SectionTitle>Visualization Planes</SectionTitle>
            <ControlRow>
                <FormControlLabel
                    control={
                        <StyledSwitch 
                            checked={visualizationSettings.showNearFocusPlane}
                            onChange={handleVisualizationSettingChange('showNearFocusPlane')}
                            disabled={!isCameraFrustumVisible}
                        />
                    }
                    label="Show Near Focus Plane"
                    sx={{ fontSize: '0.85rem', color: '#ddd' }}
                />
            </ControlRow>
            <ControlRow>
                <FormControlLabel
                    control={
                        <StyledSwitch 
                            checked={visualizationSettings.showFarFocusPlane}
                            onChange={handleVisualizationSettingChange('showFarFocusPlane')}
                            disabled={!isCameraFrustumVisible}
                        />
                    }
                    label="Show Far Focus Plane"
                    sx={{ fontSize: '0.85rem', color: '#ddd' }}
                />
            </ControlRow>
            <ControlRow>
                <FormControlLabel
                    control={
                        <StyledSwitch 
                            checked={visualizationSettings.showFocusPlaneLabels}
                            onChange={handleVisualizationSettingChange('showFocusPlaneLabels')}
                            disabled={!isCameraFrustumVisible}
                        />
                    }
                    label="Show Focus Plane Labels"
                    sx={{ fontSize: '0.85rem', color: '#ddd' }}
                />
            </ControlRow>
            
            <SectionTitle>Information Display</SectionTitle>
            <ControlRow>
                <FormControlLabel
                    control={
                        <StyledSwitch 
                            checked={visualizationSettings.showFocusPlaneInfo}
                            onChange={handleVisualizationSettingChange('showFocusPlaneInfo')}
                            disabled={!isCameraFrustumVisible}
                        />
                    }
                    label="Show Focus Plane Details"
                    sx={{ fontSize: '0.85rem', color: '#ddd' }}
                />
            </ControlRow>
            <ControlRow>
                <FormControlLabel
                    control={
                        <StyledSwitch 
                            checked={visualizationSettings.showDOFInfo}
                            onChange={handleVisualizationSettingChange('showDOFInfo')}
                            disabled={!isCameraFrustumVisible}
                        />
                    }
                    label="Show DOF Information"
                    sx={{ fontSize: '0.85rem', color: '#ddd' }}
                />
            </ControlRow>
            <ControlRow>
                <FormControlLabel
                    control={
                        <StyledSwitch 
                            checked={visualizationSettings.showFootprintInfo}
                            onChange={handleVisualizationSettingChange('showFootprintInfo')}
                            disabled={!isCameraFrustumVisible}
                        />
                    }
                    label="Show Image Footprint Info"
                    sx={{ fontSize: '0.85rem', color: '#ddd' }}
                />
            </ControlRow>
        </PanelContainer>
    );
};

export default HardwareVisualizationSettings; 