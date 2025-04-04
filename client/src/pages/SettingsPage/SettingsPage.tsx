import React from 'react';
import { Box, Typography, Paper, ToggleButtonGroup, ToggleButton, Stack, Divider, useTheme } from '@mui/material';
import { PaletteMode } from '@mui/material/styles';
import { useThemeContext } from '../../context/ThemeContext/ThemeContext';
import Brightness4Icon from '@mui/icons-material/Brightness4'; // Dark mode icon
import Brightness7Icon from '@mui/icons-material/Brightness7'; // Light mode icon
import PaletteIcon from '@mui/icons-material/Palette'; // Gecko theme icon (placeholder)

const SettingsPage: React.FC = () => {
  const { mode, setThemeMode } = useThemeContext(); // Use the new setThemeMode function
  const theme = useTheme();
  const isDarkMode = mode === 'dark' || mode === 'gecko';

  const handleThemeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: PaletteMode | 'gecko' | null, // Allow null for exclusive toggle group
  ) => {
    if (newMode !== null) {
      setThemeMode(newMode); // Call setThemeMode with the selected mode
    }
  };

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: isDarkMode ? 'transparent' : '#f5f5f5',
      minHeight: 'calc(100vh - 64px)'
    }}>
      <Typography variant="h4" sx={{ mb: 3, color: isDarkMode ? '#e0e0e0' : 'inherit' }}>
        Application Settings
      </Typography>
      
      <Paper 
        elevation={isDarkMode ? 0 : 2} 
        sx={{ 
          p: 3, 
          maxWidth: 600,
          backgroundColor: isDarkMode ? '#1c2329' : '#ffffff',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : 'none',
        }}
      >
        <Stack spacing={3} divider={<Divider sx={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />}>
            <Box>
                <Typography variant="h6" gutterBottom sx={{ color: isDarkMode ? '#e0e0e0' : 'inherit' }}>
                  UI Theme
                </Typography>
                <Typography variant="body2" color={isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary'} sx={{ mb: 2 }}>
                    Select the overall appearance for the application.
                </Typography>
                <ToggleButtonGroup
                    value={mode} // The current mode from context
                    exclusive
                    onChange={handleThemeChange}
                    aria-label="UI Theme Selection"
                    sx={{
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 1,
                      '& .MuiToggleButton-root': {
                        color: isDarkMode ? '#a0a0a0' : 'rgba(0,0,0,0.6)',
                        '&.Mui-selected': {
                          color: isDarkMode ? '#ffffff' : theme.palette.primary.main,
                          backgroundColor: isDarkMode ? 'rgba(25, 118, 210, 0.2)' : 'rgba(0, 0, 0, 0.05)', 
                        }
                      }
                    }}
                    fullWidth
                >
                    <ToggleButton value="light" aria-label="Light Theme">
                        <Brightness7Icon sx={{ mr: 1 }} />
                        White
                    </ToggleButton>
                    <ToggleButton value="dark" aria-label="Dark Theme">
                        <Brightness4Icon sx={{ mr: 1 }} />
                        Dark
                    </ToggleButton>
                    <ToggleButton value="gecko" aria-label="Gecko Theme">
                         <PaletteIcon sx={{ mr: 1 }} />
                         Gecko
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Placeholder for future settings */}
            <Box>
                <Typography variant="h6" gutterBottom sx={{ color: isDarkMode ? '#e0e0e0' : 'inherit' }}>
                  User Preferences
                </Typography>
                <Typography variant="body2" color={isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary'}>
                    (Other settings like units, language, etc. will go here...)
                </Typography>
            </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
