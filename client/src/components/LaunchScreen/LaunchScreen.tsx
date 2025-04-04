import React from 'react';
import { Box, Typography, Button, Stack, Paper, CircularProgress } from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import FlightIcon from '@mui/icons-material/Flight';

const LaunchScreen: React.FC = () => {
    const { setAppMode } = useAppContext();

    // Placeholder for a potential loading state if needed
    const [loading, setLoading] = React.useState<'dev' | 'ops' | null>(null);

    const handleSelectMode = (mode: 'dev' | 'ops') => {
        setLoading(mode); // Indicate loading for the selected mode
        // Simulate a short delay before setting the mode and transitioning
        setTimeout(() => {
            setAppMode(mode);
            // setLoading(null); // Reset loading if staying on this screen wasn't intended
        }, 500); // 0.5 second delay
    };

    return (
        <Box 
            sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100vh', 
                width: '100vw',
                bgcolor: 'background.default' // Use theme background
            }}
        >
            <Paper 
                elevation={3}
                sx={{ 
                    p: 4, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    borderRadius: 2
                }}
            >
                <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    OVERWATCH
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                    Select Operating Mode
                </Typography>
                
                <Stack direction="row" spacing={3}>
                    <Button 
                        variant="contained" 
                        color="secondary" 
                        size="large"
                        startIcon={loading === 'dev' ? <CircularProgress size={20} color="inherit" /> : <DeveloperModeIcon />}
                        onClick={() => handleSelectMode('dev')}
                        disabled={loading !== null}
                        sx={{ minWidth: '200px', py: 1.5 }}
                    >
                        Developer
                    </Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        size="large"
                        startIcon={loading === 'ops' ? <CircularProgress size={20} color="inherit" /> : <FlightIcon />}
                        onClick={() => handleSelectMode('ops')}
                        disabled={loading !== null}
                        sx={{ minWidth: '200px', py: 1.5 }}
                    >
                        Operations
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default LaunchScreen; 