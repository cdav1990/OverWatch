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

// Props definition - updated to include camera controls
interface DronePositionControlPanelProps {
    isOpen: boolean;
    onClose: () => void;
    initialPosition: LocalCoord;
    onPositionChange: (newPosition: LocalCoord) => void;
    initialCameraFollow: boolean;
    onCameraFollowChange: (follows: boolean) => void;
    // New camera control props
    gimbalPitch?: number;
    onGimbalPitchChange?: (pitch: number) => void;
    cameraMode?: 'photo' | 'video';
    onCameraModeChange?: (mode: 'photo' | 'video') => void;
    isRecording?: boolean;
    onTriggerCamera?: () => void;
    onToggleRecording?: () => void;
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

// Add new styled components for camera controls
const ActionButton = styled(Box)(({ theme }) => ({
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    transition: 'all 0.2s',
    '&:hover': {
        backgroundColor: 'rgba(60, 60, 60, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
}));

const CameraModeButton = styled(Box)<{ active: boolean }>(({ theme, active }) => ({
    backgroundColor: active ? 'rgba(79, 195, 247, 0.2)' : 'rgba(40, 40, 40, 0.9)',
    color: active ? '#4fc3f7' : 'white',
    padding: '5px 10px',
    borderRadius: '3px',
    flex: 1,
    textAlign: 'center',
    cursor: 'pointer',
    border: active ? '1px solid rgba(79, 195, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
    transition: 'all 0.2s',
    '&:hover': {
        backgroundColor: active ? 'rgba(79, 195, 247, 0.3)' : 'rgba(60, 60, 60, 0.9)',
        borderColor: active ? 'rgba(79, 195, 247, 0.7)' : 'rgba(255, 255, 255, 0.25)',
    },
}));

const RecordButton = styled(Box)<{ recording: boolean }>(({ theme, recording }) => ({
    backgroundColor: recording ? 'rgba(244, 67, 54, 0.2)' : 'rgba(40, 40, 40, 0.9)',
    color: recording ? '#f44336' : 'white',
    padding: '5px 10px',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    border: recording ? '1px solid rgba(244, 67, 54, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
    transition: 'all 0.2s',
    '&:hover': {
        backgroundColor: recording ? 'rgba(244, 67, 54, 0.3)' : 'rgba(60, 60, 60, 0.9)',
        borderColor: recording ? 'rgba(244, 67, 54, 0.7)' : 'rgba(255, 255, 255, 0.25)',
    },
}));

const DronePositionControlPanel: React.FC<DronePositionControlPanelProps> = ({
    isOpen,
    onClose,
    initialPosition,
    onPositionChange,
    initialCameraFollow,
    onCameraFollowChange,
    // New camera control props with defaults
    gimbalPitch = 0,
    onGimbalPitchChange = () => {},
    cameraMode = 'photo',
    onCameraModeChange = () => {},
    isRecording = false,
    onTriggerCamera = () => {},
    onToggleRecording = () => {},
}) => {
    // Keep only the state we need
    const [position, setPosition] = useState<LocalCoord>(initialPosition);
    const [cameraFollows, setCameraFollows] = useState(initialCameraFollow);
    
    // Add new state for camera controls
    const [currentGimbalPitch, setCurrentGimbalPitch] = useState<number>(gimbalPitch);
    const [currentCameraMode, setCurrentCameraMode] = useState<'photo' | 'video'>(cameraMode);
    const [currentlyRecording, setCurrentlyRecording] = useState<boolean>(isRecording);

    // Update internal state if initial props change
    useEffect(() => {
        setPosition(initialPosition);
    }, [initialPosition]);

    useEffect(() => {
        setCameraFollows(initialCameraFollow);
    }, [initialCameraFollow]);
    
    // Update camera control states when props change
    useEffect(() => {
        setCurrentGimbalPitch(gimbalPitch);
    }, [gimbalPitch]);
    
    useEffect(() => {
        setCurrentCameraMode(cameraMode);
    }, [cameraMode]);
    
    useEffect(() => {
        setCurrentlyRecording(isRecording);
    }, [isRecording]);
    
    // Add Escape key handling
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

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
    
    // New handlers for camera controls
    const handleGimbalPitchChange = (_: Event, value: number | number[]) => {
        const newValue = Array.isArray(value) ? value[0] : value;
        setCurrentGimbalPitch(newValue);
        onGimbalPitchChange(newValue);
    };
    
    const handleCameraModeChange = (mode: 'photo' | 'video') => {
        setCurrentCameraMode(mode);
        onCameraModeChange(mode);
    };
    
    const handleTriggerCamera = () => {
        onTriggerCamera();
    };
    
    const handleToggleRecording = () => {
        const newRecordingState = !currentlyRecording;
        setCurrentlyRecording(newRecordingState);
        onToggleRecording();
    };

    if (!isOpen) {
        return null;
    }

    // Define reasonable min/max for sliders in METERS (adjust as needed)
    const positionRange = { min: -100, max: 100 }; // meters
    const heightRange = { min: 0, max: 100 }; // meters (Z - Up)
    const pitchRange = { min: -90, max: 0 }; // degrees (looking down)

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

            {/* Camera Controls */}
            <SectionTitle variant="subtitle2">Camera Controls</SectionTitle>
            
            {/* Gimbal Pitch Slider */}
            <ControlRow>
                <SliderLabel>Gimbal Pitch</SliderLabel>
                <StyledSlider
                    value={currentGimbalPitch}
                    onChange={handleGimbalPitchChange}
                    aria-labelledby="gimbal-pitch-slider"
                    min={pitchRange.min}
                    max={pitchRange.max}
                    step={1}
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{currentGimbalPitch}°</ValueDisplay>
            </ControlRow>
            
            {/* Camera Mode Selection */}
            <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#ddd', mb: 1 }}>Camera Mode</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <CameraModeButton 
                    active={currentCameraMode === 'photo'}
                    onClick={() => handleCameraModeChange('photo')}
                >
                    Photo
                </CameraModeButton>
                <CameraModeButton 
                    active={currentCameraMode === 'video'}
                    onClick={() => handleCameraModeChange('video')}
                >
                    Video
                </CameraModeButton>
            </Box>
            
            {/* Camera Trigger Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                {currentCameraMode === 'photo' ? (
                    <ActionButton 
                        onClick={handleTriggerCamera}
                        sx={{ width: '100%' }}
                    >
                        Capture Photo
                    </ActionButton>
                ) : (
                    <RecordButton 
                        recording={currentlyRecording}
                        onClick={handleToggleRecording}
                        sx={{ width: '100%' }}
                    >
                        {currentlyRecording ? 'Stop Recording' : 'Start Recording'}
                    </RecordButton>
                )}
            </Box>

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
            
            <Typography 
                variant="caption" 
                sx={{ 
                    color: 'rgba(255, 255, 255, 0.4)', 
                    fontSize: '0.7rem',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    display: 'block',
                    mt: 2
                }}
            >
                Press ESC to close this panel
            </Typography>
        </PanelContainer>
    );
};

export default DronePositionControlPanel; 