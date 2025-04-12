import React, { useState, useEffect, useRef } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import Draggable from 'react-draggable';
import SpeedIcon from '@mui/icons-material/Speed';

interface FpsDisplayProps {
  visible: boolean;
}

const FpsDisplay: React.FC<FpsDisplayProps> = ({ visible }) => {
  const [fps, setFps] = useState<number>(0);
  const [avgFps, setAvgFps] = useState<number>(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  const animationFrameId = useRef<number | null>(null);
  
  // Set up FPS measurement
  useEffect(() => {
    if (!visible) {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }
    
    const updateFps = () => {
      frameCount.current++;
      const now = performance.now();
      const elapsed = now - lastTime.current;
      
      // Update FPS every second
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCount.current * 1000) / elapsed);
        setFps(currentFps);
        
        // Update FPS history for average calculation
        fpsHistory.current.push(currentFps);
        if (fpsHistory.current.length > 30) { // Keep last 30 samples
          fpsHistory.current.shift();
        }
        
        // Calculate average
        const average = fpsHistory.current.reduce((sum, value) => sum + value, 0) / fpsHistory.current.length;
        setAvgFps(Math.round(average));
        
        // Reset counters
        frameCount.current = 0;
        lastTime.current = now;
      }
      
      animationFrameId.current = requestAnimationFrame(updateFps);
    };
    
    animationFrameId.current = requestAnimationFrame(updateFps);
    
    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [visible]);
  
  if (!visible) return null;
  
  // Determine color based on performance
  const getFpsColor = (fps: number): string => {
    if (fps >= 50) return '#4caf50'; // Green for good performance
    if (fps >= 30) return '#ff9800'; // Orange for acceptable performance
    return '#f44336'; // Red for poor performance
  };
  
  return (
    <Draggable bounds="parent" handle=".drag-handle">
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 1,
          width: 120,
          userSelect: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box 
          className="drag-handle"
          sx={{ 
            cursor: 'move', 
            p: 1, 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(50, 50, 50, 0.7)',
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <SpeedIcon sx={{ fontSize: 16, color: '#64ffda', mr: 0.5 }} />
          <Typography variant="caption" sx={{ color: '#64ffda', fontWeight: 500 }}>
            FPS Monitor
          </Typography>
        </Box>
        <Box sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Current:
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 'bold', 
                color: getFpsColor(fps),
                fontSize: '0.8rem'
              }}
            >
              {fps} FPS
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Average:
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 'bold', 
                color: getFpsColor(avgFps),
                fontSize: '0.8rem'
              }}
            >
              {avgFps} FPS
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Draggable>
  );
};

export default FpsDisplay; 