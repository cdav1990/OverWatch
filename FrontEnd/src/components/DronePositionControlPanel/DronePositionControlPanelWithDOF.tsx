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
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { LocalCoord } from '../../types/mission';
import { styled } from '@mui/material/styles';
import { metersToFeet } from '../../utils/sensorCalculations';

// Props definition - updated to include all controls
interface DronePositionControlPanelProps {
    isOpen: boolean;
    onClose: () => void;
    initialPosition: LocalCoord;
    onPositionChange: (newPosition: LocalCoord) => void;
    initialHeading?: number;
    onHeadingChange?: (newHeading: number) => void;
    initialCameraFollow: boolean;
    onCameraFollowChange: (follows: boolean) => void;
    // Camera control props
    gimbalPitch?: number;
    onGimbalPitchChange?: (pitch: number) => void;
    cameraMode?: 'photo' | 'video';
    onCameraModeChange?: (mode: 'photo' | 'video') => void;
    isRecording?: boolean;
    onTriggerCamera?: () => void;
    onToggleRecording?: () => void;
    // Viewport control props
    isCameraViewportVisible?: boolean;
    onToggleCameraViewport?: (visible: boolean) => void;
    // DOF control props
    showNearFocusPlane?: boolean;
    onToggleNearFocusPlane?: (visible: boolean) => void;
    showFarFocusPlane?: boolean;
    onToggleFarFocusPlane?: (visible: boolean) => void;
    showImageAreaAtFocus?: boolean;
    onToggleImageAreaAtFocus?: (visible: boolean) => void;
    aperture?: number;
    onApertureChange?: (value: number) => void;
    availableFStops?: number[];
    focusDistance?: number;
    onFocusDistanceChange?: (value: number) => void;
    dofInfo?: {
        nearFocusDistanceM: number;
        farFocusDistanceM: number;
        totalDepthM: number;
    };
    showDOFLabels?: boolean;
    onToggleDOFLabels?: (visible: boolean) => void;
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
    zIndex: 1300,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    maxHeight: '90vh',
    overflowY: 'auto',
}));

const Header = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
}));

const ControlRow = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    gap: '12px',
});

const SliderLabel = styled(Typography)({
    minWidth: '130px',
    fontSize: '0.85rem',
    color: '#ddd',
    fontWeight: 400,
});

const ValueDisplay = styled(Box)({
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
});

const StyledSlider = styled(Slider)({
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
    '& .MuiSlider-mark': {
        backgroundColor: '#777',
        height: 8,
        width: 1,
        marginTop: -3,
    },
    '& .MuiSlider-markActive': {
        backgroundColor: '#fff',
    },
});

const StyledSwitch = styled(Switch)({
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
});

const SectionTitle = styled(Typography)(({ theme }) => ({
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    fontWeight: 500,
    fontSize: '0.85rem',
    color: theme.palette.grey[300],
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
}));

const ActionButton = styled(Box)({
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
});

const CameraModeButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
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

const RecordButton = styled(Box)<{ recording: boolean }>(({ recording }) => ({
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

// New styled component for DOF info display
const DOFInfoBox = styled(Box)({
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid rgba(79, 195, 247, 0.3)',
    marginBottom: '12px',
    fontSize: '0.8rem',
});

const DronePositionControlPanel: React.FC<DronePositionControlPanelProps> = ({
    isOpen,
    onClose,
    initialPosition,
    onPositionChange,
    initialCameraFollow,
    onCameraFollowChange,
    // Camera control props with defaults
    gimbalPitch = 0,
    onGimbalPitchChange = () => {},
    cameraMode = 'photo',
    onCameraModeChange = () => {},
    isRecording = false,
    onTriggerCamera = () => {},
    onToggleRecording = () => {},
    // Viewport control props
    isCameraViewportVisible = false,
    onToggleCameraViewport = () => {},
    // Heading props
    initialHeading = 0, 
    onHeadingChange = () => {},
    // DOF related props
    showNearFocusPlane = true,
    onToggleNearFocusPlane = () => {},
    showFarFocusPlane = false,
    onToggleFarFocusPlane = () => {},
    showImageAreaAtFocus = true, 
    onToggleImageAreaAtFocus = () => {},
    aperture = 2.8,
    onApertureChange = () => {},
    availableFStops = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22],
    focusDistance = 10,
    onFocusDistanceChange = () => {},
    dofInfo = { nearFocusDistanceM: 8, farFocusDistanceM: 12, totalDepthM: 4 },
    showDOFLabels = true,
    onToggleDOFLabels = () => {},
}) => {
    // Position and orientation state
    const [position, setPosition] = useState<LocalCoord>(initialPosition);
    const [heading, setHeading] = useState<number>(initialHeading);
    const [cameraFollows, setCameraFollows] = useState(initialCameraFollow);
    
    // Camera control state
    const [currentGimbalPitch, setCurrentGimbalPitch] = useState<number>(gimbalPitch);
    const [currentCameraMode, setCurrentCameraMode] = useState<'photo' | 'video'>(cameraMode);
    const [currentlyRecording, setCurrentlyRecording] = useState<boolean>(isRecording);
    const [cameraViewportEnabled, setCameraViewportEnabled] = useState<boolean>(isCameraViewportVisible);
    
    // DOF control state
    const [nearFocusPlaneVisible, setNearFocusPlaneVisible] = useState<boolean>(showNearFocusPlane);
    const [farFocusPlaneVisible, setFarFocusPlaneVisible] = useState<boolean>(showFarFocusPlane);
    const [imageAreaVisible, setImageAreaVisible] = useState<boolean>(showImageAreaAtFocus);
    const [currentAperture, setCurrentAperture] = useState<number>(aperture);
    const [currentFocusDistance, setCurrentFocusDistance] = useState<number>(focusDistance);
    const [dofLabelsVisible, setDofLabelsVisible] = useState<boolean>(showDOFLabels);

    // Update state from props when they change
    useEffect(() => {
        setPosition(initialPosition);
    }, [initialPosition]);

    useEffect(() => {
        setHeading(initialHeading);
    }, [initialHeading]);

    useEffect(() => {
        setCameraFollows(initialCameraFollow);
    }, [initialCameraFollow]);
    
    useEffect(() => {
        setCurrentGimbalPitch(gimbalPitch);
    }, [gimbalPitch]);
    
    useEffect(() => {
        setCurrentCameraMode(cameraMode);
    }, [cameraMode]);
    
    useEffect(() => {
        setCurrentlyRecording(isRecording);
    }, [isRecording]);
    
    useEffect(() => {
        setCameraViewportEnabled(isCameraViewportVisible);
    }, [isCameraViewportVisible]);
    
    // DOF control updates
    useEffect(() => {
        setNearFocusPlaneVisible(showNearFocusPlane);
    }, [showNearFocusPlane]);
    
    useEffect(() => {
        setFarFocusPlaneVisible(showFarFocusPlane);
    }, [showFarFocusPlane]);
    
    useEffect(() => {
        setImageAreaVisible(showImageAreaAtFocus);
    }, [showImageAreaAtFocus]);
    
    useEffect(() => {
        setCurrentAperture(aperture);
    }, [aperture]);
    
    useEffect(() => {
        setCurrentFocusDistance(focusDistance);
    }, [focusDistance]);
    
    useEffect(() => {
        setDofLabelsVisible(showDOFLabels);
    }, [showDOFLabels]);
    
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

    // Handler functions for position controls
    const handleSliderChange = (axis: keyof LocalCoord, value: number | number[]) => {
        const newValue = Array.isArray(value) ? value[0] : value;
        const updatedPosition = { ...position, [axis]: newValue };
        setPosition(updatedPosition); 
        onPositionChange(updatedPosition);
    };

    const handleHeadingSliderChange = (_: Event, value: number | number[]) => {
        const newHeading = (Array.isArray(value) ? value[0] : value);
        const normalizedHeading = (newHeading + 360) % 360;
        setHeading(normalizedHeading); 
        onHeadingChange?.(normalizedHeading);
    };

    const handleCameraFollowChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        setCameraFollows(checked);
        onCameraFollowChange(checked);
    };
    
    // Camera control handlers
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

    const handleViewportToggleChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        setCameraViewportEnabled(checked);
        onToggleCameraViewport(checked);
    };
    
    // DOF control handlers
    const handleNearFocusPlaneToggle = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        setNearFocusPlaneVisible(checked);
        onToggleNearFocusPlane(checked);
    };
    
    const handleFarFocusPlaneToggle = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        setFarFocusPlaneVisible(checked);
        onToggleFarFocusPlane(checked);
    };
    
    const handleImageAreaToggle = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        setImageAreaVisible(checked);
        onToggleImageAreaAtFocus(checked);
    };
    
    const handleDOFLabelsToggle = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        setDofLabelsVisible(checked);
        onToggleDOFLabels(checked);
    };
    
    const handleApertureChange = (_: Event, value: number | number[]) => {
        const newValue = Array.isArray(value) ? value[0] : value;
        setCurrentAperture(newValue);
        onApertureChange(newValue);
    };
    
    const handleFocusDistanceChange = (_: Event, value: number | number[]) => {
        const newValue = Array.isArray(value) ? value[0] : value;
        setCurrentFocusDistance(newValue);
        onFocusDistanceChange(newValue);
    };

    // Get f-stop label from value
    const getFStopLabel = (value: number): string => {
        return `f/${value.toFixed(1)}`;
    };

    if (!isOpen) {
        return null;
    }

    // Define reasonable min/max for sliders
    const positionRange = { min: -915, max: 915 }; // meters (~ +/- 3000 ft)
    const heightRange = { min: 0, max: 100 }; // meters (Z - Up)
    const pitchRange = { min: -90, max: 0 }; // degrees (looking down)
    const focusDistanceRange = { min: 1, max: 100 }; // meters

    // Get formatted values for DOF display
    const nearFocusDistanceFt = metersToFeet(dofInfo.nearFocusDistanceM).toFixed(1);
    const farFocusDistanceFt = dofInfo.farFocusDistanceM === Infinity ? '∞' : metersToFeet(dofInfo.farFocusDistanceM).toFixed(1) + 'ft';
    const totalDOFFt = metersToFeet(dofInfo.totalDepthM).toFixed(1);
    
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
                    value={position.x}
                    onChange={(_, value) => handleSliderChange('x', value)}
                    aria-labelledby="x-position-slider"
                    min={positionRange.min}
                    max={positionRange.max}
                    step={1}
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{metersToFeet(position.x).toFixed(2)}ft</ValueDisplay>
            </ControlRow>

            <ControlRow>
                <SliderLabel>Y Position (North/South)</SliderLabel>
                <StyledSlider
                    value={position.y}
                    onChange={(_, value) => handleSliderChange('y', value)}
                    aria-labelledby="y-position-slider"
                    min={positionRange.min}
                    max={positionRange.max}
                    step={1}
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{metersToFeet(position.y).toFixed(2)}ft</ValueDisplay>
            </ControlRow>

            <ControlRow>
                <SliderLabel>Height (Z)</SliderLabel>
                <StyledSlider
                    value={position.z}
                    onChange={(_, value) => handleSliderChange('z', value)}
                    aria-labelledby="z-position-slider"
                    min={heightRange.min}
                    max={heightRange.max}
                    step={0.1}
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{metersToFeet(position.z).toFixed(2)}ft</ValueDisplay>
            </ControlRow>

            <ControlRow>
                <SliderLabel>Heading (Yaw)</SliderLabel>
                <StyledSlider
                    value={heading}
                    onChange={handleHeadingSliderChange}
                    aria-labelledby="heading-slider"
                    min={0}
                    max={360}
                    step={1}
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{heading.toFixed(1)}°</ValueDisplay>
            </ControlRow>

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Camera Controls */}
            <SectionTitle variant="subtitle2">Camera Controls</SectionTitle>
            
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

            <FormControlLabel
                control={
                    <StyledSwitch
                        checked={cameraViewportEnabled}
                        onChange={handleViewportToggleChange}
                        name="cameraViewportToggle"
                        size="small"
                        icon={<VisibilityOffIcon sx={{ fontSize: '1.1rem' }} />}
                        checkedIcon={<VisibilityIcon sx={{ fontSize: '1.1rem' }} />}
                    />
                }
                label={
                    <Typography sx={{ fontSize: '0.85rem', color: '#ddd', display: 'flex', alignItems: 'center' }}>
                        Camera Viewport
                    </Typography>
                }
                sx={{ marginLeft: 0, marginBottom: 1, justifyContent: 'space-between' }}
                labelPlacement="start"
            />

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Depth of Field Controls */}
            <SectionTitle variant="subtitle2">Depth of Field</SectionTitle>
            
            {/* Aperture Slider */}
            <ControlRow>
                <SliderLabel>Aperture</SliderLabel>
                <StyledSlider
                    value={currentAperture}
                    onChange={handleApertureChange}
                    aria-labelledby="aperture-slider"
                    min={Math.min(...availableFStops)}
                    max={Math.max(...availableFStops)}
                    step={null}
                    marks={availableFStops.map(fstop => ({ value: fstop }))}
                    valueLabelFormat={getFStopLabel}
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>f/{currentAperture.toFixed(1)}</ValueDisplay>
            </ControlRow>
            
            {/* Focus Distance Slider */}
            <ControlRow>
                <SliderLabel>Focus Distance</SliderLabel>
                <StyledSlider
                    value={currentFocusDistance}
                    onChange={handleFocusDistanceChange}
                    aria-labelledby="focus-distance-slider"
                    min={focusDistanceRange.min}
                    max={focusDistanceRange.max}
                    step={0.5}
                    valueLabelDisplay="auto"
                />
                <ValueDisplay>{metersToFeet(currentFocusDistance).toFixed(1)}ft</ValueDisplay>
            </ControlRow>
            
            {/* DOF Information Display */}
            <DOFInfoBox>
                <Typography sx={{ fontSize: '0.75rem', color: '#4fc3f7', mb: 0.5 }}>Depth of Field Information:</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#eee' }}>
                    Near Focus: {nearFocusDistanceFt}ft
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#eee' }}>
                    Far Focus: {farFocusDistanceFt}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#eee' }}>
                    Total DOF: {totalDOFFt}ft
                </Typography>
            </DOFInfoBox>
            
            {/* DOF Visualization Toggles */}
            <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#ddd', mb: 1 }}>Visualization Options</Typography>
            
            <FormControlLabel
                control={
                    <StyledSwitch
                        checked={nearFocusPlaneVisible}
                        onChange={handleNearFocusPlaneToggle}
                        name="nearFocusToggle"
                        size="small"
                    />
                }
                label={
                    <Typography sx={{ fontSize: '0.85rem', color: '#ddd' }}>
                        Near Focus Plane
                    </Typography>
                }
                sx={{ marginLeft: 0, marginBottom: 0.5 }}
            />
            
            <FormControlLabel
                control={
                    <StyledSwitch
                        checked={farFocusPlaneVisible}
                        onChange={handleFarFocusPlaneToggle}
                        name="farFocusToggle"
                        size="small"
                    />
                }
                label={
                    <Typography sx={{ fontSize: '0.85rem', color: '#ddd' }}>
                        Far Focus Plane
                    </Typography>
                }
                sx={{ marginLeft: 0, marginBottom: 0.5 }}
            />
            
            <FormControlLabel
                control={
                    <StyledSwitch
                        checked={imageAreaVisible}
                        onChange={handleImageAreaToggle}
                        name="imageAreaToggle"
                        size="small"
                    />
                }
                label={
                    <Typography sx={{ fontSize: '0.85rem', color: '#ddd' }}>
                        Image Area at Focus
                    </Typography>
                }
                sx={{ marginLeft: 0, marginBottom: 0.5 }}
            />
            
            <FormControlLabel
                control={
                    <StyledSwitch
                        checked={dofLabelsVisible}
                        onChange={handleDOFLabelsToggle}
                        name="dofLabelsToggle"
                        size="small"
                    />
                }
                label={
                    <Typography sx={{ fontSize: '0.85rem', color: '#ddd' }}>
                        DOF Labels
                    </Typography>
                }
                sx={{ marginLeft: 0, marginBottom: 0.5 }}
            />

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Camera Follow Toggle */}
            <SectionTitle variant="subtitle2">Camera Settings</SectionTitle>
            <FormControlLabel
                control={
                    <StyledSwitch
                        checked={cameraFollows}
                        onChange={handleCameraFollowChange}
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