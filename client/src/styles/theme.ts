import { createTheme } from '@mui/material/styles';

export const BREAKPOINTS = {
  phone: 600,
  tablet: 950,
  laptop: 1300,
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: 'rgba(0, 194, 144, 1)', // Gecko brand
      light: 'rgba(86, 231, 179, 1)',
      dark: 'rgba(0, 105, 103, 1)',
      contrastText: '#fff',
    },
    secondary: {
      main: 'rgba(0, 158, 255, 1)', // SkyBlue
      light: 'rgba(68, 187, 255, 1)',
      dark: 'rgba(13, 93, 144, 1)',
      contrastText: '#fff',
    },
    error: {
      main: 'rgba(220, 26, 12, 1)',
      light: 'rgba(255, 175, 157, 1)',
      dark: 'rgba(175, 27, 41, 1)',
    },
    warning: {
      main: 'rgba(255, 193, 7, 1)',
      light: 'rgba(255, 237, 155, 1)',
      dark: 'rgba(183, 129, 3, 1)',
    },
    info: {
      main: 'rgba(10, 111, 219, 1)',
      light: 'rgba(159, 225, 255, 1)',
      dark: 'rgba(4, 58, 147, 1)',
    },
    success: {
      main: 'rgba(64, 183, 78, 1)',
      light: 'rgba(193, 247, 183, 1)',
      dark: 'rgba(20, 106, 54, 1)',
    },
    background: {
      default: '#fff',
      paper: '#f5f5f5',
    },
    text: {
      primary: 'rgba(19, 48, 64, 1)', // DeepSeaBlue
      secondary: 'rgba(81, 100, 108, 1)', // slate 600
    },
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
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(19, 48, 64, 1)', // DeepSeaBlue
        },
      },
    },
  },
});

export default theme; 