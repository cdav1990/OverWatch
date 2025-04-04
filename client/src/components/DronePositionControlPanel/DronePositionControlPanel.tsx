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
    padding: theme.spacing(2),
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // Dark semi-transparent background
    color: theme.palette.common.white,
    borderRadius: '8px',
    boxShadow: theme.shadows[5],
    zIndex: 1300, // Ensure it's above other elements like Cesium/3D viewer controls
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
}));

const Header = styled(Box)({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
});

const ControlRow = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
});

const SliderLabel = styled(Typography)({
    minWidth: '150px', // Ensure labels align
    fontSize: '0.9rem',
});

const ValueDisplay = styled(Box)({
    minWidth: '60px', // Increased minWidth for more space
    textAlign: 'right',
    padding: '4px 8px',
    backgroundColor: 'rgba(80, 80, 80, 0.7)',
    borderRadius: '4px',
    fontSize: '0.85rem',
});

const StyledSlider = styled(Slider)(({ theme }) => ({
    color: theme.palette.info.light, // Use a theme color
    flexGrow: 1,
    '& .MuiSlider-thumb': {
        backgroundColor: theme.palette.info.main,
    },
    '& .MuiSlider-valueLabel': {
        backgroundColor: theme.palette.grey[700],
    },
}));

const StyledSwitch = styled(Switch)(({ theme }) => ({
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: theme.palette.warning.main, // Use a theme color (e.g., yellow/amber)
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.warning.main,
      },
    },
    // Adjust track color if needed for unchecked state
  }));

const SectionTitle = styled(Typography)(({ theme }) => ({
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: 'bold',
    color: theme.palette.grey[400],
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
                <Typography variant="h6" fontWeight="bold">Drone Position Control</Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </Header>

            {/* Position Controls - Sliders control METERS, display FEET */}
            <ControlRow>
                <SliderLabel>X Position (Left/Right)</SliderLabel>
                <StyledSlider
                    value={position.x} // Meter value
                    onChange={(_, value) => handleSliderChange('x', value)}
                    aria-labelledby="x-position-slider"
                    min={positionRange.min}
                    max={positionRange.max}
                    step={0.1} // Meter step
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{metersToFeet(position.x).toFixed(1)}ft</ValueDisplay> {/* Display feet */}
            </ControlRow>

            <ControlRow>
                <SliderLabel>Y Position (Forward/Back)</SliderLabel>
                <StyledSlider
                    value={position.y} // Meter value
                    onChange={(_, value) => handleSliderChange('y', value)}
                    aria-labelledby="y-position-slider"
                    min={positionRange.min}
                    max={positionRange.max}
                    step={0.1} // Meter step
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{metersToFeet(position.y).toFixed(1)}ft</ValueDisplay> {/* Display feet */}
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
                <ValueDisplay>{metersToFeet(position.z).toFixed(1)}ft</ValueDisplay> {/* Display feet */}
            </ControlRow>

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Toggle Controls */}
            <FormControlLabel
                control={
                    <StyledSwitch
                        checked={cameraFollows}
                        onChange={(e, checked) => handleSwitchChange(e, checked)}
                        name="cameraFollows"
                    />
                }
                label={<Typography sx={{ fontSize: '0.9rem' }}>Camera Follows Drone</Typography>}
            />
             <Typography variant="caption" sx={{ color: theme => theme.palette.grey[500], pl: 4 }}>
                Centers view on drone but allows manual camera control
             </Typography>

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Camera Settings */}
            <SectionTitle variant="subtitle1">Camera Settings</SectionTitle>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" display="block" gutterBottom>F-Stop</Typography>
                    <Select
                        value={cameraSettings.fStop}
                        onChange={(e) => handleCameraSettingChange(e, 'fStop')}
                        size="small"
                        fullWidth
                        sx={{ 
                            backgroundColor: 'rgba(80, 80, 80, 0.7)',
                            color: 'white',
                            '& .MuiSelect-icon': { color: 'white' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                         }}
                        MenuProps={{ PaperProps: { sx: { backgroundColor: '#333', color: 'white' } } }}
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
                    </Select>
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" display="block" gutterBottom>Focus Distance (ft)</Typography> {/* Updated label */}
                    <TextField
                        value={cameraSettings.focusDistance.toFixed(1)} // Display feet from local state
                        onChange={(e) => handleCameraSettingChange(e, 'focusDistance')}
                        type="number"
                        size="small"
                        fullWidth
                        InputProps={{
                            inputProps: { min: 0.3, step: 0.1 }, // Example constraints in FEET (0.3ft ~ 0.1m)
                            sx: { color: 'white' }
                        }}
                        sx={{ 
                            backgroundColor: 'rgba(80, 80, 80, 0.7)',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                '&.Mui-focused fieldset': { borderColor: 'white' }, 
                              },
                         }}
                    />
                </Box>
            </Box>

        </PanelContainer>
    );
};

export default DronePositionControlPanel; 