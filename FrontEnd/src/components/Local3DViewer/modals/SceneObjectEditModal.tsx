import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Grid,
    Typography,
    IconButton,
    Box,
    Slider,
    Divider,
    Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useMission } from "../../../context/MissionContext";
import { SceneObject } from "../../../context/MissionContext"; // Import SceneObject type
import { LocalCoord } from "../../../types/mission"; // Import LocalCoord from types
import { styled } from '@mui/material/styles';
import { metersToFeet, feetToMeters } from "../../../utils/sensorCalculations"; // Import conversion functions

interface SceneObjectEditModalProps {
    objectId: string; // ID of the object being edited
    open: boolean;
    onClose: () => void;
}

// Styled components to match the DronePositionControlPanel styling
const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        backgroundColor: 'rgba(21, 21, 21, 0.97)',
        color: theme.palette.common.white,
        borderRadius: '4px',
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
    }
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    padding: theme.spacing(1.5, 2),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
    padding: theme.spacing(2),
    backgroundColor: 'rgba(21, 21, 21, 0.97)',
}));

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
    padding: theme.spacing(1, 2),
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 500,
    fontSize: '0.85rem',
    color: theme.palette.grey[300],
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: theme.spacing(1),
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        color: theme.palette.common.white,
        '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.3)',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#4fc3f7',
        },
    },
    '& .MuiInputLabel-root': {
        color: theme.palette.grey[400],
        fontSize: '0.8rem',
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: '#4fc3f7',
    },
    '& .MuiInputBase-input': {
        color: theme.palette.common.white,
        fontSize: '0.9rem',
    },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
    '& .MuiInputLabel-root': {
        color: theme.palette.grey[400],
        fontSize: '0.8rem',
    },
    '& .MuiOutlinedInput-root': {
        color: theme.palette.common.white,
        fontSize: '0.9rem',
        '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.3)',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#4fc3f7',
        },
    },
    '& .MuiSelect-icon': {
        color: theme.palette.grey[400],
    },
}));

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

const ControlRow = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
    gap: theme.spacing(1.5),
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

const SliderLabel = styled(Typography)({
    minWidth: '100px',
    fontSize: '0.85rem',
    color: '#ddd',
    fontWeight: 400,
});

const SceneObjectEditModal: React.FC<SceneObjectEditModalProps> = ({ objectId, open, onClose }) => {
    const { state, dispatch } = useMission();
    const [editedObject, setEditedObject] = useState<Partial<SceneObject>>({});
    
    // Store position in meters internally
    const [position, setPosition] = useState<LocalCoord>({ x: 0, y: 0, z: 0 });
    
    // Store dimensions in meters internally
    const [dimensions, setDimensions] = useState<{ width: number; length: number; height: number }>({ width: 0, length: 0, height: 0 });

    // Add scale state for imported models
    const [scale, setScale] = useState<{ x: number; y: number; z: number; uniform: boolean }>({ 
        x: 1, 
        y: 1, 
        z: 1, 
        uniform: true 
    });

    // Add Escape key handling
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && open) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    // Find the object to edit when the modal opens or objectId changes
    const objectToEdit = useMemo(() => {
        return state.sceneObjects.find(obj => obj.id === objectId);
    }, [state.sceneObjects, objectId]);

    // Pre-fill state when the objectToEdit is found
    useEffect(() => {
        if (objectToEdit) {
            setEditedObject({
                color: objectToEdit.color || '#888888',
                class: objectToEdit.class || 'neutral',
            });
            setPosition(objectToEdit.position);
            setDimensions({
                width: objectToEdit.width ?? 0,
                length: objectToEdit.length ?? 0,
                height: objectToEdit.height ?? 0,
            });
            // Initialize scale values from existing object or default to 1
            setScale({
                x: objectToEdit.scale?.x ?? 1,
                y: objectToEdit.scale?.y ?? 1,
                z: objectToEdit.scale?.z ?? 1,
                uniform: true // Default to uniform scaling
            });
        } else {
            // Reset state if object not found (e.g., modal opened with invalid ID)
             setEditedObject({});
             setPosition({ x: 0, y: 0, z: 0 });
             setDimensions({ width: 0, length: 0, height: 0 });
             setScale({ x: 1, y: 1, z: 1, uniform: true });
        }
    }, [objectToEdit]);

    const handleInputChange = (field: keyof Partial<SceneObject>, value: any) => {
        setEditedObject(prev => ({ ...prev, [field]: value }));
    };

    // Position sliders now in feet but stored in meters
    const handlePositionChange = (axis: keyof LocalCoord, value: number | number[]) => {
        const newValueFeet = Array.isArray(value) ? value[0] : value;
        // Convert feet to meters for internal storage
        const newValueMeters = feetToMeters(newValueFeet);
        setPosition((prev: LocalCoord) => ({ ...prev, [axis]: newValueMeters }));
    };
    
    // Add or update the handleTextPositionChange method for direct input fields
    const handleTextPositionChange = (axis: keyof LocalCoord, value: string) => {
        const numValueFeet = parseFloat(value) || 0; // Default to 0 if invalid
        
        // Apply limits to keep within slider range
        const limitedValue = Math.max(
            axis === 'z' ? 0 : -3000, 
            Math.min(3000, numValueFeet)
        );
        
        // Convert feet to meters for internal storage
        const numValueMeters = feetToMeters(limitedValue);
        setPosition((prev: LocalCoord) => ({ ...prev, [axis]: numValueMeters }));
    };
    
    // Dimension fields now in feet but stored in meters
    const handleDimensionChange = (dim: keyof typeof dimensions, value: string) => {
        const numValueFeet = parseFloat(value);
        // Only update if valid positive number
        if (!isNaN(numValueFeet) && numValueFeet >= 0) {
            // Convert feet to meters for internal storage
            const numValueMeters = feetToMeters(numValueFeet);
            setDimensions((prev: typeof dimensions) => ({ ...prev, [dim]: numValueMeters }));
        } else if (value === '') { // Allow clearing field, treat as 0
            setDimensions((prev: typeof dimensions) => ({ ...prev, [dim]: 0 }));
        }
    };

    // Dimension sliders now in feet but stored in meters
    const handleDimensionSliderChange = (dim: keyof typeof dimensions, value: number | number[]) => {
        const newValueFeet = Array.isArray(value) ? value[0] : value;
        // Convert feet to meters for internal storage
        const newValueMeters = feetToMeters(newValueFeet);
        setDimensions((prev: typeof dimensions) => ({ ...prev, [dim]: newValueMeters }));
    };

    // Toggle between uniform and non-uniform scaling
    const toggleUniformScaling = () => {
        setScale(prev => ({
            ...prev,
            uniform: !prev.uniform
        }));
    };

    // Add logarithmic scale mode toggle
    const [logScaleMode, setLogScaleMode] = useState(false);

    // Enhanced scale change handler with wider range
    const handleScaleChange = (axis: 'x' | 'y' | 'z', value: number | number[]) => {
        const newValue = Array.isArray(value) ? value[0] : value;
        
        // Apply scale
        if (scale.uniform) {
            // If uniform scaling, update all axes
            setScale(prev => ({
                ...prev,
                x: newValue,
                y: newValue,
                z: newValue
            }));
        } else {
            // Otherwise just update the specified axis
            setScale(prev => ({
                ...prev,
                [axis]: newValue
            }));
        }
    };

    // Handle direct text input for scale values with enhanced validation
    const handleTextScaleChange = (axis: 'x' | 'y' | 'z', value: string) => {
        const numValue = parseFloat(value);
        
        // Allow any positive number (without upper limit)
        if (!isNaN(numValue) && numValue > 0) {
            if (scale.uniform) {
                // If uniform scaling, update all axes
                setScale(prev => ({
                    ...prev,
                    x: numValue,
                    y: numValue,
                    z: numValue
                }));
            } else {
                // Otherwise just update the specified axis
                setScale(prev => ({
                    ...prev,
                    [axis]: numValue
                }));
            }
        }
    };

    // Add scale preset handler
    const applyScalePreset = (presetValue: number) => {
        setScale(prev => ({
            ...prev,
            x: presetValue,
            y: presetValue,
            z: presetValue,
            uniform: true // Force uniform scaling for presets
        }));
    };

    // Get dynamic slider range based on log scale mode
    const getSliderMax = () => logScaleMode ? 100 : 20;
    const getSliderStep = () => logScaleMode ? 0.1 : 0.01;

    // Convert between slider value and actual scale for logarithmic mode
    const sliderToScale = (sliderValue: number): number => {
        if (!logScaleMode) return sliderValue;
        return Math.pow(10, sliderValue / 50) / 10; // Maps 0-100 to 0.1-10
    };

    const scaleToSlider = (scaleValue: number): number => {
        if (!logScaleMode) return scaleValue;
        return 50 * Math.log10(scaleValue * 10); // Maps 0.1-10 to 0-100
    };

    const handleSave = () => {
        if (!objectToEdit) return;

        const updatePayload: Partial<SceneObject> & { id: string } = {
            id: objectId,
            ...editedObject, // Includes color, class, heightOffset
            position: position,
            width: dimensions.width,
            length: dimensions.length,
            height: dimensions.height,
            scale: {
                x: scale.x,
                y: scale.y,
                z: scale.z
            }
        };
        
        console.log("Dispatching UPDATE_SCENE_OBJECT:", updatePayload);
        dispatch({ type: 'UPDATE_SCENE_OBJECT', payload: updatePayload });
        onClose(); // Close the modal
    };

    const handleClose = () => {
        onClose(); // Simply close the modal without saving
    };

    // Render nothing if modal is not open or object not found
    if (!open || !objectToEdit) {
        return null;
    }

    // Convert position from meters to feet for display
    const positionFeet = {
        x: metersToFeet(position.x),
        y: metersToFeet(position.y),
        z: metersToFeet(position.z)
    };

    // Convert dimensions from meters to feet for display
    const dimensionsFeet = {
        width: metersToFeet(dimensions.width),
        length: metersToFeet(dimensions.length),
        height: metersToFeet(dimensions.height)
    };

    return (
        <StyledDialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <StyledDialogTitle>
                <Typography variant="subtitle1" sx={{ 
                    fontWeight: 500, 
                    fontSize: '0.95rem',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                }}>
                    Edit Scene Object
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    size="small"
                    sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </StyledDialogTitle>
            <StyledDialogContent>
                <Stack spacing={2.5}>
                    <Box>
                        <SectionTitle variant="subtitle2">Position (Feet)</SectionTitle>
                        
                        {/* X Position Row with slider and direct input */}
                        <ControlRow>
                            <SliderLabel>X (East/West)</SliderLabel>
                            <StyledSlider
                                value={positionFeet.x}
                                onChange={(_, value) => handlePositionChange('x', value)}
                                min={-3000}
                                max={3000}
                                step={10}
                                valueLabelDisplay="auto"
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                                <StyledTextField
                                    value={positionFeet.x.toFixed(1)}
                                    onChange={(e) => handleTextPositionChange('x', e.target.value)}
                                    size="small"
                                    variant="outlined"
                                    inputProps={{
                                        min: -3000,
                                        max: 3000,
                                        style: { width: '70px', textAlign: 'right' }
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    ft
                                </Typography>
                            </Box>
                        </ControlRow>
                        
                        {/* Y Position Row with slider and direct input */}
                        <ControlRow>
                            <SliderLabel>Y (North/South)</SliderLabel>
                            <StyledSlider
                                value={positionFeet.y}
                                onChange={(_, value) => handlePositionChange('y', value)}
                                min={-3000}
                                max={3000}
                                step={10}
                                valueLabelDisplay="auto"
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                                <StyledTextField
                                    value={positionFeet.y.toFixed(1)}
                                    onChange={(e) => handleTextPositionChange('y', e.target.value)}
                                    size="small"
                                    variant="outlined"
                                    inputProps={{
                                        min: -3000,
                                        max: 3000,
                                        style: { width: '70px', textAlign: 'right' }
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    ft
                                </Typography>
                            </Box>
                        </ControlRow>
                        
                        {/* Z Position Row with slider and direct input */}
                        <ControlRow>
                            <SliderLabel>Z (Up/Down)</SliderLabel>
                            <StyledSlider
                                value={positionFeet.z}
                                onChange={(_, value) => handlePositionChange('z', value)}
                                min={0}
                                max={3000}
                                step={10}
                                valueLabelDisplay="auto"
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                                <StyledTextField
                                    value={positionFeet.z.toFixed(1)}
                                    onChange={(e) => handleTextPositionChange('z', e.target.value)}
                                    size="small"
                                    variant="outlined"
                                    inputProps={{
                                        min: 0,
                                        max: 3000,
                                        style: { width: '70px', textAlign: 'right' }
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    ft
                                </Typography>
                            </Box>
                        </ControlRow>
                        
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                            Use slider for approximate positioning or enter exact values in the input fields
                        </Typography>
                    </Box>
                     
                    {/* Add height offset slider only for ship and dock models */}
                    {objectToEdit && (objectToEdit.type === 'ship' || objectToEdit.type === 'dock') && (
                        <Box mt={2}>
                            <Box display="flex" alignItems="center" mb={1}>
                                <SectionTitle variant="subtitle2" sx={{ mb: 0, mr: 1 }}>
                                    Height Offset
                                </SectionTitle>
                                <Tooltip title={
                                    objectToEdit.type === 'dock' 
                                    ? "Adjust height position above or below ground level (-100 to +100 feet)" 
                                    : "Adjust height position above or below ground level (-50 to +50 feet)"
                                } placement="top">
                                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '16px' }} />
                                </Tooltip>
                            </Box>
                            <ControlRow>
                                <SliderLabel>Height Offset</SliderLabel>
                                <StyledSlider
                                    value={editedObject.heightOffset ?? (objectToEdit.type === 'dock' ? -75 : -10)}
                                    onChange={(_, value) => handleInputChange('heightOffset', Array.isArray(value) ? value[0] : value)}
                                    min={objectToEdit.type === 'dock' ? -100 : -50}
                                    max={objectToEdit.type === 'dock' ? 100 : 50}
                                    step={1}
                                    valueLabelDisplay="auto"
                                    marks={
                                        objectToEdit.type === 'dock' 
                                        ? [
                                            { value: -100, label: '-100ft' },
                                            { value: -75, label: '-75ft' },
                                            { value: 0, label: '0ft' },
                                            { value: 100, label: '+100ft' }
                                        ]
                                        : [
                                            { value: -50, label: '-50ft' },
                                            { value: -10, label: '-10ft' },
                                            { value: 0, label: '0ft' },
                                            { value: 50, label: '+50ft' }
                                        ]
                                    }
                                    sx={{
                                        '& .MuiSlider-markLabel': {
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            fontSize: '0.7rem',
                                        }
                                    }}
                                />
                                <ValueDisplay>{(editedObject.heightOffset ?? (objectToEdit.type === 'dock' ? -75 : -10)).toFixed(1)}ft</ValueDisplay>
                            </ControlRow>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                                {objectToEdit.type === 'dock' 
                                    ? "Negative values place the dock below ground level (recommended: -75ft)" 
                                    : "Negative values place the ship below ground level"}
                            </Typography>
                        </Box>
                    )}

                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                    <Box>
                        <SectionTitle variant="subtitle2">Dimensions (Feet)</SectionTitle>
                        <ControlRow>
                            <SliderLabel>Width</SliderLabel>
                            <StyledSlider
                                value={dimensionsFeet.width}
                                onChange={(_, value) => handleDimensionSliderChange('width', value)}
                                min={0.5}
                                max={164}
                                step={0.5}
                                valueLabelDisplay="auto"
                            />
                            <ValueDisplay>{dimensionsFeet.width.toFixed(1)}ft</ValueDisplay>
                        </ControlRow>
                        <ControlRow>
                            <SliderLabel>Length</SliderLabel>
                            <StyledSlider
                                value={dimensionsFeet.length}
                                onChange={(_, value) => handleDimensionSliderChange('length', value)}
                                min={0.5}
                                max={164}
                                step={0.5}
                                valueLabelDisplay="auto"
                            />
                            <ValueDisplay>{dimensionsFeet.length.toFixed(1)}ft</ValueDisplay>
                        </ControlRow>
                        <ControlRow>
                            <SliderLabel>Height</SliderLabel>
                            <StyledSlider
                                value={dimensionsFeet.height}
                                onChange={(_, value) => handleDimensionSliderChange('height', value)}
                                min={0.5}
                                max={164}
                                step={0.5}
                                valueLabelDisplay="auto"
                            />
                            <ValueDisplay>{dimensionsFeet.height.toFixed(1)}ft</ValueDisplay>
                        </ControlRow>
                    </Box>
                    
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                    
                    <Box>
                        <Box display="flex" alignItems="center" mb={1}>
                            <SectionTitle variant="subtitle2" sx={{ mb: 0, mr: 1 }}>
                                Scale Adjustment
                            </SectionTitle>
                            <Tooltip title="Adjust the scale of imported 3D models. Use larger values for small models, smaller values for large models." placement="top">
                                <InfoOutlinedIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '16px' }} />
                            </Tooltip>
                        </Box>
                        
                        <Box mb={2} display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                            <Button
                                size="small"
                                variant={scale.uniform ? "contained" : "outlined"}
                                onClick={toggleUniformScaling}
                                sx={{
                                    fontSize: '0.7rem',
                                    textTransform: 'none',
                                    backgroundColor: scale.uniform ? 'rgba(79, 195, 247, 0.2)' : 'transparent',
                                    color: scale.uniform ? '#4fc3f7' : 'rgba(255, 255, 255, 0.7)',
                                    border: `1px solid ${scale.uniform ? '#4fc3f7' : 'rgba(255, 255, 255, 0.3)'}`,
                                    '&:hover': {
                                        backgroundColor: scale.uniform ? 'rgba(79, 195, 247, 0.3)' : 'rgba(255, 255, 255, 0.1)'
                                    }
                                }}
                            >
                                Uniform Scaling
                            </Button>
                            
                            <Button
                                size="small"
                                variant={logScaleMode ? "contained" : "outlined"}
                                onClick={() => setLogScaleMode(!logScaleMode)}
                                sx={{
                                    fontSize: '0.7rem',
                                    textTransform: 'none',
                                    backgroundColor: logScaleMode ? 'rgba(79, 195, 247, 0.2)' : 'transparent',
                                    color: logScaleMode ? '#4fc3f7' : 'rgba(255, 255, 255, 0.7)',
                                    border: `1px solid ${logScaleMode ? '#4fc3f7' : 'rgba(255, 255, 255, 0.3)'}`,
                                    '&:hover': {
                                        backgroundColor: logScaleMode ? 'rgba(79, 195, 247, 0.3)' : 'rgba(255, 255, 255, 0.1)'
                                    }
                                }}
                            >
                                Logarithmic Scale
                            </Button>
                            
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', flexGrow: 1 }}>
                                {scale.uniform ? "All axes will scale together" : "Axes can be scaled independently"}
                            </Typography>
                        </Box>
                        
                        {/* Scale presets */}
                        <Box mb={2}>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mb: 1 }}>
                                Scale Presets:
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={1}>
                                {/* Add dock-specific presets at the start */}
                                <Button
                                    key="preset-dock-perfect"
                                    size="small"
                                    variant={scale.uniform && Math.abs(scale.x - 0.08) < 0.001 ? "contained" : "outlined"}
                                    onClick={() => applyScalePreset(0.08)}
                                    sx={{
                                        minWidth: '85px',
                                        fontSize: '0.7rem',
                                        py: 0.5,
                                        backgroundColor: scale.uniform && Math.abs(scale.x - 0.08) < 0.001 ? 'rgba(79, 195, 247, 0.2)' : 'transparent',
                                        color: scale.uniform && Math.abs(scale.x - 0.08) < 0.001 ? '#4fc3f7' : 'rgba(255, 255, 255, 0.7)',
                                        border: `1px solid ${scale.uniform && Math.abs(scale.x - 0.08) < 0.001 ? '#4fc3f7' : 'rgba(255, 255, 255, 0.3)'}`,
                                    }}
                                >
                                    Dock Perfect
                                </Button>
                                <Button
                                    key="preset-dock-small"
                                    size="small"
                                    variant={scale.uniform && Math.abs(scale.x - 0.05) < 0.001 ? "contained" : "outlined"}
                                    onClick={() => applyScalePreset(0.05)}
                                    sx={{
                                        minWidth: '85px',
                                        fontSize: '0.7rem',
                                        py: 0.5,
                                        backgroundColor: scale.uniform && Math.abs(scale.x - 0.05) < 0.001 ? 'rgba(79, 195, 247, 0.2)' : 'transparent',
                                        color: scale.uniform && Math.abs(scale.x - 0.05) < 0.001 ? '#4fc3f7' : 'rgba(255, 255, 255, 0.7)',
                                        border: `1px solid ${scale.uniform && Math.abs(scale.x - 0.05) < 0.001 ? '#4fc3f7' : 'rgba(255, 255, 255, 0.3)'}`,
                                    }}
                                >
                                    Dock Small
                                </Button>
                                <Button
                                    key="preset-dock-large"
                                    size="small"
                                    variant={scale.uniform && Math.abs(scale.x - 0.12) < 0.001 ? "contained" : "outlined"}
                                    onClick={() => applyScalePreset(0.12)}
                                    sx={{
                                        minWidth: '85px',
                                        fontSize: '0.7rem',
                                        py: 0.5,
                                        backgroundColor: scale.uniform && Math.abs(scale.x - 0.12) < 0.001 ? 'rgba(79, 195, 247, 0.2)' : 'transparent',
                                        color: scale.uniform && Math.abs(scale.x - 0.12) < 0.001 ? '#4fc3f7' : 'rgba(255, 255, 255, 0.7)',
                                        border: `1px solid ${scale.uniform && Math.abs(scale.x - 0.12) < 0.001 ? '#4fc3f7' : 'rgba(255, 255, 255, 0.3)'}`,
                                    }}
                                >
                                    Dock Large
                                </Button>
                                
                                {/* Regular presets */}
                                {[0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 50.0, 100.0].map((preset) => (
                                    <Button
                                        key={`preset-${preset}`}
                                        size="small"
                                        variant={scale.uniform && Math.abs(scale.x - preset) < 0.001 ? "contained" : "outlined"}
                                        onClick={() => applyScalePreset(preset)}
                                        sx={{
                                            minWidth: '40px',
                                            fontSize: '0.7rem',
                                            py: 0.5,
                                            backgroundColor: scale.uniform && Math.abs(scale.x - preset) < 0.001 ? 'rgba(79, 195, 247, 0.2)' : 'transparent',
                                            color: scale.uniform && Math.abs(scale.x - preset) < 0.001 ? '#4fc3f7' : 'rgba(255, 255, 255, 0.7)',
                                            border: `1px solid ${scale.uniform && Math.abs(scale.x - preset) < 0.001 ? '#4fc3f7' : 'rgba(255, 255, 255, 0.3)'}`,
                                        }}
                                    >
                                        {preset < 1 ? preset.toFixed(2).replace(/\.?0+$/, '') : preset === 1 ? '1' : preset}×
                                    </Button>
                                ))}
                                {/* Custom scale button */}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        const value = prompt('Enter custom scale factor (e.g., 0.08, 0.25):');
                                        const parsedValue = parseFloat(value || '0');
                                        if (!isNaN(parsedValue) && parsedValue > 0) {
                                            applyScalePreset(parsedValue);
                                        }
                                    }}
                                    sx={{
                                        minWidth: '60px',
                                        fontSize: '0.7rem',
                                        py: 0.5,
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                    }}
                                >
                                    Custom...
                                </Button>
                            </Box>
                        </Box>
                        
                        {/* Add this below the scale presets section */}
                        <Box mb={2}>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mb: 1 }}>
                                Fine-Tuning Control:
                            </Typography>
                            <Box sx={{ px: 1 }}>
                                <ControlRow>
                                    <SliderLabel>Micro-Adjust</SliderLabel>
                                    <StyledSlider
                                        value={scale.uniform ? scale.x : 0.1}
                                        onChange={(_, value) => {
                                            const newValue = Array.isArray(value) ? value[0] : value;
                                            if (scale.uniform) {
                                                setScale(prev => ({
                                                    ...prev,
                                                    x: newValue,
                                                    y: newValue,
                                                    z: newValue
                                                }));
                                            }
                                        }}
                                        min={0.01}
                                        max={0.2}
                                        step={0.01}
                                        valueLabelDisplay="auto"
                                        disabled={!scale.uniform}
                                        marks={[
                                            { value: 0.01, label: '0.01' },
                                            { value: 0.05, label: '0.05' },
                                            { value: 0.08, label: '0.08' },
                                            { value: 0.1, label: '0.1' },
                                            { value: 0.2, label: '0.2' }
                                        ]}
                                        sx={{
                                            '& .MuiSlider-markLabel': {
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '0.7rem',
                                            },
                                            '& .MuiSlider-mark': {
                                                backgroundColor: '#4fc3f7',
                                                height: 4,
                                                width: 1,
                                                marginTop: -1,
                                            }
                                        }}
                                    />
                                    <ValueDisplay>{(scale.uniform ? scale.x : 0.1).toFixed(3)}×</ValueDisplay>
                                </ControlRow>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                                    Use this for precise control of model size (0.08 recommended for cargo dock)
                                </Typography>
                            </Box>
                        </Box>
                        
                        <ControlRow>
                            <SliderLabel>X Scale</SliderLabel>
                            <StyledSlider
                                value={logScaleMode ? scaleToSlider(scale.x) : scale.x}
                                onChange={(_, value) => {
                                    const actualValue = logScaleMode ? sliderToScale(Array.isArray(value) ? value[0] : value) : value;
                                    handleScaleChange('x', actualValue);
                                }}
                                min={logScaleMode ? 0 : 0.01}
                                max={getSliderMax()}
                                step={getSliderStep()}
                                valueLabelDisplay="auto"
                                disabled={false}
                                valueLabelFormat={(value) => {
                                    const actualValue = logScaleMode ? sliderToScale(value) : value;
                                    return actualValue.toFixed(2);
                                }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <StyledTextField
                                    value={scale.x}
                                    onChange={(e) => handleTextScaleChange('x', e.target.value)}
                                    size="small"
                                    variant="outlined"
                                    inputProps={{
                                        min: 0.001,
                                        step: 0.1,
                                        style: { width: '60px', textAlign: 'right' }
                                    }}
                                    disabled={false}
                                />
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    ×
                                </Typography>
                            </Box>
                        </ControlRow>
                        
                        <ControlRow>
                            <SliderLabel>Y Scale</SliderLabel>
                            <StyledSlider
                                value={logScaleMode ? scaleToSlider(scale.y) : scale.y}
                                onChange={(_, value) => {
                                    const actualValue = logScaleMode ? sliderToScale(Array.isArray(value) ? value[0] : value) : value;
                                    handleScaleChange('y', actualValue);
                                }}
                                min={logScaleMode ? 0 : 0.01}
                                max={getSliderMax()}
                                step={getSliderStep()}
                                valueLabelDisplay="auto"
                                disabled={scale.uniform}
                                valueLabelFormat={(value) => {
                                    const actualValue = logScaleMode ? sliderToScale(value) : value;
                                    return actualValue.toFixed(2);
                                }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <StyledTextField
                                    value={scale.y}
                                    onChange={(e) => handleTextScaleChange('y', e.target.value)}
                                    size="small"
                                    variant="outlined"
                                    inputProps={{
                                        min: 0.001,
                                        step: 0.1,
                                        style: { width: '60px', textAlign: 'right' }
                                    }}
                                    disabled={scale.uniform}
                                />
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    ×
                                </Typography>
                            </Box>
                        </ControlRow>
                        
                        <ControlRow>
                            <SliderLabel>Z Scale</SliderLabel>
                            <StyledSlider
                                value={logScaleMode ? scaleToSlider(scale.z) : scale.z}
                                onChange={(_, value) => {
                                    const actualValue = logScaleMode ? sliderToScale(Array.isArray(value) ? value[0] : value) : value;
                                    handleScaleChange('z', actualValue);
                                }}
                                min={logScaleMode ? 0 : 0.01}
                                max={getSliderMax()}
                                step={getSliderStep()}
                                valueLabelDisplay="auto"
                                disabled={scale.uniform}
                                valueLabelFormat={(value) => {
                                    const actualValue = logScaleMode ? sliderToScale(value) : value;
                                    return actualValue.toFixed(2);
                                }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <StyledTextField
                                    value={scale.z}
                                    onChange={(e) => handleTextScaleChange('z', e.target.value)}
                                    size="small"
                                    variant="outlined"
                                    inputProps={{
                                        min: 0.001,
                                        step: 0.1,
                                        style: { width: '60px', textAlign: 'right' }
                                    }}
                                    disabled={scale.uniform}
                                />
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    ×
                                </Typography>
                            </Box>
                        </ControlRow>
                    </Box>
                    
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                    
                    <Box>
                        <SectionTitle variant="subtitle2">Appearance</SectionTitle>
                        <StyledFormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel id="edit-object-color-label">Color</InputLabel>
                            <Select
                                labelId="edit-object-color-label"
                                value={editedObject.color || '#888888'}
                                label="Color"
                                onChange={(e) => handleInputChange('color', e.target.value)}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            bgcolor: 'rgba(21, 21, 21, 0.97)',
                                            '& .MuiMenuItem-root': {
                                                color: 'white',
                                                fontSize: '0.85rem',
                                            },
                                            '& .MuiMenuItem-root:hover': {
                                                bgcolor: 'rgba(60, 60, 60, 0.9)',
                                            },
                                        },
                                    },
                                }}
                            >
                                <MenuItem value="#888888">Grey</MenuItem>
                                <MenuItem value="#add8e6">Light Blue</MenuItem>
                                <MenuItem value="#90ee90">Light Green</MenuItem>
                                <MenuItem value="#ffcccb">Light Red</MenuItem>
                                <MenuItem value="#ffffff">White</MenuItem>
                                <MenuItem value="#0000ff">Blue</MenuItem>
                                <MenuItem value="#ff0000">Red</MenuItem>
                                <MenuItem value="#008000">Green</MenuItem>
                            </Select>
                        </StyledFormControl>

                        <StyledFormControl fullWidth size="small">
                            <InputLabel id="edit-object-class-label">Class</InputLabel>
                            <Select
                                labelId="edit-object-class-label"
                                value={editedObject.class || 'neutral'}
                                label="Class"
                                onChange={(e) => handleInputChange('class', e.target.value)}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            bgcolor: 'rgba(21, 21, 21, 0.97)',
                                            '& .MuiMenuItem-root': {
                                                color: 'white',
                                                fontSize: '0.85rem',
                                            },
                                            '& .MuiMenuItem-root:hover': {
                                                bgcolor: 'rgba(60, 60, 60, 0.9)',
                                            },
                                        },
                                    },
                                }}
                            >
                                <MenuItem value="neutral">Neutral (Grey)</MenuItem>
                                <MenuItem value="obstacle">Obstacle (Red)</MenuItem>
                                <MenuItem value="asset">Asset (Green)</MenuItem>
                            </Select>
                        </StyledFormControl>
                    </Box>
                </Stack>
            </StyledDialogContent>
            <StyledDialogActions>
                <Button 
                    onClick={handleClose} 
                    sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        '&:hover': {
                            color: 'white',
                            backgroundColor: 'rgba(255,255,255,0.08)'
                        }
                    }}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    sx={{ 
                        bgcolor: '#4fc3f7',
                        color: '#000',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 500,
                        '&:hover': {
                            bgcolor: '#81d4fa'
                        }
                    }}
                >
                    Save Changes
                </Button>
                <Typography 
                    variant="caption" 
                    sx={{ 
                        color: 'rgba(255, 255, 255, 0.4)', 
                        fontSize: '0.7rem',
                        fontStyle: 'italic',
                        position: 'absolute',
                        left: '16px',
                        bottom: '8px'
                    }}
                >
                    Press ESC to close
                </Typography>
            </StyledDialogActions>
        </StyledDialog>
    );
};

export default SceneObjectEditModal;
