import React, { useEffect } from 'react';
import { Box, Typography, Button, Stack, Paper, CircularProgress, TypographyProps, Fade } from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import FlightIcon from '@mui/icons-material/Flight';
import DroneIcon from '@mui/icons-material/FlightTakeoff';
import { styled, keyframes } from '@mui/material/styles';

// Animation keyframes
const pulse = keyframes`
  0% { opacity: 0.7; text-shadow: 0 0 10px rgba(79, 195, 247, 0.3); }
  50% { opacity: 1; text-shadow: 0 0 20px rgba(79, 195, 247, 0.8); }
  100% { opacity: 0.7; text-shadow: 0 0 10px rgba(79, 195, 247, 0.3); }
`;

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

const LogoAppTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 800,
    fontSize: '3.5rem',
    letterSpacing: '3px',
    color: '#4fc3f7',
    textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(79, 195, 247, 0.7)',
    animation: `${pulse} 2s infinite ease-in-out`
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

// Custom spinning logo animation
const SpinningLogo = styled(Box)(({ theme }) => ({
    width: '120px',
    height: '120px',
    position: 'relative',
    marginBottom: theme.spacing(4),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&::before': {
        content: '""',
        position: 'absolute',
        width: '100%',
        height: '100%',
        border: '4px solid rgba(79, 195, 247, 0.1)',
        borderTop: '4px solid #4fc3f7',
        borderRadius: '50%',
        animation: 'spin 1.5s linear infinite'
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        width: '90%',
        height: '90%',
        border: '4px solid rgba(79, 195, 247, 0.05)',
        borderBottom: '4px solid #4fc3f7',
        borderRadius: '50%',
        animation: 'spin 2s linear infinite reverse'
    },
    '@keyframes spin': {
        '0%': {
            transform: 'rotate(0deg)'
        },
        '100%': {
            transform: 'rotate(360deg)'
        }
    }
}));

const LaunchScreen: React.FC = () => {
    const { setAppMode } = useAppContext();

    // Loading state for initial app load
    const [initialLoading, setInitialLoading] = React.useState(true);
    
    // Placeholder for a potential loading state if needed
    const [loading, setLoading] = React.useState<'dev' | 'ops' | null>(null);

    // Initial load effect
    useEffect(() => {
        // Simulate loading time of 2.5 seconds
        const timer = setTimeout(() => {
            setInitialLoading(false);
        }, 2500);
        
        return () => clearTimeout(timer);
    }, []);

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
            {initialLoading ? (
                // Initial loading screen with logo
                <Fade in={initialLoading} timeout={800}>
                    <Box sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <LogoAppTitle variant="h1">
                            OVERWATCH
                        </LogoAppTitle>
                        
                        <SpinningLogo>
                            <DroneIcon 
                                sx={{ 
                                    color: '#4fc3f7', 
                                    fontSize: '2.5rem',
                                    zIndex: 10,
                                    animation: `${pulse} 1.5s infinite ease-in-out`,
                                    opacity: 0.9
                                }} 
                            />
                        </SpinningLogo>
                        
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: 'rgba(255, 255, 255, 0.7)',
                                marginTop: 2,
                                letterSpacing: '1px'
                            }}
                        >
                            INITIALIZING SYSTEMS...
                        </Typography>
                    </Box>
                </Fade>
            ) : (
                // Mode selection screen
                <Fade in={!initialLoading} timeout={800}>
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
                </Fade>
            )}
        </Box>
    );
};

export default LaunchScreen; 