import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import './styles/global.css'
import 'cesium/Build/Cesium/Widgets/widgets.css'

// Preload critical components
import('./components/LaunchScreen/LaunchScreen')
import('./layouts/AppLayout/AppLayout')
import('./pages/Dashboard/Dashboard')

// Preload common icons that will be needed soon after startup
import('@mui/icons-material/FlightTakeoff')
import('@mui/icons-material/Category')
import('@mui/icons-material/Route')

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <ThemeProvider>
    <App />
  </ThemeProvider>
  // </React.StrictMode>,
)
