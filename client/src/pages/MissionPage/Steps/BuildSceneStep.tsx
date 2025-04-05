import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    TextField, 
    Button, 
    Stack, 
    Select, 
    MenuItem, 
    InputLabel, 
    FormControl, 
    Divider, 
    List, 
    ListItem, 
    ListItemAvatar, 
    Avatar, 
    ListItemText, 
    ListItemSecondaryAction, 
    IconButton, 
    Snackbar, 
    Alert,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    Grid
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useMission } from '../../../context/MissionContext';
import { generateUUID } from '../../../utils/coordinateUtils';
import { SceneObject } from '../../../context/MissionContext';

// Styled components for industrial UI
const SectionTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 500,
    fontSize: '0.95rem',
    letterSpacing: '0.5px',
    marginBottom: theme.spacing(2),
    color: '#4fc3f7',
    textTransform: 'uppercase',
}));

const SectionSubtitle = styled(Typography)(({ theme }) => ({
    fontWeight: 500,
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing(1),
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        color: 'rgba(255, 255, 255, 0.9)',
        '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.15)'
        },
        '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.3)'
        },
        '&.Mui-focused fieldset': {
            borderColor: '#4fc3f7'
        },
    },
    '& .MuiInputLabel-root': {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.8rem',
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: '#4fc3f7',
    },
    '& .MuiInputBase-input': {
        fontSize: '0.85rem',
    },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
    '& .MuiInputLabel-root': {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.8rem',
    },
    '& .MuiOutlinedInput-root': {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '0.85rem',
        '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.15)'
        },
        '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.3)'
        },
        '&.Mui-focused fieldset': {
            borderColor: '#4fc3f7'
        },
    },
    '& .MuiSelect-icon': {
        color: 'rgba(255, 255, 255, 0.5)'
    },
}));

const ActionButton = styled(Button)(({ theme }) => ({
    textTransform: 'none',
    fontSize: '0.85rem',
    fontWeight: 500,
    borderRadius: '4px',
    padding: theme.spacing(0.75, 2),
    '&.MuiButton-containedPrimary': {
        backgroundColor: '#4fc3f7',
        color: '#000',
        '&:hover': {
            backgroundColor: '#81d4fa',
        },
    },
    '&.MuiButton-containedSecondary': {
        backgroundColor: '#ff3366',
        color: '#000',
        '&:hover': {
            backgroundColor: '#ff5c85',
        },
    },
    '&.MuiButton-outlined': {
        borderColor: 'rgba(255, 255, 255, 0.3)',
        color: 'rgba(255, 255, 255, 0.9)',
        '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.5)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
    },
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderRadius: '4px',
    marginBottom: theme.spacing(1),
    '&:hover': {
        backgroundColor: 'rgba(40, 40, 40, 0.8)',
    },
}));

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
    '& .MuiToggleButton-root': {
        color: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        textTransform: 'none',
        fontSize: '0.85rem',
        padding: theme.spacing(0.5, 1.5),
        '&.Mui-selected': {
            backgroundColor: 'rgba(79, 195, 247, 0.15)',
            color: '#4fc3f7',
            borderColor: 'rgba(79, 195, 247, 0.5)',
        },
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
    },
}));

const BuildSceneStep: React.FC = () => {
    const { state, dispatch } = useMission();
    const { sceneObjects } = state;

    const [width, setWidth] = useState<number>(10);
    const [length, setLength] = useState<number>(10);
    const [height, setHeight] = useState<number>(10);
    const [color, setColor] = useState<string>('#888888');
    const objectType = 'box';
    const [objectClass, setObjectClass] = useState<'neutral' | 'obstacle' | 'asset'>('neutral');
    
    const [actionTab, setActionTab] = useState<'objects' | 'import' | 'export'>('objects');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    const [exportFormat, setExportFormat] = useState<string>('geojson');

    const buildSceneObjects = state.sceneObjects.filter(obj => 
        obj.source === 'build-scene-ui' || obj.type === 'box'
    );

    const handleDimensionChange = (setter: React.Dispatch<React.SetStateAction<number>>, value: string) => {
        if (value === '') {
            setter(0);
            return;
        }
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setter(numValue);
        }
    };

    const handleActionTabChange = (
        event: React.MouseEvent<HTMLElement>,
        newTab: 'objects' | 'import' | 'export' | null,
    ) => {
        if (newTab !== null) {
            setActionTab(newTab);
        }
    };

    const handleCreateObject = () => {
        setIsLoading(true);
        setErrorMessage('');
        
        const widthMeters = width;
        const lengthMeters = length;
        const heightMeters = height;
        const selectedColor = color;
        const selectedClass = objectClass;

        if (widthMeters <= 0 || lengthMeters <= 0 || heightMeters <= 0) {
            setErrorMessage("Dimensions must be positive numbers.");
            setIsLoading(false);
            return;
        }

        const newObject: SceneObject = {
            id: generateUUID(),
            type: objectType,
            position: { x: 0, y: 0, z: heightMeters / 2 },
            rotation: { x: 0, y: 0, z: 0 },
            width: widthMeters,
            length: lengthMeters,
            height: heightMeters,
            color: selectedColor,
            class: selectedClass,
            createdAt: new Date().toISOString(),
            source: 'build-scene-ui'
        };

        try {
            dispatch({ type: 'ADD_SCENE_OBJECT', payload: newObject });
            setSuccessMessage('Object created successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Error dispatching ADD_SCENE_OBJECT:", error);
            setErrorMessage("Failed to add object to state.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveObject = (id: string) => {
        try {
            setIsLoading(true);
            dispatch({ type: 'REMOVE_SCENE_OBJECT', payload: id });
            setSuccessMessage('Object removed successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error removing object:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to remove object');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectObject = (id: string) => {
        console.log(`Selected object: ${id}`);
    };
    
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        
        try {
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.geojson') || fileName.endsWith('.kml')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const fileContent = e.target?.result as string;
                        if (!fileContent) throw new Error("Failed to read file content.");
                        
                        const importType = fileName.endsWith('.geojson') ? 'GeoJSON' : 'KML';
                        console.log(`Processing imported ${importType} data...`);
                        setSuccessMessage(`${importType} file selected. Processing...`);
                        setTimeout(() => {
                            setSuccessMessage(`${importType} data processed successfully (Placeholder)`);
                            setIsLoading(false);
                         }, 1500);

                    } catch (error) {
                        console.error(`Error processing ${fileName}:`, error);
                        setErrorMessage(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        setIsLoading(false);
                    }
                };
                reader.onerror = () => {
                     setErrorMessage('Failed to read the file.');
                     setIsLoading(false);
                }
                reader.readAsText(file);

            } else if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                const objectUrl = URL.createObjectURL(file);
                const uuid = generateUUID();
                
                console.log(`Importing 3D model: ${file.name}, URL: ${objectUrl}`);
                
                const modelObject: SceneObject = {
                    id: uuid,
                    type: 'model',
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    url: objectUrl,
                    createdAt: new Date().toISOString(),
                    source: 'build-scene-import'
                };
                
                dispatch({ type: 'ADD_SCENE_OBJECT', payload: modelObject });
                setSuccessMessage('3D model added to scene. It may take a moment to load.');
                setIsLoading(false);

            } else {
                setErrorMessage(`Unsupported file type: ${fileName}`);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error importing file:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to import file');
            setIsLoading(false);
        }
    };
    
    const handleExportScene = () => {
        if (buildSceneObjects.length === 0) {
            setErrorMessage('No objects created via UI to export');
            return;
        }
        
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        
        try {
            console.log(`Exporting scene in format: ${exportFormat}`);
            console.log('Objects to export:', buildSceneObjects);

            if (exportFormat === 'geojson') {
                const features = buildSceneObjects
                    .filter(obj => obj.type === 'box')
                    .map(obj => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Point', 
                            coordinates: [obj.position.x, obj.position.y]
                        },
                        properties: {
                            id: obj.id,
                            type: obj.type,
                            width: obj.width,
                            length: obj.length,
                            height: obj.height,
                            color: obj.color,
                            positionZ: obj.position.z,
                            createdAt: obj.createdAt,
                            source: obj.source
                        }
                 }));

                const geoJsonData = {
                    type: 'FeatureCollection',
                    features: features
                };

                const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'scene_objects.geojson';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                setSuccessMessage(`Scene exported as GeoJSON successfully`);
            } else {
                 setErrorMessage(`Export format ${exportFormat} not implemented yet.`);
            }
            
            setTimeout(() => {
                setIsLoading(false);
            }, 500);

        } catch (error) {
            console.error('Error exporting scene:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to export scene');
            setIsLoading(false);
        }
    };
    
    const handleContinue = () => {
        if (state.sceneObjects.length === 0) {
            setErrorMessage('Please add or import at least one object before continuing');
            return;
        }
        setErrorMessage('');
        
        console.log('Continue to Hardware Selection');
    };

    useEffect(() => {
        return () => {
            state.sceneObjects.forEach(obj => {
                if (obj.type === 'model' && obj.url && obj.url.startsWith('blob:')) {
                    URL.revokeObjectURL(obj.url);
                }
            });
        };
    }, [state.sceneObjects]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom>Step #2: Build Scene</Typography>
            </Box>

            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Stack spacing={3}>
                    <Box>
                        <SectionTitle variant="h6">Build Scene</SectionTitle>
                        <StyledToggleButtonGroup
                            value={actionTab}
                            exclusive
                            onChange={handleActionTabChange}
                            aria-label="Scene actions"
                            size="small"
                            sx={{ mb: 2 }}
                        >
                            <ToggleButton value="objects" aria-label="Create Objects">
                                <ViewInArIcon sx={{ fontSize: '1rem', mr: 0.5 }} /> Objects
                            </ToggleButton>
                            <ToggleButton value="import" aria-label="Import">
                                <CloudUploadIcon sx={{ fontSize: '1rem', mr: 0.5 }} /> Import
                            </ToggleButton>
                            <ToggleButton value="export" aria-label="Export">
                                <CloudDownloadIcon sx={{ fontSize: '1rem', mr: 0.5 }} /> Export
                            </ToggleButton>
                        </StyledToggleButtonGroup>
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                    {actionTab === 'objects' && (
                        <>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(30, 30, 30, 0.5)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                <Stack spacing={2}>
                                    <Box>
                                        <SectionSubtitle variant="subtitle1">Add Box Object</SectionSubtitle>
                                        <Box display="flex" sx={{ gap: 2 }}>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <StyledTextField
                                                    label="Width (m)"
                                                    type="number"
                                                    value={width || ''}
                                                    onChange={(e) => handleDimensionChange(setWidth, e.target.value)}
                                                    fullWidth
                                                    variant="outlined"
                                                    size="small"
                                                    InputProps={{
                                                        inputProps: { min: 0, step: 0.1 }
                                                    }}
                                                />
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <StyledTextField
                                                    label="Length (m)"
                                                    type="number"
                                                    value={length || ''}
                                                    onChange={(e) => handleDimensionChange(setLength, e.target.value)}
                                                    fullWidth
                                                    variant="outlined"
                                                    size="small"
                                                    InputProps={{
                                                        inputProps: { min: 0, step: 0.1 }
                                                    }}
                                                />
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <StyledTextField
                                                    label="Height (m)"
                                                    type="number"
                                                    value={height || ''}
                                                    onChange={(e) => handleDimensionChange(setHeight, e.target.value)}
                                                    fullWidth
                                                    variant="outlined"
                                                    size="small"
                                                    InputProps={{
                                                        inputProps: { min: 0, step: 0.1 }
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>

                                    <Box>
                                        <Box display="flex" sx={{ gap: 2 }}>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <StyledFormControl fullWidth size="small">
                                                    <InputLabel id="color-select-label">Color</InputLabel>
                                                    <Select
                                                        labelId="color-select-label"
                                                        value={color}
                                                        label="Color"
                                                        onChange={(e) => setColor(e.target.value as string)}
                                                        MenuProps={{
                                                            PaperProps: {
                                                                sx: {
                                                                    bgcolor: 'rgba(21, 21, 21, 0.97)',
                                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
                                                                    '& .MuiMenuItem-root': {
                                                                        color: 'rgba(255, 255, 255, 0.9)',
                                                                        fontSize: '0.85rem',
                                                                    }
                                                                }
                                                            }
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
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <StyledFormControl fullWidth size="small">
                                                    <InputLabel id="class-select-label">Class</InputLabel>
                                                    <Select
                                                        labelId="class-select-label"
                                                        value={objectClass}
                                                        label="Class"
                                                        onChange={(e) => setObjectClass(e.target.value as 'neutral' | 'obstacle' | 'asset')}
                                                        MenuProps={{
                                                            PaperProps: {
                                                                sx: {
                                                                    bgcolor: 'rgba(21, 21, 21, 0.97)',
                                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
                                                                    '& .MuiMenuItem-root': {
                                                                        color: 'rgba(255, 255, 255, 0.9)',
                                                                        fontSize: '0.85rem',
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <MenuItem value="neutral">Neutral</MenuItem>
                                                        <MenuItem value="obstacle">Obstacle</MenuItem>
                                                        <MenuItem value="asset">Asset</MenuItem>
                                                    </Select>
                                                </StyledFormControl>
                                            </Box>
                                        </Box>
                                    </Box>

                                    <Box>
                                        <ActionButton
                                            variant="contained"
                                            color="primary"
                                            onClick={handleCreateObject}
                                            startIcon={<AddCircleOutlineIcon />}
                                            disabled={isLoading}
                                            fullWidth
                                        >
                                            Add Object
                                        </ActionButton>
                                    </Box>
                                </Stack>
                            </Paper>

                            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                            <Box>
                                <SectionSubtitle variant="subtitle1">Object List</SectionSubtitle>
                                {buildSceneObjects.length > 0 ? (
                                    <List sx={{ p: 0 }}>
                                        {buildSceneObjects.map((obj) => (
                                            <StyledListItem key={obj.id}>
                                                <ListItemAvatar>
                                                    <Avatar 
                                                        sx={{ 
                                                            bgcolor: obj.color || '#888888', 
                                                            width: 30, 
                                                            height: 30 
                                                        }}
                                                    >
                                                        <ViewInArIcon fontSize="small" />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                                            {obj.type.charAt(0).toUpperCase() + obj.type.slice(1)}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: '"Roboto Mono", monospace' }}>
                                                            {`${obj.width?.toFixed(1)}m × ${obj.length?.toFixed(1)}m × ${obj.height?.toFixed(1)}m`}
                                                        </Typography>
                                                    }
                                                />
                                                <ListItemSecondaryAction>
                                                    <IconButton 
                                                        edge="end" 
                                                        aria-label="delete"
                                                        onClick={() => handleRemoveObject(obj.id)}
                                                        size="small"
                                                        sx={{ 
                                                            color: 'rgba(255, 51, 102, 0.7)',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(255, 51, 102, 0.15)',
                                                                color: '#ff3366'
                                                            }
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </StyledListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" align="center" sx={{ color: 'rgba(255, 255, 255, 0.6)', p: 2 }}>
                                        No objects added yet
                                    </Typography>
                                )}
                            </Box>
                        </>
                    )}

                    {actionTab === 'import' && (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>Import Data</Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Add external data like GeoJSON features (buildings, areas), KML placemarks, or 3D models (GLB/GLTF) to the scene.
                            </Typography>
                            
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<CloudUploadIcon />}
                                disabled={isLoading}
                                fullWidth
                            >
                                Select File to Import
                                <input
                                    type="file"
                                    hidden
                                    onChange={handleFileImport}
                                    accept=".geojson,.kml,.glb,.gltf"
                                />
                            </Button>
                            
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                Supported: GeoJSON, KML, GLB, GLTF
                            </Typography>
                            
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Imported models are typically placed at the scene origin (0,0,0). GeoJSON/KML features will be processed based on their coordinates.
                            </Alert>
                        </Paper>
                    )}

                    {actionTab === 'export' && (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>Export Scene Objects</Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Export the objects created via the UI in a selected format. Note: Imported models are not typically re-exported.
                            </Typography>
                            
                            <Stack spacing={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="export-format-label">Export Format</InputLabel>
                                    <Select 
                                         labelId="export-format-label"
                                         value={exportFormat} 
                                         label="Export Format" 
                                         onChange={(e) => setExportFormat(e.target.value as string)}
                                     >
                                        <MenuItem value="geojson">GeoJSON (Box Features)</MenuItem>
                                    </Select>
                                </FormControl>
                                
                                <Button 
                                    variant="outlined" 
                                    startIcon={<CloudDownloadIcon />} 
                                    onClick={handleExportScene} 
                                    disabled={isLoading || buildSceneObjects.length === 0} 
                                    fullWidth
                                >
                                    Export Objects
                                </Button>
                            </Stack>
                            
                            {buildSceneObjects.length === 0 && <Alert severity="warning" sx={{ mt: 2 }}>No UI-created objects available to export.</Alert>}
                        </Paper>
                    )}
                </Stack>
            </Box>
            
            <Snackbar 
                open={Boolean(successMessage)} 
                autoHideDuration={3000} 
                onClose={() => setSuccessMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ width: '100%' }}>
                    {successMessage}
                </Alert>
            </Snackbar>

             <Snackbar 
                open={Boolean(errorMessage) && actionTab !== 'objects'}
                autoHideDuration={6000} 
                onClose={() => setErrorMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
             >
                 <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ width: '100%' }}>
                    {errorMessage}
                </Alert>
            </Snackbar>

            {/* Informational Text Box at the bottom */} 
            <Box sx={{ p: 2, mt: 'auto' }}> {/* Push to bottom */} 
              <Box 
                sx={{
                  p: 1.5, // Padding inside the box
                  bgcolor: 'rgba(30, 30, 30, 0.8)', // Dark background
                  border: '1px solid rgba(255, 255, 255, 0.1)', // Subtle border
                  borderRadius: '4px'
                }}
              >
                <Typography 
                  variant="caption" // Smaller text variant
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.75)', // Lighter text 
                    display: 'block', // Ensure it behaves like a block
                    overflowWrap: 'break-word' // Ensure text wraps and breaks words if needed
                  }}
                >
                  **Interaction Tips:** Double-click an object in the 3D view to edit its properties. Hold **Shift** + Double-click a box object to resize it using the handles.
                </Typography>
              </Box>
            </Box>
        </Box>
    );
};

export default BuildSceneStep; 