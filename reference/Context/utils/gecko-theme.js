// Gecko UI Theme adapter for Vuetify
// Based on the styles from GeckoRobotics/gecko-ui

export const geckoColors = {
  // Core brand colors
  oceanBlue: 'rgba(13, 93, 144, 1)',
  skyBlue: 'rgba(0, 158, 255, 1)',
  lightSkyBlue: 'rgba(68, 187, 255, 1)',
  deepSeaBlue: 'rgba(19, 48, 64, 1)',
  teal: 'rgba(0, 105, 105, 1)',
  turquoise: 'rgba(0, 136, 136, 1)',
  seaGreen: 'rgba(0, 194, 144, 1)',
  mintGreen: 'rgba(87, 231, 178, 1)',
  limeGreen: 'rgba(105, 255, 66, 1)',
  lemonYellow: 'rgba(238, 255, 0, 1)',
  tangerine: 'rgba(255, 170, 0, 1)',
  brightOrange: 'rgba(255, 96, 0, 1)',
  vermilion: 'rgba(255, 48, 0, 1)',
  deepRed: 'rgba(153, 0, 0, 1)',
  
  // Greyscale
  white: 'rgba(255, 255, 255, 1)',
  grey90: 'rgba(230, 230, 230, 1)',
  grey80: 'rgba(204, 204, 204, 1)',
  grey60: 'rgba(153, 153, 153, 1)',
  grey40: 'rgba(102, 102, 102, 1)',
  grey20: 'rgba(51, 51, 51, 1)',
  grey15: 'rgba(38, 38, 38, 1)',
  grey10: 'rgba(17, 17, 17, 1)',
  black: 'rgba(0, 0, 0, 1)',
  
  // Application states
  success: 'rgba(64, 183, 78, 1)',
  error: 'rgba(220, 26, 12, 1)',
  warning: 'rgba(255, 193, 7, 1)',
  alert: 'rgba(255, 111, 7, 1)',
  
  // Gecko Brand
  geckoBrand100: 'rgba(236, 255, 244, 1)',
  geckoBrand200: 'rgba(200, 251, 221, 1)',
  geckoBrand300: 'rgba(86, 231, 179, 1)',
  geckoBrand400: 'rgba(0, 194, 144, 1)',
  geckoBrand500: 'rgba(0, 134, 119, 1)',
  geckoBrand600: 'rgba(0, 105, 103, 1)',
  geckoBrand700: 'rgba(19, 48, 64, 1)',
  geckoBrand800: 'rgba(11, 33, 45, 1)',
  
  // Forecast-specific colors
  forecastCyan: 'rgba(0, 255, 255, 1)',
  forecastLightCyan: 'rgba(137, 235, 233, 1)',
  forecastDarkGrey: 'rgba(28, 28, 30, 1)',
  forecastMediumGrey: 'rgba(38, 38, 40, 1)',
  forecastLightGrey: 'rgba(58, 58, 60, 1)',
  forecastAccentRed: 'rgba(255, 69, 58, 1)',
  forecastAccentGreen: 'rgba(50, 215, 75, 1)',
  forecastAccentYellow: 'rgba(255, 214, 10, 1)',
};

// Vuetify theme configuration using Gecko UI colors
export const geckoTheme = {
  defaultTheme: 'forecastTheme',
  themes: {
    geckoDark: {
      dark: true,
      colors: {
        primary: geckoColors.mintGreen,
        'primary-darken-1': geckoColors.seaGreen,
        secondary: geckoColors.oceanBlue,
        'secondary-darken-1': geckoColors.deepSeaBlue,
        accent: geckoColors.skyBlue,
        error: geckoColors.vermilion,
        info: geckoColors.lightSkyBlue,
        success: geckoColors.limeGreen,
        warning: geckoColors.lemonYellow,
        
        // Extra theme colors
        surface: geckoColors.deepSeaBlue,
        background: '#121212',
        
        // Custom colors
        'gecko-brand': geckoColors.geckoBrand400,
        'gecko-dark': geckoColors.geckoBrand700,
        'high-visibility': geckoColors.lemonYellow,
      }
    },
    geckoLight: {
      dark: false,
      colors: {
        primary: geckoColors.seaGreen,
        'primary-darken-1': geckoColors.teal,
        secondary: geckoColors.skyBlue,
        'secondary-darken-1': geckoColors.oceanBlue,
        accent: geckoColors.deepSeaBlue,
        error: geckoColors.deepRed,
        info: geckoColors.oceanBlue,
        success: geckoColors.limeGreen,
        warning: geckoColors.tangerine,
        
        // Extra theme colors
        surface: geckoColors.white,
        background: geckoColors.grey90,
        
        // Custom colors
        'gecko-brand': geckoColors.geckoBrand400,
        'gecko-dark': geckoColors.geckoBrand700,
        'high-visibility': geckoColors.lemonYellow,
      }
    },
    geckoBlack: {
      dark: true,
      colors: {
        primary: geckoColors.white,
        'primary-darken-1': geckoColors.grey80,
        secondary: geckoColors.grey60,
        'secondary-darken-1': geckoColors.grey40,
        accent: geckoColors.white,
        error: geckoColors.deepRed,
        info: geckoColors.white,
        success: geckoColors.white,
        warning: geckoColors.grey90,
        
        // Extra theme colors
        surface: geckoColors.black,
        background: geckoColors.black,
        
        // Custom colors
        'gecko-brand': geckoColors.white,
        'gecko-dark': geckoColors.black,
        'high-visibility': geckoColors.white,
      }
    },
    forecastTheme: {
      dark: true,
      colors: {
        primary: geckoColors.forecastCyan,
        'primary-darken-1': geckoColors.forecastLightCyan,
        secondary: geckoColors.grey60,
        'secondary-darken-1': geckoColors.grey40,
        accent: geckoColors.forecastCyan,
        error: geckoColors.forecastAccentRed,
        info: geckoColors.forecastCyan,
        success: geckoColors.forecastAccentGreen,
        warning: geckoColors.forecastAccentYellow,
        
        // Extra theme colors
        surface: geckoColors.forecastMediumGrey,
        background: geckoColors.forecastDarkGrey,
        
        // Custom colors
        'gecko-brand': geckoColors.forecastCyan,
        'gecko-dark': geckoColors.forecastDarkGrey,
        'high-visibility': geckoColors.forecastCyan,
      }
    }
  }
};

// Button styles for Vuetify defaulting to Gecko UI style
export const geckoButtonDefaults = {
  elevated: {
    color: 'primary',
    elevation: 2,
  },
  flat: {
    color: 'primary',
  },
  tonal: {
    color: 'primary',
  },
  outlined: {
    color: 'primary',
  },
  text: {
    color: 'primary',
  },
  plain: {
    color: 'primary',
  },
};

// Default component settings
export const geckoDefaults = {
  VBtn: geckoButtonDefaults.elevated,
  VTextField: {
    variant: 'outlined',
    density: 'comfortable',
    color: 'primary',
  },
  VCard: {
    elevation: 4,
    rounded: 'lg',
  },
  VAppBar: {
    elevation: 4, 
    color: 'gecko-dark',
  }
};

// CSS variables for the theme
export const geckoCssVariables = `
  :root {
    --gecko-green: ${geckoColors.seaGreen};
    --gecko-mint: ${geckoColors.mintGreen};
    --gecko-teal: ${geckoColors.teal};
    --gecko-dark-blue: ${geckoColors.deepSeaBlue};
    --gecko-ocean-blue: ${geckoColors.oceanBlue};
    --gecko-sky-blue: ${geckoColors.skyBlue};
    --gecko-light-blue: ${geckoColors.lightSkyBlue};
    --gecko-warning: ${geckoColors.lemonYellow};
    --gecko-error: ${geckoColors.vermilion};
    --gecko-alert: ${geckoColors.tangerine};
    --gecko-success: ${geckoColors.limeGreen};
    
    /* Forecast theme variables */
    --forecast-cyan: ${geckoColors.forecastCyan};
    --forecast-light-cyan: ${geckoColors.forecastLightCyan};
    --forecast-dark-grey: ${geckoColors.forecastDarkGrey};
    --forecast-medium-grey: ${geckoColors.forecastMediumGrey};
    --forecast-light-grey: ${geckoColors.forecastLightGrey};
    --forecast-accent-red: ${geckoColors.forecastAccentRed};
    --forecast-accent-green: ${geckoColors.forecastAccentGreen};
    --forecast-accent-yellow: ${geckoColors.forecastAccentYellow};
    
    /* Font settings */
    --gecko-font-tech: "Share Tech Mono", monospace;
    --gecko-font-main: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
`;

export default {
  geckoColors,
  geckoTheme,
  geckoDefaults,
  geckoCssVariables
}; 