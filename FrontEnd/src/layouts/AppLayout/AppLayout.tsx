import React, { ReactNode } from 'react';
import { Box } from '@mui/material';
import Navbar from '../../components/Navbar/Navbar'; // Corrected path
// Remove useLocation import if no longer needed here
// import { useLocation } from 'react-router-dom'; 

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  // Remove location logic
  // const location = useLocation(); 
  // const isMissionPlanningRoute = location.pathname === '/mission'; 
  // console.log('[AppLayout] Path:', location.pathname, 'Is Mission Planning Route?', isMissionPlanningRoute);

  // Add state or handlers for potential sidebar toggling if Navbar needs it
  // const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // const handleMenuToggle = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      width: '100vw',
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      {/* Always render the Navbar */}
      <Navbar /> 
      
      {/* Main content area */}
      <Box component="main" sx={{ 
        flexGrow: 1, 
        display: 'flex', // Use flex for the content area itself
        overflow: 'hidden', // Prevent content overflow issues
        width: '100%',
        // Adjust top margin if Navbar is hidden to prevent content jumping under status bar?
        // Might need more sophisticated layout handling depending on overall app structure.
        // Example: marginTop: isMissionPlanningRoute ? 0 : '64px' (assuming Navbar height)
        // For now, rely on child layout (MissionPlanningLayout) to fill height correctly.
      }}>
        {/* Potentially add a Sidebar component here, interacting with Navbar */}
        {/* <Sidebar open={isSidebarOpen} /> */} 

        {/* The page content passed as children */}
        {/* Wrap children in a Box that handles overflow if needed */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', width: '100%', height: '100%' }}>
          {children}
        </Box>
      </Box>
      {/* Placeholder for a potential Footer */}
    </Box>
  );
};

export default AppLayout; 