import React, { createContext, useState, useMemo, useContext, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, PaletteMode } from '@mui/material';

// Define the supported theme types
type ThemeMode = PaletteMode | 'gecko';

// Define the shape of the context data
interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
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

// Define the gecko theme (based on dark theme with modifications)
const geckoTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#52f000', // Green for gecko theme
    },
    secondary: {
      main: '#c6ff00', // Lime secondary
    },
    background: {
      default: '#0e1e0e', // Dark green background
      paper: '#142514',   
    },
    text: {
      primary: '#e0ffd9',
      secondary: '#a8d8a8',
    }
  },
});

// Define the props for the provider component
interface ThemeProviderProps {
  children: ReactNode;
}

// Create the custom provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark'); // Default to dark mode instead of light

  const toggleTheme = () => {
    setMode((prevMode) => {
      // Cycle through themes: light -> dark -> gecko -> light
      if (prevMode === 'light') return 'dark';
      if (prevMode === 'dark') return 'gecko';
      return 'light';
    });
  };

  // Function to directly set the theme mode
  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  // Select the theme based on the current mode
  const theme = useMemo(() => {
    if (mode === 'light') return lightTheme;
    if (mode === 'dark') return darkTheme;
    return geckoTheme; // 'gecko' theme
  }, [mode]);

  // Value provided by the context
  const contextValue = useMemo(
    () => ({ mode, toggleTheme, setThemeMode }), 
    [mode]
  );

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