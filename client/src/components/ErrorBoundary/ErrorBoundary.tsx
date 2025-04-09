import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Alert, AlertTitle } from '@mui/material';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches errors in its child component tree
 * and displays a fallback UI instead of crashing the whole application
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  /**
   * Update state when an error occurs
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  /**
   * Log error details when componentDidCatch is called
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  /**
   * Reset the error state to try again
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError) {
      // Render custom fallback if provided, otherwise render default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box 
          sx={{ 
            p: 3, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100%',
            backgroundColor: 'rgba(33, 33, 33, 0.95)'
          }}
        >
          <Paper 
            elevation={3}
            sx={{ 
              p: 4, 
              maxWidth: 800, 
              width: '100%',
              backgroundColor: 'rgba(21, 21, 21, 0.97)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
              color: 'white'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ReportProblemOutlinedIcon
                color="error"
                fontSize="large"
                sx={{ mr: 2 }}
              />
              <Typography variant="h5" component="h2" sx={{ color: '#f44336' }}>
                Component Error
              </Typography>
            </Box>

            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                backgroundColor: 'rgba(211, 47, 47, 0.15)',
                color: '#ff8a80'
              }}
            >
              <AlertTitle>An error occurred in this component</AlertTitle>
              <Typography variant="body2" component="div" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.85rem' }}>
                {this.state.error?.toString() || 'Unknown error'}
              </Typography>
            </Alert>

            {this.state.errorInfo && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, color: '#4fc3f7' }}>
                  Error Stack:
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}
                >
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      fontFamily: '"Roboto Mono", monospace',
                      fontSize: '0.8rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
                sx={{
                  textTransform: 'none',
                  backgroundColor: '#4fc3f7',
                  color: 'rgba(0, 0, 0, 0.8)',
                  '&:hover': {
                    backgroundColor: '#29b6f6',
                  }
                }}
              >
                Try Again
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    // Render children if no error
    return this.props.children;
  }
}

export default ErrorBoundary; 