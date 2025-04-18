import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { ThemeProvider } from "./context/ThemeContext";
import { MissionProvider, useMission } from './context/MissionContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { ThreeJSStateProvider } from './context/ThreeJSStateContext';
import LaunchScreen from './components/LaunchScreen/LaunchScreen';
import LoadingIndicator from './components/LoadingIndicator';
import { addDefaultDevSceneObjects } from './utils/sceneHelpers';
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
      height: '100%', 
      width: '100%',
      backgroundColor: '#0c1419',
    }}
  >
    <LoadingIndicator fullSize delay={200} />
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

// Dev mode initializer component
const DevModeInitializer = () => {
  const { state, dispatch } = useMission();
  
  useEffect(() => {
    // Only initialize scene objects if none exist yet
    if (state.sceneObjects.length === 0) {
      console.log("Initializing development scene with default objects");
      // Add default dock and ship objects for development
      addDefaultDevSceneObjects(dispatch);
    }
  }, [dispatch, state.sceneObjects.length]);
  
  return null; // This component doesn't render anything
};

// Component preloading helper
const preloadComponents = () => {
  // Start preloading components that might be needed soon
  // This helps reduce menu loading delays
  const preload = () => {
    // Queue these in the browser's idle time
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        // Preload mission planning components for faster menu loading
        import('./layouts/MissionPlanningLayout/MissionPlanningLayout');
        import('./components/HardwareSelection/HardwareSelectionModal');
        import('./components/SceneControls/SceneSettingsPanel');
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        import('./layouts/MissionPlanningLayout/MissionPlanningLayout');
        import('./components/HardwareSelection/HardwareSelectionModal');
        import('./components/SceneControls/SceneSettingsPanel');
      }, 1000); // Delay by 1 second after app load
    }
  };
  
  // Start preloading after the app has fully loaded
  if (document.readyState === 'complete') {
    preload();
  } else {
    window.addEventListener('load', preload);
    return () => window.removeEventListener('load', preload);
  }
};

// Main application content component
const MainApp: React.FC = () => {
  const { appMode } = useAppContext();

  // Start preloading components after initial render
  useEffect(() => {
    preloadComponents();
  }, []);

  if (!appMode) {
    return <LaunchScreen />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppLayout>
        <TitleUpdater />
        <DevModeInitializer />
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
