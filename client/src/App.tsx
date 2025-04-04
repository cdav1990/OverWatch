import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

// Main application content component
const MainApp: React.FC = () => {
  const { appMode } = useAppContext();

  if (!appMode) {
    return <LaunchScreen />;
  }

  return (
    <AppLayout>
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
