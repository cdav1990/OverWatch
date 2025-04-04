import { AppBar, Box, Toolbar, Typography, Button, IconButton, Container, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useThemeContext } from '../../context/ThemeContext/ThemeContext';

interface NavbarProps {
  onMenuToggle?: () => void;
}

const Navbar = ({ onMenuToggle }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const { mode } = useThemeContext();
  const isDarkMode = mode === 'dark' || mode === 'gecko';
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
    if (onMenuToggle) {
      onMenuToggle();
    }
  };

  // Define a modern system font stack
  const modernFontStack = [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(',');

  return (
    <AppBar 
      position="static" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: isDarkMode ? '#0c1419' : theme.palette.primary.main,
        boxShadow: isDarkMode ? 'none' : theme.shadows[1], // Subtle shadow in light mode
        borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : 'none',
        fontFamily: modernFontStack, // Apply modern font stack
      }}
    >
      <Container maxWidth={false}>
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, sm: 72 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography
            variant="h5"
            noWrap
            component={RouterLink}
            to="/"
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 600, // Increase font weight for title
              letterSpacing: '0.5px', // Add slight letter spacing
            }}
          >
            Overwatch
          </Typography>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            {[ // Define nav items for easier mapping
              { label: 'Dashboard', path: '/' },
              { label: 'Geo', path: '/geo' },
              { label: 'Mission Planning', path: '/mission' },
              { label: 'Telemetry', path: '/telemetry' },
              { label: 'Control', path: '/control' },
              { label: 'Settings', path: '/settings' },
            ].map((item) => (
              <Button 
                key={item.label}
                component={RouterLink} 
                to={item.path} 
                color="inherit"
                sx={{
                  textTransform: 'none', // Prevent uppercase
                  fontWeight: 500, // Slightly bolder nav links
                  mx: 0.5, // Add some horizontal margin
                  px: 1.5, // Add padding
                  borderRadius: '4px', // Softer corners for hover effect
                  '&:hover': {
                    backgroundColor: isDarkMode 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(255, 255, 255, 0.15)', // Subtle hover background
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 