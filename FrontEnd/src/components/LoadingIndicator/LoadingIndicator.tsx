import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LoadingIndicatorProps {
  size?: number;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit';
  delay?: number; // Delay in ms before showing the loader
  fullSize?: boolean; // Whether to take the full container size
}

/**
 * A reusable loading indicator component that can be delayed 
 * to prevent UI flashing during quick loads
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 30,
  color = 'info',
  delay = 150,
  fullSize = false,
}) => {
  const [showLoader, setShowLoader] = useState(delay === 0);
  
  useEffect(() => {
    if (delay === 0) return;
    
    // Only show the loader if loading takes more than the specified delay
    const timer = setTimeout(() => {
      setShowLoader(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  // Don't render anything if we're still within the delay period
  if (!showLoader) return null;
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: fullSize ? '100%' : 'auto',
        width: fullSize ? '100%' : 'auto',
        padding: fullSize ? 0 : 2
      }}
    >
      <CircularProgress color={color} size={size} />
    </Box>
  );
};

export default LoadingIndicator; 