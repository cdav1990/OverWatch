import React, { createContext, useState, useMemo, useContext, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, PaletteMode } from '@mui/material';

// Define the shape of the context data
interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
}

// Create the context with a default value (can be undefined initially)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Define the light theme
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0033A0', // Example primary color (adjust as needed)
    },
    secondary: {
      main: '#ff6600', // Example secondary color
    },
    background: {
      default: '#f4f6f8', // Lighter background
      paper: '#ffffff',
    },
  },
});

// Define the dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4dabf5', // Lighter primary for dark mode
    },
    secondary: {
      main: '#ff9800', // Adjust secondary for dark mode
    },
    background: {
      default: '#121212', // Standard dark background
      paper: '#1e1e1e',   // Slightly lighter paper for contrast
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#b0b0b0',
    }
  },
});

// Define the props for the provider component
interface ThemeProviderProps {
  children: ReactNode;
}

// Create the custom provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>('light'); // Default to light mode

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Select the theme based on the current mode
  const theme = useMemo(() => (mode === 'light' ? lightTheme : darkTheme), [mode]);

  // Value provided by the context
  const contextValue = useMemo(() => ({ mode, toggleTheme }), [mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline /> {/* Apply baseline styles & background color */} 
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}; 