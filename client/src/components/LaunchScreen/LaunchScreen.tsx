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

const buttonHover = keyframes`
  0% { box-shadow: 0 0 5px rgba(79, 195, 247, 0.5); }
  50% { box-shadow: 0 0 15px rgba(79, 195, 247, 0.8); }
  100% { box-shadow: 0 0 5px rgba(79, 195, 247, 0.5); }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
`;

// Styled components to match the dark theme industrial UI
const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(5),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 20, 28, 0.85)',
    color: theme.palette.common.white,
    borderRadius: '8px',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(79, 195, 247, 0.3)',
    border: '1px solid rgba(79, 195, 247, 0.2)',
    width: '100%',
    maxWidth: '480px',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden',
    zIndex: 10,
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, rgba(79, 195, 247, 0), rgba(79, 195, 247, 1), rgba(79, 195, 247, 0))',
    }
}));

const AppTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 800,
    fontSize: '3rem',
    letterSpacing: '3px',
    marginBottom: theme.spacing(1),
    color: '#4fc3f7',
    textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(79, 195, 247, 0.5)',
    animation: `${pulse} 3s infinite ease-in-out`
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
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing(5),
    letterSpacing: '2px',
    textTransform: 'uppercase',
    textAlign: 'center'
}));

// Simplified button styling with better click handling
const DevButton = styled(Button)(({ theme }) => ({
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    padding: theme.spacing(2, 3),
    borderRadius: '6px',
    textTransform: 'none',
    fontWeight: 600,
    minHeight: '80px',
    backgroundColor: 'rgba(255, 51, 102, 0.8)',
    color: '#fff',
    boxShadow: '0 5px 15px rgba(255, 51, 102, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    animation: `${float} 3s infinite ease-in-out`,
    animationDelay: '0.1s',
    transition: 'all 0.3s ease-in-out',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    zIndex: 20,
    '&:hover': {
        backgroundColor: 'rgba(255, 51, 102, 0.9)',
        transform: 'translateY(-5px)',
        boxShadow: '0 10px 25px rgba(255, 51, 102, 0.4), 0 0 20px rgba(255, 51, 102, 0.4)',
    },
    '&:active': {
        transform: 'translateY(0)',
        boxShadow: '0 5px 15px rgba(255, 51, 102, 0.3)',
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
        transform: 'rotate(30deg)',
        transition: 'all 0.5s ease-in-out',
        pointerEvents: 'none', // Ensure clicks pass through this element
    },
    '&:hover::after': {
        transform: 'rotate(30deg) translate(10%, 10%)',
    },
    '&.Mui-disabled': {
        backgroundColor: 'rgba(255, 51, 102, 0.3)',
        color: 'rgba(255, 255, 255, 0.5)',
    }
}));

const OpsButton = styled(Button)(({ theme }) => ({
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    padding: theme.spacing(2, 3),
    borderRadius: '6px',
    textTransform: 'none',
    fontWeight: 600,
    minHeight: '80px',
    backgroundColor: 'rgba(79, 195, 247, 0.8)',
    color: '#fff',
    boxShadow: '0 5px 15px rgba(79, 195, 247, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    animation: `${float} 3s infinite ease-in-out`,
    animationDelay: '0.3s',
    transition: 'all 0.3s ease-in-out',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    zIndex: 20,
    '&:hover': {
        backgroundColor: 'rgba(79, 195, 247, 0.9)',
        transform: 'translateY(-5px)',
        boxShadow: '0 10px 25px rgba(79, 195, 247, 0.4), 0 0 20px rgba(79, 195, 247, 0.4)',
    },
    '&:active': {
        transform: 'translateY(0)',
        boxShadow: '0 5px 15px rgba(79, 195, 247, 0.3)',
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
        transform: 'rotate(30deg)',
        transition: 'all 0.5s ease-in-out',
        pointerEvents: 'none', // Ensure clicks pass through this element
    },
    '&:hover::after': {
        transform: 'rotate(30deg) translate(10%, 10%)',
    },
    '&.Mui-disabled': {
        backgroundColor: 'rgba(79, 195, 247, 0.3)',
        color: 'rgba(255, 255, 255, 0.5)',
    }
}));

// Icon container with animation
const AnimatedIcon = styled(Box)(({ theme }) => ({
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing(1.5),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    padding: theme.spacing(1),
    transition: 'all 0.3s ease',
    '& svg': {
        fontSize: '1.6rem',
        transition: 'all 0.3s ease',
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

    const handleDevClick = () => {
        console.log('Developer mode clicked');
        setLoading('dev');
        setTimeout(() => {
            setAppMode('dev');
        }, 500);
    };

    const handleOpsClick = () => {
        console.log('Operations mode clicked');
        setLoading('ops');
        setTimeout(() => {
            setAppMode('ops');
        }, 500);
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
                position: 'relative',
                overflow: 'hidden',
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
                        position: 'relative',
                        zIndex: 5,
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
                            SELECT OPERATING MODE
                        </SubTitle>
                        
                        <Stack direction="column" spacing={3} sx={{ width: '100%' }}>
                            {/* Developer Button - Simplified */}
                            <DevButton 
                                disabled={loading !== null}
                                onClick={handleDevClick}
                                disableRipple={false}
                                disableTouchRipple={false}
                                disableFocusRipple={false}
                            >
                                {loading === 'dev' ? (
                                    <AnimatedIcon>
                                        <CircularProgress size={25} color="inherit" />
                                    </AnimatedIcon>
                                ) : (
                                    <AnimatedIcon>
                                        <DeveloperModeIcon />
                                    </AnimatedIcon>
                                )}
                                <Box sx={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'flex-start',
                                    pointerEvents: 'none' // Don't intercept clicks
                                }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '1px' }}>
                                        DEVELOPER
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'none' }}>
                                        Mission planning & hardware configuration
                                    </Typography>
                                </Box>
                            </DevButton>

                            {/* Operations Button - Simplified */}
                            <OpsButton 
                                disabled={loading !== null}
                                onClick={handleOpsClick}
                                disableRipple={false}
                                disableTouchRipple={false}
                                disableFocusRipple={false}
                            >
                                {loading === 'ops' ? (
                                    <AnimatedIcon>
                                        <CircularProgress size={25} color="inherit" />
                                    </AnimatedIcon>
                                ) : (
                                    <AnimatedIcon>
                                        <FlightIcon />
                                    </AnimatedIcon>
                                )}
                                <Box sx={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'flex-start',
                                    pointerEvents: 'none' // Don't intercept clicks
                                }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '1px' }}>
                                        OPERATIONS
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'none' }}>
                                        Mission execution & monitoring
                                    </Typography>
                                </Box>
                            </OpsButton>
                        </Stack>

                        {/* Decorative elements */}
                        <Box sx={{ 
                            position: 'absolute', 
                            bottom: '10px',
                            right: '10px',
                            color: 'rgba(79, 195, 247, 0.2)',
                            fontSize: '10px',
                            letterSpacing: '1px',
                            pointerEvents: 'none' // Don't intercept clicks
                        }}>
                            SYSTEM v1.0.2
                        </Box>
                    </StyledPaper>
                </Fade>
            )}
        </Box>
    );
};

export default LaunchScreen; 