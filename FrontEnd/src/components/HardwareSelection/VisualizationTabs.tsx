import React, { useState, useMemo } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { useMission } from '../../context/MissionContext';
import { calculateFieldOfView, getEffectiveFocalLength } from '../../utils/sensorCalculations';
import DroneSceneViewerWrapper from './DroneSceneViewerWrapper';

// Simple TabPanel component (can be moved to a shared utils/components file later)
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
      id={`visualization-tabpanel-${index}`}
      aria-labelledby={`visualization-tab-${index}`}
      {...other}
      style={{ height: '100%', padding: '16px', backgroundColor: '#080808' }} // Darker background
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `visualization-tab-${index}`,
    'aria-controls': `visualization-tabpanel-${index}`,
  };
}

const VisualizationTabs: React.FC = () => {
    const [activeTab, setActiveTab] = useState(1); // Default to 3D view (index 1)
    const { state: missionState } = useMission();
    const { hardware } = missionState;
    const camera = hardware?.cameraDetails;
    const lens = hardware?.lensDetails;
    const drone = hardware?.droneDetails;

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Calculate FOV for 2D view
    const fovDegrees = useMemo(() => {
        if (!camera || !lens) return { h: 0, v: 0 };
        const focalLength = getEffectiveFocalLength(lens);
        const hFOV = calculateFieldOfView(focalLength, camera.sensorWidth);
        const vFOV = calculateFieldOfView(focalLength, camera.sensorHeight);
        return { h: hFOV, v: vFOV };
    }, [camera, lens]);

    // Style for the 2D FOV indicator (simplified example)
    const fovIndicatorStyle = useMemo(() => {
        if (!camera || !lens || fovDegrees.h <= 0) return {};
        
        // Simple triangle representation based on horizontal FOV
        const widthScale = Math.tan(fovDegrees.h * Math.PI / 180 / 2) * 2; // Scale based on angle tangent
        const height = 150; // Fixed height for indicator
        const width = Math.min(300, height * widthScale); // Calculate width, capped
        
        return {
            width: 0,
            height: 0,
            borderLeft: `${width / 2}px solid transparent`,
            borderRight: `${width / 2}px solid transparent`,
            borderTop: `${height}px solid rgba(79, 195, 247, 0.3)`, // Use blue theme color
            position: 'absolute' as 'absolute',
            bottom: '60px', // Position below drone image
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.9
        };
    }, [camera, lens, fovDegrees.h]);

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            width: '100%', 
            bgcolor: '#080808', // Darker background
            borderRadius: 1
        }}>
            <Box sx={{ borderBottom: '1px solid #222222' }}>
                <Tabs 
                    value={activeTab} 
                    onChange={handleTabChange} 
                    aria-label="Visualization view tabs" 
                    variant="fullWidth"
                    sx={{
                        minHeight: '40px',
                        backgroundColor: '#0a0a0a', // Darker tab background
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#4fc3f7'
                        },
                        '& .MuiTab-root': {
                            color: 'rgba(255, 255, 255, 0.6)',
                            minHeight: '40px',
                            '&.Mui-selected': {
                                color: '#4fc3f7'
                            }
                        }
                    }}
                >
                    <Tab label="2D View" {...a11yProps(0)} />
                    <Tab label="3D View" {...a11yProps(1)} />
                </Tabs>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'auto', position: 'relative' }}> {/* Add relative positioning */} 
                <TabPanel value={activeTab} index={0}>
                    {/* 2D Drone View */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        position: 'relative', // Needed for absolute positioning of FOV
                        backgroundColor: '#050505' // Even darker background
                    }}>
                         {drone?.imageUrl && (
                             <Box 
                                component="img"
                                src={drone.imageUrl}
                                alt={`${drone.brand} ${drone.name} top view`}
                                sx={{ 
                                    maxHeight: '150px', // Limit drone image size
                                    maxWidth: '80%',
                                    objectFit: 'contain',
                                    mb: '70px', // Margin to leave space for FOV indicator
                                    filter: 'drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.5))' // Add shadow for depth
                                }}
                            />
                         )}
                         {camera && lens ? (
                             <Box sx={fovIndicatorStyle} />
                         ) : (
                             <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                 Select drone, camera, and lens to see visualization.
                             </Typography>
                         )}
                    </Box>
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                     {/* Integrate 3D Drone Scene Viewer */}
                     <Box sx={{ height: '100%', width: '100%', backgroundColor: '#050505' }}> {/* Ensure container takes full space */} 
                        <DroneSceneViewerWrapper />
                     </Box>
                </TabPanel>
            </Box>
        </Box>
    );
};

export default VisualizationTabs; 