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
    Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useMission } from '../../context/MissionContext';
import { SceneObject } from '../../context/MissionContext'; // Import SceneObject type
import { LocalCoord } from '../../types/mission'; // Import LocalCoord from types
import { styled } from '@mui/material/styles';

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
    const [position, setPosition] = useState<LocalCoord>({ x: 0, y: 0, z: 0 });
    const [dimensions, setDimensions] = useState<{ width: number; length: number; height: number }>({ width: 0, length: 0, height: 0 });

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
        } else {
            // Reset state if object not found (e.g., modal opened with invalid ID)
             setEditedObject({});
             setPosition({ x: 0, y: 0, z: 0 });
             setDimensions({ width: 0, length: 0, height: 0 });
        }
    }, [objectToEdit]);

    const handleInputChange = (field: keyof Partial<SceneObject>, value: any) => {
        setEditedObject(prev => ({ ...prev, [field]: value }));
    };

    const handlePositionChange = (axis: keyof LocalCoord, value: number | number[]) => {
        const newValue = Array.isArray(value) ? value[0] : value;
        setPosition(prev => ({ ...prev, [axis]: newValue }));
    };
    
    const handleTextPositionChange = (axis: keyof LocalCoord, value: string) => {
        const numValue = parseFloat(value) || 0; // Default to 0 if invalid
        setPosition(prev => ({ ...prev, [axis]: numValue }));
    };
    
    const handleDimensionChange = (dim: keyof typeof dimensions, value: string) => {
         const numValue = parseFloat(value);
         // Only update if valid positive number
         if (!isNaN(numValue) && numValue >= 0) {
             setDimensions(prev => ({ ...prev, [dim]: numValue }));
         } else if (value === '') { // Allow clearing field, treat as 0
             setDimensions(prev => ({ ...prev, [dim]: 0 }));
         }
    };

    const handleDimensionSliderChange = (dim: keyof typeof dimensions, value: number | number[]) => {
        const newValue = Array.isArray(value) ? value[0] : value;
        setDimensions(prev => ({ ...prev, [dim]: newValue }));
    };

    const handleSave = () => {
        if (!objectToEdit) return;

        const updatePayload: Partial<SceneObject> & { id: string } = {
            id: objectId,
            ...editedObject, // Includes color, class
            position: position,
            width: dimensions.width,
            length: dimensions.length,
            height: dimensions.height,
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
                        <SectionTitle variant="subtitle2">Position (Meters)</SectionTitle>
                        <ControlRow>
                            <SliderLabel>X (East/West)</SliderLabel>
                            <StyledSlider
                                value={position.x}
                                onChange={(_, value) => handlePositionChange('x', value)}
                                min={-100}
                                max={100}
                                step={0.1}
                                valueLabelDisplay="auto"
                            />
                            <ValueDisplay>{position.x.toFixed(2)}m</ValueDisplay>
                        </ControlRow>
                        <ControlRow>
                            <SliderLabel>Y (North/South)</SliderLabel>
                            <StyledSlider
                                value={position.y}
                                onChange={(_, value) => handlePositionChange('y', value)}
                                min={-100}
                                max={100}
                                step={0.1}
                                valueLabelDisplay="auto"
                            />
                            <ValueDisplay>{position.y.toFixed(2)}m</ValueDisplay>
                        </ControlRow>
                        <ControlRow>
                            <SliderLabel>Z (Up/Down)</SliderLabel>
                            <StyledSlider
                                value={position.z}
                                onChange={(_, value) => handlePositionChange('z', value)}
                                min={0}
                                max={100}
                                step={0.1}
                                valueLabelDisplay="auto"
                            />
                            <ValueDisplay>{position.z.toFixed(2)}m</ValueDisplay>
                        </ControlRow>
                    </Box>
                     
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                    <Box>
                        <SectionTitle variant="subtitle2">Dimensions (Meters)</SectionTitle>
                        <ControlRow>
                            <SliderLabel>Width</SliderLabel>
                            <StyledSlider
                                value={dimensions.width}
                                onChange={(_, value) => handleDimensionSliderChange('width', value)}
                                min={0.1}
                                max={50}
                                step={0.1}
                                valueLabelDisplay="auto"
                            />
                            <ValueDisplay>{dimensions.width.toFixed(2)}m</ValueDisplay>
                        </ControlRow>
                        <ControlRow>
                            <SliderLabel>Length</SliderLabel>
                            <StyledSlider
                                value={dimensions.length}
                                onChange={(_, value) => handleDimensionSliderChange('length', value)}
                                min={0.1}
                                max={50}
                                step={0.1}
                                valueLabelDisplay="auto"
                            />
                            <ValueDisplay>{dimensions.length.toFixed(2)}m</ValueDisplay>
                        </ControlRow>
                        <ControlRow>
                            <SliderLabel>Height</SliderLabel>
                            <StyledSlider
                                value={dimensions.height}
                                onChange={(_, value) => handleDimensionSliderChange('height', value)}
                                min={0.1}
                                max={50}
                                step={0.1}
                                valueLabelDisplay="auto"
                            />
                            <ValueDisplay>{dimensions.height.toFixed(2)}m</ValueDisplay>
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
            </StyledDialogActions>
        </StyledDialog>
    );
};

export default SceneObjectEditModal;
