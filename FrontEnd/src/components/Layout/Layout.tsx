import { Box, CssBaseline } from '@mui/material';
import { ReactNode } from 'react';
import Navbar from '../Navbar/Navbar';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isGeoPage = location.pathname === '/geo';
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      width: '100vw', 
      overflow: 'hidden',
      margin: 0,
      padding: 0
    }}>
      <CssBaseline />
      <Navbar />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          overflow: isGeoPage ? 'hidden' : 'auto',
          height: isGeoPage ? 'calc(100vh - 64px)' : 'auto',
          margin: 0,
          padding: 0
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 