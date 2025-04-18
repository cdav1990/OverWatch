import React, { useState, lazy, Suspense } from 'react';
import {
    Box,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    Stack,
    CircularProgress
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import RouteIcon from '@mui/icons-material/Route';
import CategoryIcon from '@mui/icons-material/Category';

// Import Context Provider
import { MissionProvider } from '../../context/MissionContext'; // Assuming path is correct
import BabylonViewer from '../../components/BabylonViewer/BabylonViewer'; // Import BabylonViewer

// Lazy load step components
const MissionPreChecksStep = lazy(() => import('../MissionPage/Steps/MissionPreChecksStep'));
const BuildSceneStep = lazy(() => import('../MissionPage/Steps/BuildSceneStep'));
const MissionPlanningStep = lazy(() => import('../MissionPage/Steps/MissionPlanningStep'));

type ActiveStepPane = 'pre-checks' | 'build-scene' | 'mission-planning';

const LoadingFallback = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
        <CircularProgress />
    </Box>
);

const MissionsPage: React.FC = () => {
    const [activeStepPane, setActiveStepPane] = useState<ActiveStepPane>('pre-checks');

    const handlePaneChange = (
        event: React.MouseEvent<HTMLElement>,
        newPane: ActiveStepPane | null,
    ) => {
        if (newPane !== null) {
            setActiveStepPane(newPane);
        }
    };

    return (
        // Wrap with MissionProvider to provide context to steps
        <MissionProvider>
            {/* Outer Box using Flex Row */}
            <Box sx={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 64px)' }}> {/* Adjust height based on Navbar */}
                {/* Left Panel Box */}
                <Box
                    sx={{
                        width: 550, // Fixed width like in MissionPlanningLayout
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'rgba(21, 21, 21, 0.97)', // Match theme
                        borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    {/* Top Control Bar (Mimicking the toggle group) */}
                    <Paper
                        square
                        elevation={1}
                        sx={{
                            p: 1,
                            backgroundColor: 'transparent', // Inherit from parent Box
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            flexShrink: 0
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <ToggleButtonGroup
                                value={activeStepPane}
                                exclusive
                                onChange={handlePaneChange}
                                aria-label="Control Pane Selection"
                                size="small" // Smaller size might fit better without the full toolbar
                                sx={{
                                    '& .MuiToggleButton-root': {
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        borderColor: 'rgba(255, 255, 255, 0.12)',
                                        textTransform: 'none',
                                        fontSize: '0.85rem',
                                        py: 0.75,
                                        '&.Mui-selected': {
                                            backgroundColor: 'rgba(79, 195, 247, 0.15)',
                                            color: '#4fc3f7',
                                            borderColor: 'rgba(79, 195, 247, 0.5)',
                                        },
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        },
                                    }
                                }}
                            >
                                <ToggleButton value="pre-checks" aria-label="Pre-Checks">
                                    <FlightTakeoffIcon sx={{ mr: 0.5, fontSize: '1rem' }}/> Pre-Checks
                                </ToggleButton>
                                <ToggleButton value="build-scene" aria-label="Build Scene">
                                    <CategoryIcon sx={{ mr: 0.5, fontSize: '1rem' }}/> Build Scene
                                </ToggleButton>
                                <ToggleButton value="mission-planning" aria-label="Mission Planning">
                                    <RouteIcon sx={{ mr: 0.5, fontSize: '1rem' }}/> Mission Planning
                                </ToggleButton>
                            </ToggleButtonGroup>
                            {/* Add other controls here if needed, like mission selection */}
                        </Stack>
                    </Paper>

                    {/* Step Content Area */}
                    <Box
                        sx={{
                            flexGrow: 1,
                            overflowY: 'auto', // Allow step content to scroll
                            p: 2, // Add padding around the step content
                            backgroundColor: 'rgba(10, 15, 20, 0.90)', // Match Dashboard background color
                            color: 'white' // Ensure text is readable
                        }}
                    >
                        <Suspense fallback={<LoadingFallback />}>
                            {activeStepPane === 'pre-checks' && <MissionPreChecksStep />}
                            {activeStepPane === 'build-scene' && <BuildSceneStep />}
                            {activeStepPane === 'mission-planning' && <MissionPlanningStep />}
                        </Suspense>
                    </Box>
                </Box>

                {/* Right Placeholder Box (for future 3D viewer) */}
                <Box
                    sx={{
                        flexGrow: 1, // Takes remaining horizontal space
                        height: '100%', // Fill vertical height
                        backgroundColor: 'rgba(5, 8, 10, 0.9)', // Dark background placeholder
                        // Add a border or other styling to visualize the area if needed
                        // borderLeft: '2px dashed grey'
                    }}
                >
                    {/* Content for this placeholder area can be added later */}
                    <BabylonViewer /> {/* Render the viewer here */}
                </Box>
            </Box>
        </MissionProvider>
    );
};

export default MissionsPage; 