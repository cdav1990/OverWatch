import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { ThemeProvider } from "./context/ThemeContext";
import { MissionProvider } from './context/MissionContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { ThreeJSStateProvider } from './context/ThreeJSStateContext';
import LaunchScreen from './components/LaunchScreen/LaunchScreen';
import './App.css';

// Lazy-loaded components
const AppLayout = lazy(() => import('./layouts/AppLayout/AppLayout'));
const MissionPlanningLayout = lazy(() => import('./layouts/MissionPlanningLayout/MissionPlanningLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const GeoPage = lazy(() => import('./pages/GeoPage/GeoPage'));

// Loading fallback component for Suspense
const LoadingFallback = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%', 
      width: '100%',
      backgroundColor: '#0c1419',
    }}
  >
    <CircularProgress color="info" />
  </Box>
);

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
    <Suspense fallback={<LoadingFallback />}>
      <AppLayout>
        <TitleUpdater />
        <Box component="main" sx={{ flexGrow: 1, width: '100%', height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={
              <Suspense fallback={<LoadingFallback />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="/mission/*" element={
              <Suspense fallback={<LoadingFallback />}>
                <MissionPlanningLayout />
              </Suspense>
            } />
            <Route path="/geo" element={
              <Suspense fallback={<LoadingFallback />}>
                <GeoPage />
              </Suspense>
            } />
          </Routes>
        </Box>
      </AppLayout>
    </Suspense>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <ThreeJSStateProvider>
          <MissionProvider>
            <Router>
              <MainApp />
            </Router>
          </MissionProvider>
        </ThreeJSStateProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
