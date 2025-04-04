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
    Tabs,
    Tab,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Card,
    CardContent
} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useMission } from '../../../context/MissionContext';
import { generateUUID } from '../../../utils/coordinateUtils'; // Import UUID generator
import { SceneObject } from '../../../context/MissionContext';
import { LocalCoord } from '../../../types/mission';

// Tab panel component to handle tab content
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`build-scene-tabpanel-${index}`}
            aria-labelledby={`build-scene-tab-${index}`}
            {...other}
            style={{ 
                height: index === value ? 'auto' : 0,
                overflow: 'auto',
                flex: index === value ? 1 : 0
            }}
        >
            {value === index && (
                <Box sx={{ p: 2 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const BuildSceneStep: React.FC = () => {
    const { state, dispatch } = useMission();
    const [width, setWidth] = useState<number>(100);
    const [length, setLength] = useState<number>(100);
    const [height, setHeight] = useState<number>(100);
    const [color, setColor] = useState<string>('blue'); // Default color
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    
    // Tab state
    const [activeTab, setActiveTab] = useState<number>(0);
    
    // Accordion expansion states
    const [objectInfoExpanded, setObjectInfoExpanded] = useState<boolean>(true);
    const [objectListExpanded, setObjectListExpanded] = useState<boolean>(true);
    
    // Export settings
    const [exportFormat, setExportFormat] = useState<string>('glb');

    // Filter scene objects created from build-scene
    const buildSceneObjects = state.sceneObjects.filter(obj => 
        obj.source === 'build-scene-ui' || obj.type === 'box'
    );

    const handleCreateObject = () => {
        setIsLoading(true);
        setErrorMessage('');
        
        try {
            // Generate UUID for the object
            const uuid = generateUUID();
            
            // Calculate offset based on existing objects to prevent stacking
            const objectCount = buildSceneObjects.length;
            const offsetX = objectCount * 20; // Offset each object by 20 meters in X
            const offsetZ = objectCount * 10; // Offset each object by 10 meters in Z
            
            // Create object data
            const newObject: SceneObject = {
                id: uuid,
                type: 'box',
                width: width,
                length: length,
                height: height,
                color: color,
                position: {
                    x: offsetX,
                    y: 0, // Ground level
                    z: offsetZ
                },
                rotation: { x: 0, y: 0, z: 0 },
            createdAt: new Date().toISOString(),
            source: 'build-scene-ui'
            };
            
            // Add the object to mission context
            dispatch({ type: 'ADD_SCENE_OBJECT', payload: newObject });
            
            // Show success message
            setSuccessMessage('3D object created successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            
            // Optionally reset fields or provide additional feedback
            // setWidth(100);
            // setLength(100);
            // setHeight(100);
        } catch (error) {
            console.error('Error creating 3D object:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to create 3D object');
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
        // Here you would implement selection logic
        console.log(`Selected object: ${id}`);
    };
    
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        setIsLoading(true);
        
        try {
            // Process file based on extension
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.geojson') || fileName.endsWith('.kml')) {
                // Handle GeoJSON or KML import
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        // Generate a unique ID for the imported data
                        const uuid = generateUUID();
                        
                        // This would dispatch an event or action to process the geo data
                        // For now, we'll just show a success message
                        console.log(`Imported ${fileName.endsWith('.geojson') ? 'GeoJSON' : 'KML'} data with ID: ${uuid}`);
                        setSuccessMessage(`${fileName.endsWith('.geojson') ? 'GeoJSON' : 'KML'} data imported successfully`);
                    } catch (error) {
                        setErrorMessage(`Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    } finally {
                        setIsLoading(false);
                    }
                };
                reader.readAsText(file);
            } else if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                // Handle 3D model import
                // Create a temporary URL for the file
                const objectUrl = URL.createObjectURL(file);
                
                // Generate a unique ID for the model
                const uuid = generateUUID();
                
                // Here you would dispatch an event or action to load the 3D model
                console.log(`Importing 3D model with ID: ${uuid}, URL: ${objectUrl}`);
                setSuccessMessage('3D model importing. Please wait...');
                
                // For demonstration, we'll create a placeholder object
                const modelObject: SceneObject = {
                    id: uuid,
                    type: 'model',
                    position: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    url: objectUrl,
                    createdAt: new Date().toISOString(),
                    source: 'build-scene-import'
                };
                
                // Add to mission context
                dispatch({ type: 'ADD_SCENE_OBJECT', payload: modelObject });
                
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
            setErrorMessage('No objects to export');
            return;
        }
        
        setIsLoading(true);
        
        try {
            // Here you would implement the actual export logic
            // For now, we'll just log the objects to be exported
            console.log(`Exporting scene in format: ${exportFormat}`);
            console.log('Objects to export:', buildSceneObjects);
            
            setSuccessMessage(`Exporting scene as ${exportFormat.toUpperCase()}...`);
            
            // Simulate export completion
            setTimeout(() => {
                setIsLoading(false);
                setSuccessMessage(`Scene exported as ${exportFormat.toUpperCase()} successfully`);
            }, 1500);
        } catch (error) {
            console.error('Error exporting scene:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to export scene');
            setIsLoading(false);
        }
    };
    
    const handleContinue = () => {
        if (buildSceneObjects.length === 0) {
            setErrorMessage('Please create at least one object before continuing');
            return;
        }
        
        // Here you would implement the logic to proceed to the next step
        console.log('Continue to Hardware Selection');
        
        // For example:
        // dispatch({ type: 'SET_ACTIVE_CONTROL_PANE', payload: 'hardware-selection' });
    };

    // Use Effect to handle cleanup if component unmounts
    useEffect(() => {
        return () => {
            // Clean up any event listeners or timers here
        };
    }, []);

    return (
        <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1
        }}>
            {/* Header */}
            <Box sx={{ 
                p: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Typography variant="h6">Step #2: Build Scene</Typography>
            </Box>
            
            {/* Tabs */}
            <Tabs 
                value={activeTab} 
                onChange={(e, val) => setActiveTab(val)} 
                aria-label="build scene tabs"
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
                <Tab 
                    icon={<AddBoxIcon />} 
                    label="Objects" 
                    id="build-scene-tab-0"
                    aria-controls="build-scene-tabpanel-0"
                />
                <Tab 
                    icon={<CloudUploadIcon />} 
                    label="Import" 
                    id="build-scene-tab-1"
                    aria-controls="build-scene-tabpanel-1"
                />
                <Tab 
                    icon={<CloudDownloadIcon />} 
                    label="Export" 
                    id="build-scene-tab-2"
                    aria-controls="build-scene-tabpanel-2"
                />
            </Tabs>
            
            {/* Tab Panels Container */}
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                flex: 1, 
                overflow: 'hidden',
                bgcolor: 'background.default'
            }}>
                {/* Objects Tab */}
                <TabPanel value={activeTab} index={0}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                        {/* Object Info Settings Section */}
                        <Accordion 
                            expanded={objectInfoExpanded} 
                            onChange={() => setObjectInfoExpanded(!objectInfoExpanded)}
                            sx={{ bgcolor: 'background.paper' }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="object-info-content"
                                id="object-info-header"
                            >
                                <Typography variant="subtitle1">Object Info Settings</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
            <Stack spacing={2}>
                                    <Typography variant="subtitle2">Object Dimensions</Typography>
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                                            label="Width (m)"
                    type="number"
                    value={width}
                                            onChange={(e) => setWidth(Math.max(5, Math.min(500, parseFloat(e.target.value) || 0)))}
                    size="small"
                                            InputProps={{ inputProps: { min: 5, max: 500, step: 5 } }}
                                            sx={{ flexGrow: 1, minWidth: '120px' }}
                />
                <TextField
                                            label="Length (m)"
                    type="number"
                    value={length}
                                            onChange={(e) => setLength(Math.max(5, Math.min(500, parseFloat(e.target.value) || 0)))}
                    size="small"
                                            InputProps={{ inputProps: { min: 5, max: 500, step: 5 } }}
                                            sx={{ flexGrow: 1, minWidth: '120px' }}
                />
                <TextField
                                            label="Height (m)"
                    type="number"
                    value={height}
                                            onChange={(e) => setHeight(Math.max(5, Math.min(500, parseFloat(e.target.value) || 0)))}
                    size="small"
                                            InputProps={{ inputProps: { min: 5, max: 500, step: 5 } }}
                                            sx={{ flexGrow: 1, minWidth: '120px' }}
                />
                                    </Box>
                                    
                 <FormControl fullWidth size="small">
                                        <InputLabel id="object-color-label">Object Color</InputLabel>
                    <Select
                        labelId="object-color-label"
                        value={color}
                                            label="Object Color"
                        onChange={(e) => setColor(e.target.value as string)}
                    >
                        <MenuItem value="blue">Blue</MenuItem>
                        <MenuItem value="red">Red</MenuItem>
                        <MenuItem value="green">Green</MenuItem>
                        <MenuItem value="yellow">Yellow</MenuItem>
                                            <MenuItem value="purple">Purple</MenuItem>
                        <MenuItem value="orange">Orange</MenuItem>
                        <MenuItem value="gray">Gray</MenuItem>
                        <MenuItem value="white">White</MenuItem>
                    </Select>
                </FormControl>
                                    
                <Button
                    variant="contained"
                    startIcon={<AddBoxIcon />}
                    onClick={handleCreateObject}
                                        disabled={isLoading}
                                        color="success"
                                        fullWidth
                                    >
                                        Create 3D Object
                                    </Button>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                        
                        {/* Scene Objects List */}
                        {buildSceneObjects.length > 0 && (
                            <Accordion 
                                expanded={objectListExpanded} 
                                onChange={() => setObjectListExpanded(!objectListExpanded)}
                                sx={{ 
                                    bgcolor: 'background.paper',
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: objectListExpanded ? '200px' : 'auto'
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    aria-controls="scene-objects-content"
                                    id="scene-objects-header"
                                >
                                    <Typography variant="subtitle1">Scene Objects</Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ overflow: 'auto', flex: 1 }}>
                                    <List dense>
                                        {buildSceneObjects.map((object) => (
                                            <ListItem 
                                                key={object.id}
                                                onClick={() => handleSelectObject(object.id)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    borderRadius: 1,
                                                    '&:hover': {
                                                        bgcolor: 'action.hover'
                                                    }
                                                }}
                                            >
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: object.color || 'gray' }}>
                                                        <AddBoxIcon />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={`Object #${object.id.slice(0, 8)}`}
                                                    secondary={object.type === 'box' 
                                                        ? `${object.width}m × ${object.length}m × ${object.height}m` 
                                                        : object.type === 'model' 
                                                            ? 'Imported 3D Model' 
                                                            : 'Unknown Type'
                                                    }
                                                />
                                                <ListItemSecondaryAction>
                                                    <IconButton 
                                                        edge="end" 
                                                        aria-label="delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveObject(object.id);
                                                        }}
                                                        disabled={isLoading}
                                                        color="error"
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        )}
                    </Box>
                </TabPanel>
                
                {/* Import Tab */}
                <TabPanel value={activeTab} index={1}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Import Data</Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Import GeoJSON, KML, or 3D Model files to add to your scene.
                            </Typography>
                            
                            <Box sx={{ my: 3 }}>
                                <Button
                                    component="label"
                                    variant="contained"
                                    startIcon={<CloudUploadIcon />}
                                    sx={{ mb: 2 }}
                                    fullWidth
                                >
                                    Select File
                                    <input
                                        type="file"
                                        hidden
                                        onChange={handleFileImport}
                                        accept=".geojson,.kml,.glb,.gltf"
                                    />
                                </Button>
                                
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Supported formats: GeoJSON (.geojson), KML (.kml), 3D Models (.glb, .gltf)
                                </Typography>
                            </Box>
                            
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Imported models will be placed at the center of your scene. You can move them after import.
                            </Alert>
                        </CardContent>
                    </Card>
                </TabPanel>
                
                {/* Export Tab */}
                <TabPanel value={activeTab} index={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Export Scene</Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Export your created scene to different file formats.
                            </Typography>
                            
                            <Box sx={{ my: 3 }}>
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel id="export-format-label">Export Format</InputLabel>
                                    <Select
                                        labelId="export-format-label"
                                        value={exportFormat}
                                        label="Export Format"
                                        onChange={(e) => setExportFormat(e.target.value as string)}
                                    >
                                        <MenuItem value="glb">GLB (Binary 3D Model)</MenuItem>
                                        <MenuItem value="gltf">GLTF (3D Model)</MenuItem>
                                        <MenuItem value="geojson">GeoJSON</MenuItem>
                                    </Select>
                                </FormControl>
                                
                                <Button
                                    variant="contained"
                                    startIcon={<CloudDownloadIcon />}
                                    onClick={handleExportScene}
                                    disabled={isLoading || buildSceneObjects.length === 0}
                                    fullWidth
                                >
                                    Export Scene
                                </Button>
                            </Box>
                            
                            {buildSceneObjects.length === 0 && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    Create objects in the scene first to enable export.
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabPanel>
            </Box>
            
            {/* Continue Button */}
            <Box sx={{ 
                p: 2, 
                borderTop: 1, 
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'flex-end'
            }}>
                <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={handleContinue}
                    disabled={isLoading || buildSceneObjects.length === 0}
                    color="primary"
                >
                    Continue to Hardware Selection
                </Button>
            </Box>
            
            {/* Success and Error Messages */}
            <Snackbar 
                open={Boolean(successMessage)} 
                autoHideDuration={3000} 
                onClose={() => setSuccessMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity="success" onClose={() => setSuccessMessage('')}>
                    {successMessage}
                </Alert>
            </Snackbar>

            <Snackbar 
                open={Boolean(errorMessage)} 
                autoHideDuration={5000} 
                onClose={() => setErrorMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity="error" onClose={() => setErrorMessage('')}>
                    {errorMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default BuildSceneStep; 