import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { ThemeProvider } from './context/ThemeContext/ThemeContext';
import { MissionProvider } from './context/MissionContext';
import { AppProvider, useAppContext } from './context/AppContext';
import AppLayout from './layouts/AppLayout/AppLayout';
import MissionPlanningLayout from './layouts/MissionPlanningLayout/MissionPlanningLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import GeoPage from './pages/GeoPage/GeoPage';
import LaunchScreen from './components/LaunchScreen/LaunchScreen';
import './App.css';

// Title updater component that runs on route changes
const TitleUpdater = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Set default title suffix
    let title = "OVERWATCH";
    
    // Add section name based on current path
    if (location.pathname === "/") {
      title = "Dashboard | OVERWATCH";
    } else if (location.pathname.startsWith("/geo")) {
      title = "Geo | OVERWATCH";
    } else if (location.pathname.startsWith("/mission")) {
      title = "Mission Planning | OVERWATCH";
    } else if (location.pathname.startsWith("/telemetry")) {
      title = "Telemetry | OVERWATCH";
    } else if (location.pathname.startsWith("/control")) {
      title = "Control | OVERWATCH";
    } else if (location.pathname.startsWith("/settings")) {
      title = "Settings | OVERWATCH";
    }
    
    // Update document title
    document.title = title;
  }, [location]);
  
  return null; // This component doesn't render anything
};

// Main application content component
const MainApp: React.FC = () => {
  const { appMode } = useAppContext();

  if (!appMode) {
    return <LaunchScreen />;
  }

  return (
    <AppLayout>
      <TitleUpdater />
      <Box component="main" sx={{ flexGrow: 1, width: '100%', height: 'calc(100vh - 64px)', overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mission/*" element={<MissionPlanningLayout />} />
          <Route path="/geo" element={<GeoPage />} />
        </Routes>
      </Box>
    </AppLayout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MissionProvider>
          <Router>
            <MainApp />
          </Router>
        </MissionProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
