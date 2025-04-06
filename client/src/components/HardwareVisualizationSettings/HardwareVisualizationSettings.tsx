import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Stack, 
    FormControl, 
    InputLabel, 
    Select, 
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
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LensIcon from '@mui/icons-material/Lens';
import TuneIcon from '@mui/icons-material/Tune';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';

import { useMission } from '../../context/MissionContext';
import { Camera, Lens } from '../../types/hardware';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';
import { getCameraById, getLensById, getLensFStops, getCompatibleLenses } from '../../utils/hardwareDatabase';

// Styled components that match DronePositionControlPanel
const PanelContainer = styled(Paper)(({ theme }) => ({
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '350px',
    padding: theme.spacing(1.5),
    backgroundColor: 'rgba(21, 21, 21, 0.97)',
    color: theme.palette.common.white,
    borderRadius: '4px',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
    zIndex: 1300, // Ensure it's above other elements like Cesium/3D viewer controls
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
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

const ValueDisplay = styled(Box)(({ theme }) => ({
    minWidth: '70px',
    textAlign: 'right',
    padding: '3px 6px',
    borderRadius: '2px',
    fontSize: '0.8rem',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#4fc3f7'
}));

const StyledSlider = styled(Slider)(({ theme }) => ({
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

const StyledSwitch = styled(Switch)(({ theme }) => ({
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

const StyledSelect = styled(Select)(({ theme }) => ({
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
    isOpen: boolean;
    onClose: () => void;
    onVisualizationSettingsChange?: (settings: {
        showNearFocusPlane: boolean;
        showFarFocusPlane: boolean;
        showFocusPlaneInfo: boolean;
        showDOFInfo: boolean;
    }) => void;
}

const HardwareVisualizationSettings: React.FC<HardwareVisualizationSettingsProps> = ({ 
    isOpen,
    onClose,
    onVisualizationSettingsChange
}) => {
    const { state, dispatch } = useMission();
    const { hardware, isCameraFrustumVisible } = state;

    // Visualization settings tabs
    const [activeTab, setActiveTab] = useState<'hardware' | 'visualization' | 'visibility'>('hardware');
    
    // Additional visualization settings (not in context)
    const [visualizationSettings, setVisualizationSettings] = useState({
        showNearFocusPlane: true,
        showFarFocusPlane: false,
        showFocusPlaneInfo: true,
        showDOFInfo: true
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
    const handleCameraChange = (event: React.ChangeEvent<{ value: unknown }>) => {
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
    const handleLensChange = (event: React.ChangeEvent<{ value: unknown }>) => {
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
    const handleFStopChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        const fStop = Number(event.target.value);
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

    // Toggle camera frustum visibility
    const handleFrustumVisibilityToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ type: 'TOGGLE_CAMERA_FRUSTUM_VISIBILITY' });
    };

    // Toggle visibility of visualization elements
    const handleVisualizationSettingChange = (setting: keyof typeof visualizationSettings) => {
        setVisualizationSettings(prev => {
            const newSettings = {
                ...prev,
                [setting]: !prev[setting]
            };
            
            // Call the callback if provided
            if (onVisualizationSettingsChange) {
                onVisualizationSettingsChange(newSettings);
            }
            
            return newSettings;
        });
    };

    // Only render if panel is open
    if (!isOpen) return null;

    return (
        <PanelContainer>
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

            {/* Camera & Lens Selection */}
            <SectionTitle>Camera & Lens</SectionTitle>
            <ControlRow>
                <SliderLabel>Camera</SliderLabel>
                <Select
                    fullWidth
                    size="small"
                    value={hardware?.camera || ''}
                    onChange={handleCameraChange}
                    sx={{
                        fontSize: '0.85rem',
                        color: 'white',
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
                    }}
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
                </Select>
            </ControlRow>

            <ControlRow>
                <SliderLabel>Lens</SliderLabel>
                <Select
                    fullWidth
                    size="small"
                    value={hardware?.lens || ''}
                    onChange={handleLensChange}
                    disabled={!hardware?.camera}
                    sx={{
                        fontSize: '0.85rem',
                        color: 'white',
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
                    }}
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
                </Select>
            </ControlRow>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mt: 1, mb: 1 }} />

            {/* Camera Settings */}
            <SectionTitle>Camera Settings</SectionTitle>
            <ControlRow>
                <SliderLabel>Aperture (f-stop)</SliderLabel>
                <Select
                    fullWidth
                    size="small"
                    value={hardware?.fStop || ''}
                    onChange={handleFStopChange}
                    displayEmpty
                    disabled={!hardware?.lens}
                    sx={{
                        fontSize: '0.85rem',
                        color: 'white',
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
                    }}
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
                        <MenuItem key={fStop} value={fStop}>
                            f/{fStop}
                        </MenuItem>
                    ))}
                </Select>
            </ControlRow>

            <ControlRow>
                <SliderLabel>Focus Distance</SliderLabel>
                <StyledSlider 
                    value={hardware?.focusDistance ? metersToFeet(hardware.focusDistance) : 20}
                    onChange={handleFocusDistanceChange}
                    min={5}
                    max={1000}
                    step={10}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value} ft`}
                    disabled={!hardware?.lens}
                />
                <ValueDisplay>
                    {hardware?.focusDistance ? metersToFeet(hardware.focusDistance).toFixed(1) : 0} ft
                </ValueDisplay>
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
            <SectionTitle>Depth of Field Settings</SectionTitle>
            <ControlRow>
                <FormControlLabel
                    control={
                        <StyledSwitch 
                            checked={visualizationSettings.showNearFocusPlane}
                            onChange={() => handleVisualizationSettingChange('showNearFocusPlane')}
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
                            onChange={() => handleVisualizationSettingChange('showFarFocusPlane')}
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
                            checked={visualizationSettings.showDOFInfo}
                            onChange={() => handleVisualizationSettingChange('showDOFInfo')}
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
                            checked={visualizationSettings.showFocusPlaneInfo}
                            onChange={() => handleVisualizationSettingChange('showFocusPlaneInfo')}
                            disabled={!isCameraFrustumVisible}
                        />
                    }
                    label="Show Focus Plane Details"
                    sx={{ fontSize: '0.85rem', color: '#ddd' }}
                />
            </ControlRow>
        </PanelContainer>
    );
};

export default HardwareVisualizationSettings; 