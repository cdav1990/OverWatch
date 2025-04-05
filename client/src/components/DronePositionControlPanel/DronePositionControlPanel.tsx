import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Slider,
    Switch,
    FormControlLabel,
    Select,
    MenuItem,
    TextField,
    Paper,
    Divider,
    SelectChangeEvent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LocalCoord } from '../../types/mission'; // Assuming LocalCoord is used for position
import { styled } from '@mui/material/styles';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations'; // <-- Import conversion functions

// Placeholder types - replace with actual types if available
type CameraSettings = {
    fStop: number | string; // Can be number or string like "8"
    focusDistance: number;
};

// Props definition
interface DronePositionControlPanelProps {
    isOpen: boolean;
    onClose: () => void;
    initialPosition: LocalCoord;
    onPositionChange: (newPosition: LocalCoord) => void;
    initialCameraFollow: boolean;
    onCameraFollowChange: (follows: boolean) => void;
    initialCameraSettings: CameraSettings;
    onCameraSettingsChange: (settings: CameraSettings) => void;
    // Add any other necessary props, e.g., min/max ranges for sliders
}

// Styled components for consistent spacing and appearance
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

const StyledSelect = styled(Select<string | number>)(({ theme }) => ({
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

const DronePositionControlPanel: React.FC<DronePositionControlPanelProps> = ({
    isOpen,
    onClose,
    initialPosition,
    onPositionChange,
    initialCameraFollow,
    onCameraFollowChange,
    initialCameraSettings,
    onCameraSettingsChange,
}) => {
    const [position, setPosition] = useState<LocalCoord>(initialPosition);
    const [cameraFollows, setCameraFollows] = useState(initialCameraFollow);
    const [cameraSettings, setCameraSettings] = useState<CameraSettings>(initialCameraSettings);

    // Update internal state if initial props change
    useEffect(() => {
        setPosition(initialPosition);
    }, [initialPosition]);

    useEffect(() => {
        setCameraFollows(initialCameraFollow);
    }, [initialCameraFollow]);

    useEffect(() => {
        // Initialize camera settings, converting focus distance from meters (assumed internal) to feet for display
        setCameraSettings({
            ...initialCameraSettings,
            focusDistance: metersToFeet(initialCameraSettings.focusDistance)
        });
    }, [initialCameraSettings]);

    // Handlers to update internal state and call parent callbacks
    const handleSliderChange = (axis: keyof LocalCoord, value: number | number[]) => {
        const newValue = Array.isArray(value) ? value[0] : value;
        // Sliders operate on meter values internally
        const updatedPosition = { ...position, [axis]: newValue };
        setPosition(updatedPosition); 
        onPositionChange(updatedPosition); // Notify parent with meter values
    };

    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        setCameraFollows(checked);
        onCameraFollowChange(checked);
    };

    const handleCameraSettingChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<number | string>,
        field: keyof CameraSettings
    ) => {
        const rawValue = event.target.value;
        let updatedSettings: CameraSettings;

        if (field === 'focusDistance') {
            const focusFeet = Number(rawValue);
            // Update local state with feet value for display consistency
            updatedSettings = { ...cameraSettings, focusDistance: focusFeet };
            setCameraSettings(updatedSettings);
            // Convert back to meters before notifying parent
            const focusMeters = feetToMeters(focusFeet);
            onCameraSettingsChange({ ...cameraSettings, focusDistance: focusMeters });
        } else { // Handle fStop
            updatedSettings = { ...cameraSettings, fStop: rawValue };
            setCameraSettings(updatedSettings);
            // Notify parent directly (fStop doesn't need unit conversion)
            onCameraSettingsChange(updatedSettings);
        }
    };

    if (!isOpen) {
        return null;
    }

    // Define reasonable min/max for sliders in METERS (adjust as needed)
    const positionRange = { min: -100, max: 100 }; // meters
    const heightRange = { min: 0, max: 100 }; // meters (Z - Up)

    return (
        <PanelContainer>
            <Header>
                <Typography 
                    variant="subtitle1" 
                    sx={{
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase'
                    }}
                >
                    Drone Position Control
                </Typography>
                <IconButton 
                    onClick={onClose} 
                    size="small" 
                    sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Header>

            {/* Position Controls - Sliders control METERS, display FEET */}
            <SectionTitle variant="subtitle2">Position Controls</SectionTitle>
            <ControlRow>
                <SliderLabel>X Position (East/West)</SliderLabel>
                <StyledSlider
                    value={position.x} // Meter value
                    onChange={(_, value) => handleSliderChange('x', value)}
                    aria-labelledby="x-position-slider"
                    min={positionRange.min}
                    max={positionRange.max}
                    step={0.1} // Meter step
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{metersToFeet(position.x).toFixed(2)}ft</ValueDisplay> {/* Display feet */}
            </ControlRow>

            <ControlRow>
                <SliderLabel>Y Position (North/South)</SliderLabel>
                <StyledSlider
                    value={position.y} // Meter value
                    onChange={(_, value) => handleSliderChange('y', value)}
                    aria-labelledby="y-position-slider"
                    min={positionRange.min}
                    max={positionRange.max}
                    step={0.1} // Meter step
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{metersToFeet(position.y).toFixed(2)}ft</ValueDisplay> {/* Display feet */}
            </ControlRow>

            <ControlRow>
                <SliderLabel>Height (Z)</SliderLabel>
                <StyledSlider
                    value={position.z} // Meter value
                    onChange={(_, value) => handleSliderChange('z', value)}
                    aria-labelledby="z-position-slider"
                    min={heightRange.min}
                    max={heightRange.max}
                    step={0.1} // Meter step
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{metersToFeet(position.z).toFixed(2)}ft</ValueDisplay> {/* Display feet */}
            </ControlRow>

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Toggle Controls */}
            <SectionTitle variant="subtitle2">Camera Settings</SectionTitle>
            <FormControlLabel
                control={
                    <StyledSwitch
                        checked={cameraFollows}
                        onChange={(e, checked) => handleSwitchChange(e, checked)}
                        name="cameraFollows"
                        size="small"
                    />
                }
                label={
                    <Typography sx={{ fontSize: '0.85rem', color: '#ddd' }}>
                        Camera Follows Drone
                    </Typography>
                }
                sx={{ marginLeft: 0, marginBottom: 1 }}
            />
            <Typography 
                variant="caption" 
                sx={{ 
                    color: 'rgba(255, 255, 255, 0.5)', 
                    pl: 4, 
                    fontSize: '0.75rem',
                    display: 'block',
                    mb: 1 
                }}
            >
                Centers view on drone but allows manual camera control
            </Typography>

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Camera Settings */}
            <SectionTitle variant="subtitle2">Camera Parameters</SectionTitle>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography 
                        variant="caption" 
                        display="block" 
                        gutterBottom 
                        sx={{ 
                            fontSize: '0.75rem', 
                            color: '#ddd',
                            mb: 0.5
                        }}
                    >
                        F-Stop
                    </Typography>
                    <StyledSelect
                        value={cameraSettings.fStop}
                        onChange={(e) => handleCameraSettingChange(e, 'fStop')}
                        size="small"
                        fullWidth
                        MenuProps={{ 
                            PaperProps: { 
                                sx: { 
                                    backgroundColor: 'rgba(21, 21, 21, 0.97)', 
                                    color: 'white',
                                    '& .MuiMenuItem-root': {
                                        fontSize: '0.85rem',
                                    },
                                    '& .MuiMenuItem-root:hover': {
                                        backgroundColor: 'rgba(60, 60, 60, 0.9)',
                                    }
                                } 
                            } 
                        }}
                    >
                        {/* Placeholder values - should be dynamic based on available lens */}
                        <MenuItem value={1.4}>f/1.4</MenuItem>
                        <MenuItem value={2.0}>f/2.0</MenuItem>
                        <MenuItem value={2.8}>f/2.8</MenuItem>
                        <MenuItem value={4.0}>f/4.0</MenuItem>
                        <MenuItem value={5.6}>f/5.6</MenuItem>
                        <MenuItem value={8}>f/8</MenuItem>
                        <MenuItem value={11}>f/11</MenuItem>
                        <MenuItem value={16}>f/16</MenuItem>
                        <MenuItem value={22}>f/22</MenuItem>
                    </StyledSelect>
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography 
                        variant="caption" 
                        display="block" 
                        gutterBottom 
                        sx={{ 
                            fontSize: '0.75rem', 
                            color: '#ddd',
                            mb: 0.5
                        }}
                    >
                        Focus Distance (ft)
                    </Typography>
                    <TextField
                        value={cameraSettings.focusDistance.toFixed(1)} // Display feet from local state
                        onChange={(e) => handleCameraSettingChange(e, 'focusDistance')}
                        type="number"
                        size="small"
                        fullWidth
                        InputProps={{
                            inputProps: { min: 0.3, step: 0.1 }, // Example constraints in FEET (0.3ft ~ 0.1m)
                            sx: { 
                                color: 'white',
                                fontSize: '0.85rem',
                            }
                        }}
                        sx={{ 
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(40, 40, 40, 0.9)',
                                '& fieldset': { 
                                    borderColor: 'rgba(255, 255, 255, 0.2)' 
                                },
                                '&:hover fieldset': { 
                                    borderColor: 'rgba(255, 255, 255, 0.3)' 
                                },
                                '&.Mui-focused fieldset': { 
                                    borderColor: '#4fc3f7' 
                                }, 
                            },
                        }}
                    />
                </Box>
            </Box>
        </PanelContainer>
    );
};

export default DronePositionControlPanel; 