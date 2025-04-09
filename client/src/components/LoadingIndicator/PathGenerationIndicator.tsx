import React from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

interface PathGenerationIndicatorProps {
  message?: string;
}

/**
 * A loading indicator specifically for path generation operations
 * Displays over the content to prevent UI freezing appearance
 */
const PathGenerationIndicator: React.FC<PathGenerationIndicatorProps> = ({ 
  message = 'Generating path...'
}) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          backgroundColor: 'rgba(21, 21, 21, 0.9)',
          borderRadius: '8px',
          maxWidth: '300px'
        }}
      >
        <CircularProgress size={40} thickness={4} color="primary" />
        <Typography variant="body1" color="white">
          {message}
        </Typography>
      </Paper>
    </Box>
  );
};

export default PathGenerationIndicator; 