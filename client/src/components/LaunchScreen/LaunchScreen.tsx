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

// New animations
const rotateProbe = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const eagleSoar = keyframes`
  0% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.1) translateY(-5px); }
  100% { transform: scale(1) translateY(0); }
`;

const flagWave = keyframes`
  0% { transform: skewX(0deg); }
  25% { transform: skewX(3deg); }
  50% { transform: skewX(0deg); }
  75% { transform: skewX(-3deg); }
  100% { transform: skewX(0deg); }
`;

// Styled components with enhanced industrial dark theme
const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(5),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 12, 18, 0.95)', // Darker background
    color: theme.palette.common.white,
    borderRadius: '8px',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.85), 0 0 20px rgba(79, 195, 247, 0.3)',
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
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '80%',
        height: '1px',
        background: 'linear-gradient(90deg, rgba(79, 195, 247, 0), rgba(79, 195, 247, 0.7))',
    }
}));

const AppTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 800,
    fontSize: '3rem',
    letterSpacing: '4px',
    marginBottom: theme.spacing(1),
    color: '#4fc3f7',
    textTransform: 'uppercase',
    textShadow: '0 0 15px rgba(79, 195, 247, 0.6)',
    animation: `${pulse} 3s infinite ease-in-out`,
    fontFamily: '"Rajdhani", "Roboto", sans-serif',
}));

const LogoAppTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 800,
    fontSize: '3.5rem',
    letterSpacing: '3px',
    color: '#4fc3f7',
    textTransform: 'uppercase',
    textShadow: '0 0 15px rgba(79, 195, 247, 0.7)',
    animation: `${pulse} 2s infinite ease-in-out`,
    fontFamily: '"Rajdhani", "Roboto", sans-serif',
}));

const SubTitle = styled(Typography)(({ theme }) => ({
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing(5),
    letterSpacing: '3px',
    textTransform: 'uppercase',
    textAlign: 'center',
    position: 'relative',
    fontFamily: '"Rajdhani", "Roboto", sans-serif',
    '&::after': {
        content: '""',
        position: 'absolute',
        bottom: '-15px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60px',
        height: '1px',
        background: 'rgba(79, 195, 247, 0.5)',
    }
}));

// Enhanced Developer button with eagle and flag elements
const DevButton = styled(Button)(({ theme }) => ({
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    padding: theme.spacing(2.5, 3),
    borderRadius: '6px',
    textTransform: 'none',
    fontWeight: 600,
    minHeight: '90px', // Taller for better visibility
    backgroundColor: 'rgba(30, 34, 40, 0.9)', // Darker industrial color
    color: '#fff',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(255, 51, 102, 0.2)',
    border: '1px solid rgba(220, 40, 40, 0.3)',
    animation: `${float} 3s infinite ease-in-out`,
    animationDelay: '0.1s',
    transition: 'all 0.3s ease-in-out',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    zIndex: 20,
    '&::before': { // American flag background hint
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '20%',
        background: 'linear-gradient(to bottom, rgba(191, 13, 13, 0.1) 0%, rgba(191, 13, 13, 0.1) 10%, rgba(255, 255, 255, 0.05) 10%, rgba(255, 255, 255, 0.05) 20%, rgba(191, 13, 13, 0.1) 20%, rgba(191, 13, 13, 0.1) 30%, rgba(255, 255, 255, 0.05) 30%, rgba(255, 255, 255, 0.05) 40%, rgba(191, 13, 13, 0.1) 40%, rgba(191, 13, 13, 0.1) 50%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.05) 60%, rgba(191, 13, 13, 0.1) 60%, rgba(191, 13, 13, 0.1) 70%, rgba(255, 255, 255, 0.05) 70%, rgba(255, 255, 255, 0.05) 80%, rgba(191, 13, 13, 0.1) 80%, rgba(191, 13, 13, 0.1) 90%, rgba(255, 255, 255, 0.05) 90%, rgba(255, 255, 255, 0.05) 100%)',
        animation: `${flagWave} 4s infinite ease-in-out`,
        opacity: 0.5,
    },
    '&:hover': {
        backgroundColor: 'rgba(40, 45, 50, 0.95)',
        transform: 'translateY(-5px)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(255, 51, 102, 0.3)',
        '& .eagle-icon': {
            animation: `${eagleSoar} 2s infinite ease-in-out`,
        },
    },
    '&:active': {
        transform: 'translateY(0)',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4), inset 0 0 5px rgba(255, 51, 102, 0.2)',
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
        backgroundColor: 'rgba(30, 34, 40, 0.6)',
        color: 'rgba(255, 255, 255, 0.5)',
    }
}));

// Enhanced Operations button with drone theme
const OpsButton = styled(Button)(({ theme }) => ({
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    padding: theme.spacing(2.5, 3),
    borderRadius: '6px',
    textTransform: 'none',
    fontWeight: 600,
    minHeight: '90px', // Taller for better visibility
    backgroundColor: 'rgba(30, 34, 40, 0.9)', // Darker industrial color
    color: '#fff',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(79, 195, 247, 0.2)',
    border: '1px solid rgba(79, 195, 247, 0.3)',
    animation: `${float} 3s infinite ease-in-out`,
    animationDelay: '0.3s',
    transition: 'all 0.3s ease-in-out',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    zIndex: 20,
    '&:hover': {
        backgroundColor: 'rgba(40, 45, 50, 0.95)',
        transform: 'translateY(-5px)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(79, 195, 247, 0.3)',
        '& .drone-probes': {
            animation: `${rotateProbe} 1s infinite linear`,
        },
    },
    '&:active': {
        transform: 'translateY(0)',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4), inset 0 0 5px rgba(79, 195, 247, 0.2)',
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
        pointerEvents: 'none',
    },
    '&:hover::after': {
        transform: 'rotate(30deg) translate(10%, 10%)',
    },
    '&.Mui-disabled': {
        backgroundColor: 'rgba(30, 34, 40, 0.6)',
        color: 'rgba(255, 255, 255, 0.5)',
    }
}));

// Enhanced icon container with animation
const AnimatedIcon = styled(Box)(({ theme }) => ({
    width: '45px',
    height: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing(2),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '50%',
    padding: theme.spacing(1),
    transition: 'all 0.3s ease',
    boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)',
    '& svg': {
        fontSize: '1.8rem',
        transition: 'all 0.3s ease',
    }
}));

// Eagle Icon container
const EagleIcon = styled(Box)(({ theme }) => ({
    position: 'relative',
    width: '45px',
    height: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing(2),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '50%',
    padding: theme.spacing(1),
    overflow: 'visible',
    boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)',
    '&:before': { // Eagle silhouette
        content: '""',
        position: 'absolute',
        width: '28px',
        height: '20px',
        background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 40%, rgba(255, 255, 255, 0) 70%)',
        clipPath: 'polygon(50% 0%, 80% 40%, 100% 20%, 90% 60%, 100% 100%, 50% 80%, 0% 100%, 10% 60%, 0% 20%, 20% 40%)',
        zIndex: 2,
    },
    '&:after': { // American flag hint
        content: '""',
        position: 'absolute',
        width: '30px',
        height: '15px',
        bottom: '5px',
        background: 'linear-gradient(0deg, rgba(191, 13, 13, 0.7) 0%, rgba(191, 13, 13, 0.7) 20%, rgba(255, 255, 255, 0.7) 20%, rgba(255, 255, 255, 0.7) 40%, rgba(191, 13, 13, 0.7) 40%, rgba(191, 13, 13, 0.7) 60%, rgba(255, 255, 255, 0.7) 60%, rgba(255, 255, 255, 0.7) 80%, rgba(191, 13, 13, 0.7) 80%, rgba(191, 13, 13, 0.7) 100%)',
        zIndex: 1,
        borderRadius: '1px',
        animation: `${flagWave} 2s infinite ease-in-out`,
    }
}));

// Custom animated drone with spinning probes
const DroneWithProbes = styled(Box)(({ theme }) => ({
    position: 'relative',
    width: '45px',
    height: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing(2),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '50%',
    padding: theme.spacing(0.5),
    overflow: 'visible',
    boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)',
    '& .drone-body': {
        width: '24px',
        height: '12px',
        backgroundColor: 'rgba(79, 195, 247, 0.9)',
        borderRadius: '6px',
        position: 'relative',
        zIndex: 5,
    },
    '& .drone-probes': {
        position: 'absolute',
        width: '8px',
        height: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '50%',
        boxShadow: '0 0 5px rgba(79, 195, 247, 0.8)',
        zIndex: 6,
    },
    '& .probe-1': {
        top: '10px',
        left: '8px',
        transform: 'translateZ(0)',
    },
    '& .probe-2': {
        top: '10px',
        right: '8px',
        transform: 'translateZ(0)',
    },
    '& .probe-3': {
        bottom: '10px',
        left: '8px',
        transform: 'translateZ(0)',
    },
    '& .probe-4': {
        bottom: '10px',
        right: '8px',
        transform: 'translateZ(0)',
    },
    '&:hover .drone-probes': {
        animation: `${rotateProbe} 0.5s infinite linear`,
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

    // Set document title for launch screen
    useEffect(() => {
        document.title = "OVERWATCH";
        return () => {
            // Title will be updated by TitleUpdater after mode selection
        };
    }, []);

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
                bgcolor: '#060a0e', // Darker industrial background
                backgroundImage: `
                    linear-gradient(rgba(0, 0, 0, 0.5) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 0, 0, 0.5) 1px, transparent 1px),
                    radial-gradient(circle at 50% 50%, rgba(30, 40, 50, 0.3) 0%, rgba(6, 10, 14, 0.9) 100%)
                `,
                backgroundSize: '40px 40px, 40px 40px, 100% 100%',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(circle at 50% 70%, rgba(79, 195, 247, 0.1) 0%, rgba(0, 0, 0, 0) 60%)',
                    pointerEvents: 'none',
                }
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
                            {/* Developer Button - with eagle and flag */}
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
                                    <EagleIcon className="eagle-icon" />
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

                            {/* Operations Button - with animated drone */}
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
                                    <DroneWithProbes>
                                        <Box className="drone-body" />
                                        <Box className="drone-probes probe-1" />
                                        <Box className="drone-probes probe-2" />
                                        <Box className="drone-probes probe-3" />
                                        <Box className="drone-probes probe-4" />
                                    </DroneWithProbes>
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