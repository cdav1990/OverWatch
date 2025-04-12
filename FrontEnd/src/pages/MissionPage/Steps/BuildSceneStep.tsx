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
    Grid,
    CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useMission } from '../../../context/MissionContext';
import { generateUUID } from '../../../utils/coordinateUtils';
import { SceneObject } from '../../../context/MissionContext';
import { metersToFeet, feetToMeters } from '../../../utils/sensorCalculations';
import { addShipToScene, addDockToScene } from '../../../utils/sceneHelpers';

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

// Define available pre-configured models
interface PreConfiguredModel {
    id: string;
    name: string;
    type: 'ship' | 'box' | 'model' | 'dock';
    width?: number;
    length?: number;
    height?: number;
    realWorldLength?: number; // Add real-world length in feet
    scale?: number;
    path?: string;
    description: string;
}

const PRE_CONFIGURED_MODELS: PreConfiguredModel[] = [
    {
        id: 'uss_gerald_ford',
        name: 'USS Gerald R. Ford (Aircraft Carrier)',
        type: 'ship',
        width: 256,
        length: 1106,
        height: 250,
        realWorldLength: 1106, // In feet
        description: 'USS Gerald R. Ford (CVN-78) is the lead ship of her class of aircraft carriers.'
    },
    {
        id: 'cargo_dockyard',
        name: 'Cargo Dockyard',
        type: 'dock',
        width: 150,
        length: 500,
        height: 50,
        realWorldLength: 500, // In feet
        description: 'A detailed cargo dockyard model with warehouses and loading facilities.'
    },
    // Add more pre-configured models as needed
];

// Available model directories in public/models
const AVAILABLE_MODELS = [
    { id: 'uss_gerald_ford', name: 'USS Gerald R. Ford', path: '/models/uss_gerald_ford/Model/uss_gerald_r_ford.fbx', realWorldLength: 1106 },
    { id: 'scene_gltf', name: 'Default Scene', path: '/models/scene.gltf' }
];

const BuildSceneStep: React.FC = () => {
    const { state, dispatch } = useMission();
    const { sceneObjects } = state;

    const [width, setWidth] = useState<number>(33);
    const [length, setLength] = useState<number>(33);
    const [height, setHeight] = useState<number>(33);
    const [color, setColor] = useState<string>('#888888');
    const objectType = 'box';
    const [objectClass, setObjectClass] = useState<'neutral' | 'obstacle' | 'asset'>('neutral');
    
    const [actionTab, setActionTab] = useState<'objects' | 'import' | 'export'>('objects');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [importingModel, setImportingModel] = useState<boolean>(false);

    const [exportFormat, setExportFormat] = useState<string>('geojson');
    
    // New state for pre-configured models and model selection
    const [selectedPreConfigModel, setSelectedPreConfigModel] = useState<string>('');
    const [selectedModelPath, setSelectedModelPath] = useState<string>('');

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
        
        const widthFeet = width;
        const lengthFeet = length;
        const heightFeet = height;
        
        const widthMeters = feetToMeters(widthFeet);
        const lengthMeters = feetToMeters(lengthFeet);
        const heightMeters = feetToMeters(heightFeet);
        
        const selectedColor = color;
        const selectedClass = objectClass;

        if (widthFeet <= 0 || lengthFeet <= 0 || heightFeet <= 0) {
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

    const handleAddPreConfiguredModel = () => {
        if (!selectedPreConfigModel) {
            setErrorMessage('Please select a pre-configured model first');
            return;
        }

        setImportingModel(true);
        setErrorMessage('');
        
        const selectedModel = PRE_CONFIGURED_MODELS.find(model => model.id === selectedPreConfigModel);
        if (!selectedModel) {
            setErrorMessage('Selected model configuration not found');
            setImportingModel(false);
            return;
        }
        
        try {
            if (selectedModel.type === 'ship') {
                // Use the ship helper function
                addShipToScene(
                    dispatch, 
                    { x: 0, y: 0, z: 0 }, 
                    { x: 0, y: 0, z: 0 },
                    { x: 1, y: 1, z: 1 },
                    selectedModel.realWorldLength
                );
            } else if (selectedModel.type === 'dock') {
                // Use the dock helper function
                addDockToScene(
                    dispatch, 
                    { x: 0, y: 0, z: 0 }, 
                    { x: 0, y: 0, z: 0 },
                    { x: 1, y: 1, z: 1 },
                    selectedModel.realWorldLength
                );
            } else {
                // Handle other model types here
                // Convert dimensions from feet to meters for storage
                const widthMeters = selectedModel.width ? feetToMeters(selectedModel.width) : undefined;
                const lengthMeters = selectedModel.length ? feetToMeters(selectedModel.length) : undefined;
                const heightMeters = selectedModel.height ? feetToMeters(selectedModel.height) : undefined;
                
                const newObject: SceneObject = {
                    id: generateUUID(),
                    type: selectedModel.type,
                    class: 'asset',
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    width: widthMeters,
                    length: lengthMeters,
                    height: heightMeters,
                    // Add real-world length (in feet) for accurate scaling
                    realWorldLength: selectedModel.realWorldLength,
                    createdAt: new Date().toISOString(),
                    source: 'build-scene-ui'
                };
                
                dispatch({ type: 'ADD_SCENE_OBJECT', payload: newObject });
            }
            
            // Show success message
            setSuccessMessage(`${selectedModel.name} added to scene!`);
            setTimeout(() => setSuccessMessage(''), 3000);
            setImportingModel(false);
            setSelectedPreConfigModel('');
            
        } catch (error) {
            console.error("Error adding pre-configured model:", error);
            setErrorMessage("Failed to add model to scene.");
            setImportingModel(false);
        }
    };

    const handleAddCustomModel = () => {
        if (!selectedModelPath) {
            setErrorMessage('Please select a model first');
            return;
        }

        setImportingModel(true);
        setErrorMessage('');
        
        const selectedModel = AVAILABLE_MODELS.find(model => model.path === selectedModelPath);
        if (!selectedModel) {
            setErrorMessage('Selected model not found');
            setImportingModel(false);
            return;
        }
        
        // Determine the model type based on extension
        const isShip = selectedModelPath.includes('uss_gerald_ford');
        
        try {
            // Set realistic dimensions for known models
            let widthMeters, lengthMeters, heightMeters, realWorldLength;
            
            if (isShip) {
                // USS Gerald Ford dimensions
                widthMeters = feetToMeters(256);  // Real width in feet
                lengthMeters = feetToMeters(1106); // Real length in feet
                heightMeters = feetToMeters(250);  // Approximate height in feet including tower
                realWorldLength = 1106;            // Length in feet for scaling
            } else {
                // Default dimensions for other models
                widthMeters = 10;
                lengthMeters = 10;
                heightMeters = 10;
            }
            
            const newObject: SceneObject = {
                id: generateUUID(),
                type: isShip ? 'ship' : 'model',
                class: 'asset',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                width: widthMeters,
                length: lengthMeters,
                height: heightMeters,
                // Add real-world length if available
                realWorldLength: selectedModel.realWorldLength,
                url: !isShip ? selectedModelPath : undefined,
                createdAt: new Date().toISOString(),
                source: 'build-scene-import'
            };
            
            // Simulate loading delay for better UX
            setTimeout(() => {
                dispatch({ type: 'ADD_SCENE_OBJECT', payload: newObject });
                setSuccessMessage(`${selectedModel.name} added to scene!`);
                setTimeout(() => setSuccessMessage(''), 3000);
                setImportingModel(false);
                setSelectedModelPath('');
            }, 1500);
            
            // Notify context that a heavy operation is starting (to show loading in viewer)
            dispatch({ type: 'START_HEAVY_OPERATION' });
            
            // End the heavy operation indicator after model should be loaded
            setTimeout(() => {
                dispatch({ type: 'END_HEAVY_OPERATION' });
            }, 3000);
            
        } catch (error) {
            console.error("Error dispatching ADD_SCENE_OBJECT for model:", error);
            setErrorMessage("Failed to add model to scene.");
            setImportingModel(false);
        }
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
                                                    label="Width (ft)"
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
                                                    label="Length (ft)"
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
                                                    label="Height (ft)"
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
                                                        <MenuItem value="neutral">Neutral (Grey)</MenuItem>
                                                        <MenuItem value="obstacle">Obstacle (Red)</MenuItem>
                                                        <MenuItem value="asset">Asset (Green)</MenuItem>
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

                            {/* New Pre-configured Models Section */}
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(30, 30, 30, 0.5)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                <Stack spacing={2}>
                                    <Box>
                                        <SectionSubtitle variant="subtitle1">
                                            <DirectionsBoatIcon sx={{ fontSize: '1rem', mr: 0.5, verticalAlign: 'text-top' }} />
                                            Pre-Configured Scenes
                                        </SectionSubtitle>
                                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', mb: 1 }}>
                                            Add complete pre-configured objects with realistic scale and appearance
                                        </Typography>
                                        
                                        <StyledFormControl fullWidth size="small">
                                            <InputLabel id="preconfig-model-label">Select Pre-configured Model</InputLabel>
                                            <Select
                                                labelId="preconfig-model-label"
                                                value={selectedPreConfigModel}
                                                label="Select Pre-configured Model"
                                                onChange={(e) => setSelectedPreConfigModel(e.target.value as string)}
                                                disabled={importingModel}
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
                                                <MenuItem value="" disabled>Select a pre-configured model</MenuItem>
                                                {PRE_CONFIGURED_MODELS.map(model => (
                                                    <MenuItem key={model.id} value={model.id}>
                                                        {model.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </StyledFormControl>
                                        
                                        <Box sx={{ mt: 1 }}>
                                            <ActionButton
                                                variant="outlined"
                                                onClick={handleAddPreConfiguredModel}
                                                startIcon={importingModel ? <CircularProgress size={18} color="inherit" /> : <DirectionsBoatIcon />}
                                                disabled={importingModel || !selectedPreConfigModel}
                                                fullWidth
                                            >
                                                {importingModel ? 'Adding to Scene...' : 'Add to Scene'}
                                            </ActionButton>
                                        </Box>
                                    </Box>
                                </Stack>
                            </Paper>

                            {/* Custom 3D Model Import Section */}
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(30, 30, 30, 0.5)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                <Stack spacing={2}>
                                    <Box>
                                        <SectionSubtitle variant="subtitle1">
                                            <ModelTrainingIcon sx={{ fontSize: '1rem', mr: 0.5, verticalAlign: 'text-top' }} />
                                            Available 3D Models
                                        </SectionSubtitle>
                                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', mb: 1 }}>
                                            Import models from our model library
                                        </Typography>
                                        
                                        <StyledFormControl fullWidth size="small">
                                            <InputLabel id="model-library-label">Select Model from Library</InputLabel>
                                            <Select
                                                labelId="model-library-label"
                                                value={selectedModelPath}
                                                label="Select Model from Library"
                                                onChange={(e) => setSelectedModelPath(e.target.value as string)}
                                                disabled={importingModel}
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
                                                <MenuItem value="" disabled>Select a model from library</MenuItem>
                                                {AVAILABLE_MODELS.map(model => (
                                                    <MenuItem key={model.id} value={model.path}>
                                                        {model.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </StyledFormControl>
                                        
                                        <Box sx={{ mt: 1 }}>
                                            <ActionButton
                                                variant="outlined"
                                                onClick={handleAddCustomModel}
                                                startIcon={importingModel ? <CircularProgress size={18} color="inherit" /> : <ModelTrainingIcon />}
                                                disabled={importingModel || !selectedModelPath}
                                                fullWidth
                                            >
                                                {importingModel ? 'Importing to Scene...' : 'Import to Scene'}
                                            </ActionButton>
                                        </Box>
                                    </Box>
                                </Stack>
                            </Paper>

                            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                            <Box>
                                <SectionSubtitle variant="subtitle1">Object List</SectionSubtitle>
                                {buildSceneObjects.length > 0 ? (
                                    <List sx={{ p: 0 }}>
                                        {buildSceneObjects.map((obj) => {
                                            const widthFeet = obj.width ? metersToFeet(obj.width) : 0;
                                            const lengthFeet = obj.length ? metersToFeet(obj.length) : 0;
                                            const heightFeet = obj.height ? metersToFeet(obj.height) : 0;
                                            
                                            return (
                                                <StyledListItem key={obj.id}>
                                                    <ListItemAvatar>
                                                        <Avatar 
                                                            sx={{ 
                                                                bgcolor: obj.color || '#888888', 
                                                                width: 30, 
                                                                height: 30 
                                                            }}
                                                        >
                                                            {obj.type === 'ship' ? 
                                                                <DirectionsBoatIcon fontSize="small" /> : 
                                                                obj.type === 'dock' ?
                                                                <LocalShippingIcon fontSize="small" /> :
                                                                <ViewInArIcon fontSize="small" />
                                                            }
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
                                                                {`${widthFeet.toFixed(1)}ft × ${lengthFeet.toFixed(1)}ft × ${heightFeet.toFixed(1)}ft`}
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
                                            );
                                        })}
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