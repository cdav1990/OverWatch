import React from 'react';
import { Box, Typography, Button, Stack, Paper, CircularProgress, TypographyProps } from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import FlightIcon from '@mui/icons-material/Flight';
import { styled } from '@mui/material/styles';

// Styled components to match the dark theme industrial UI
const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 21, 21, 0.97)',
    color: theme.palette.common.white,
    borderRadius: '4px',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    width: '100%',
    maxWidth: '400px'
}));

const AppTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 600,
    fontSize: '2.5rem',
    letterSpacing: '2px',
    marginBottom: theme.spacing(1),
    color: '#4fc3f7', // Match the blue accent color used in other components
    textTransform: 'uppercase'
}));

const SubTitle = styled(Typography)(({ theme }) => ({
    fontSize: '0.95rem',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: theme.spacing(4),
    letterSpacing: '0.5px'
}));

const StyledButton = styled(Button)(({ theme }) => ({
    minWidth: '180px',
    padding: theme.spacing(1.25),
    borderRadius: '4px',
    textTransform: 'uppercase',
    fontWeight: 500,
    fontSize: '0.85rem',
    letterSpacing: '0.5px',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
    }
}));

const DevButton = styled(StyledButton)(({ theme }) => ({
    backgroundColor: '#ff3366', // Pink color to match the industrial screenshot
    color: '#000',
    '&:hover': {
        backgroundColor: '#ff5c85',
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
    }
}));

const OpsButton = styled(StyledButton)(({ theme }) => ({
    backgroundColor: '#4fc3f7', // Blue accent color used in other components
    color: '#000',
    '&:hover': {
        backgroundColor: '#81d4fa',
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
    }
}));

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
                bgcolor: '#0c1419', // Very dark blue-gray background
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(30, 40, 50, 0.4) 0%, rgba(12, 20, 25, 0.8) 100%)',
            }}
        >
            <StyledPaper>
                <AppTitle variant="h3">
                    OVERWATCH
                </AppTitle>
                <SubTitle variant="subtitle1">
                    Select Operating Mode
                </SubTitle>
                
                <Stack direction="row" spacing={3}>
                    <DevButton 
                        variant="contained" 
                        disabled={loading !== null}
                        onClick={() => handleSelectMode('dev')}
                        startIcon={loading === 'dev' ? 
                            <CircularProgress size={20} color="inherit" /> : 
                            <DeveloperModeIcon />
                        }
                    >
                        Developer
                    </DevButton>
                    <OpsButton 
                        variant="contained" 
                        disabled={loading !== null}
                        onClick={() => handleSelectMode('ops')}
                        startIcon={loading === 'ops' ? 
                            <CircularProgress size={20} color="inherit" /> : 
                            <FlightIcon />
                        }
                    >
                        Operations
                    </OpsButton>
                </Stack>
            </StyledPaper>
        </Box>
    );
};

export default LaunchScreen; 