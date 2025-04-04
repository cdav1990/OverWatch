import React, { createContext, useState, useMemo, useContext, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, PaletteMode } from '@mui/material';

// Custom type for theme mode including Gecko
type AppThemeMode = PaletteMode | 'gecko';

// Define the shape of the context data
interface ThemeContextType {
  mode: AppThemeMode;
  // toggleTheme: () => void; // Remove toggle if using direct set
  setThemeMode: (mode: AppThemeMode) => void; // Function to set a specific mode
}

// Create the context 
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
      main: '#1976d2', // Blue primary color matching screenshot
      light: '#4dabf5',
      dark: '#115293',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#f50057', // Pink secondary color
      light: '#ff4081',
      dark: '#c51162',
      contrastText: '#ffffff'
    },
    background: {
      default: '#0c1419', // Very dark blue-gray from screenshot
      paper: '#1c2329',   // Slightly lighter for paper elements
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#a0a0a0',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: [
      'Manrope',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0c1419', // Match the very dark background
          color: '#ffffff',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default gradient in dark mode
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          "&.Mui-selected": {
            backgroundColor: 'rgba(25, 118, 210, 0.2)',
            color: '#4dabf5',
          },
        },
      },
    },
  },
});

// Define a basic Gecko theme (placeholder - needs refinement)
const geckoTheme = createTheme({
  palette: {
    mode: 'dark', // Often based on dark mode
    primary: {
      main: '#00C853', // Example Gecko Green
    },
    secondary: {
      main: '#FFAB00', // Example Gecko Amber
    },
    background: {
      default: '#212121',
      paper: '#303030',
    },
    text: {
        primary: '#ffffff',
        secondary: '#bdbdbd',
    }
    // Add more specific Gecko overrides here based on fulcrum-ux
  },
});

// Define the props for the provider component
interface ThemeProviderProps {
  children: ReactNode;
}

// Create the custom provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme from localStorage if available, otherwise use dark as default
  const [mode, setMode] = useState<AppThemeMode>(() => {
    const savedTheme = localStorage.getItem('theme') as AppThemeMode | null;
    return savedTheme || 'dark';
  });

  // Select the theme based on the current mode
  const theme = useMemo(() => {
    switch (mode) {
      case 'dark': return darkTheme;
      case 'gecko': return geckoTheme;
      case 'light':
      default: return lightTheme;
    }
  }, [mode]);

  // Set the data-theme attribute on the body element and save to localStorage
  React.useEffect(() => {
    document.body.dataset.theme = mode;
    localStorage.setItem('theme', mode);
  }, [mode]);

  // Value provided by the context
  const contextValue = useMemo(() => ({ mode, setThemeMode: setMode }), [mode]);

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
