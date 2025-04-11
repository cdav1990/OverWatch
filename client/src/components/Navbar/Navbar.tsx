import { AppBar, Box, Toolbar, Typography, Button, IconButton, Container, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useThemeContext } from '../../context/ThemeContext';
import { styled, keyframes } from '@mui/material/styles';

// Enhanced animations for industrial theme
const subtlePulse = keyframes`
  0% { text-shadow: 0 0 5px rgba(79, 195, 247, 0.3); }
  50% { text-shadow: 0 0 15px rgba(79, 195, 247, 0.6); }
  100% { text-shadow: 0 0 5px rgba(79, 195, 247, 0.3); }
`;

const buttonGlow = keyframes`
  0% { box-shadow: 0 0 0px rgba(79, 195, 247, 0); }
  50% { box-shadow: 0 0 5px rgba(79, 195, 247, 0.5); }
  100% { box-shadow: 0 0 0px rgba(79, 195, 247, 0); }
`;

const scanLine = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

// Styled components for industrial theme
const IndustrialAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(180deg, rgba(8, 12, 18, 0.97) 0%, rgba(12, 20, 28, 0.97) 100%)',
  borderBottom: '1px solid rgba(79, 195, 247, 0.2)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(10px)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, rgba(79, 195, 247, 0), rgba(79, 195, 247, 0.8), rgba(79, 195, 247, 0))',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, rgba(79, 195, 247, 0.03) 0%, rgba(79, 195, 247, 0) 100%)',
    pointerEvents: 'none',
  }
}));

interface NavbarProps {
  onMenuToggle?: () => void;
}

const Navbar = ({ onMenuToggle }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const { mode } = useThemeContext();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
    if (onMenuToggle) {
      onMenuToggle();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <IndustrialAppBar position="static">
      {/* Scan line effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, rgba(79, 195, 247, 0), rgba(79, 195, 247, 0.5), rgba(79, 195, 247, 0))',
          opacity: 0.5,
          zIndex: 10,
          animation: `${scanLine} 8s infinite linear`,
          pointerEvents: 'none',
        }}
      />
      
      <Container maxWidth={false}>
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, sm: 72 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              color: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                color: '#4fc3f7',
                backgroundColor: 'rgba(79, 195, 247, 0.08)'
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Brand logo with styled typography */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -3,
                left: 0,
                width: '40%',
                height: '2px',
                background: 'linear-gradient(90deg, rgba(79, 195, 247, 0.8), rgba(79, 195, 247, 0))',
              }
            }}
          >
            <Typography
              variant="h5"
              noWrap
              sx={{ 
                fontSize: { xs: '1.2rem', sm: '1.5rem' },
                fontWeight: 800,
                fontFamily: '"Rajdhani", "Roboto", sans-serif',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#4fc3f7',
                display: 'flex',
                alignItems: 'center',
                animation: `${subtlePulse} 3s infinite ease-in-out`,
                textShadow: '0 0 10px rgba(79, 195, 247, 0.4)',
              }}
            >
              OVERWATCH
            </Typography>
          </Box>

          <Box sx={{ 
            display: { xs: 'none', md: 'flex' }, 
            alignItems: 'center',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: -10,
              width: '1px',
              height: '40%',
              transform: 'translateY(-50%)',
              background: 'rgba(79, 195, 247, 0.2)',
            }
          }}>
            {[ // Define nav items for easier mapping
              { label: 'Dashboard', path: '/' },
              { label: 'Geo', path: '/geo' },
              { label: 'Mission Planning', path: '/mission' },
              { label: 'ROS Bridge', path: '/ros-bridge' },
              { label: 'Telemetry', path: '/telemetry' },
              { label: 'Control', path: '/control' },
              { label: 'Settings', path: '/settings' },
            ].map((item) => (
              <Button 
                key={item.label}
                component={RouterLink} 
                to={item.path}
                className={isActive(item.path) ? 'active' : ''}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: '4px',
                  padding: '6px 16px',
                  letterSpacing: '0.5px',
                  margin: '0 4px',
                  color: 'rgba(255, 255, 255, 0.85)',
                  transition: 'all 0.3s ease',
                  background: 'transparent',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    transform: 'scaleX(0)',
                    background: 'rgba(79, 195, 247, 0.5)',
                    transition: 'transform 0.3s ease',
                    transformOrigin: 'left',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(79, 195, 247, 0.08)',
                    color: '#4fc3f7',
                    '&::before': {
                      transform: 'scaleX(1)',
                    }
                  },
                  '&.active': {
                    color: '#4fc3f7',
                    backgroundColor: 'rgba(79, 195, 247, 0.12)',
                    animation: `${buttonGlow} 2s infinite ease-in-out`,
                    '&::before': {
                      transform: 'scaleX(1)',
                      background: 'rgba(79, 195, 247, 0.8)',
                    }
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </IndustrialAppBar>
  );
};

export default Navbar; 