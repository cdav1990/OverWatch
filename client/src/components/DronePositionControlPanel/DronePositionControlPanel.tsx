import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Slider,
    Switch,
    FormControlLabel,
    Paper,
    Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LocalCoord } from '../../types/mission'; // Assuming LocalCoord is used for position
import { styled } from '@mui/material/styles';
import { metersToFeet } from '../../utils/sensorCalculations'; // Keep only conversion needed for display
import { useMission } from '../../context/MissionContext'; // Keep context

// Props definition - removed camera settings props
interface DronePositionControlPanelProps {
    isOpen: boolean;
    onClose: () => void;
    initialPosition: LocalCoord;
    onPositionChange: (newPosition: LocalCoord) => void;
    initialCameraFollow: boolean;
    onCameraFollowChange: (follows: boolean) => void;
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

const DronePositionControlPanel: React.FC<DronePositionControlPanelProps> = ({
    isOpen,
    onClose,
    initialPosition,
    onPositionChange,
    initialCameraFollow,
    onCameraFollowChange,
}) => {
    // Keep only the state we need
    const [position, setPosition] = useState<LocalCoord>(initialPosition);
    const [cameraFollows, setCameraFollows] = useState(initialCameraFollow);

    // Update internal state if initial props change
    useEffect(() => {
        setPosition(initialPosition);
    }, [initialPosition]);

    useEffect(() => {
        setCameraFollows(initialCameraFollow);
    }, [initialCameraFollow]);

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

            {/* Camera Follow Toggle */}
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
        </PanelContainer>
    );
};

export default DronePositionControlPanel; 