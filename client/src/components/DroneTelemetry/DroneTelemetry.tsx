import { FC } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Grid, 
  Chip, 
  CircularProgress,
  List, 
  ListItem, 
  ListItemText, 
  Button,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { useDroneTelemetry } from '../../hooks/useDroneTelemetry';

const DroneTelemetry: FC = () => {
  const { 
    droneState, 
    lastHeartbeat, 
    isConnected, 
    isLoading, 
    error,
    armDrone,
    disarmDrone,
    setDroneMode
  } = useDroneTelemetry();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error connecting to drone: {error}
      </Alert>
    );
  }

  // Format the last heartbeat timestamp
  const heartbeatTime = lastHeartbeat ? new Date(lastHeartbeat.timestamp).toLocaleTimeString() : 'No data';

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Drone Telemetry</Typography>
          <Chip 
            label={isConnected ? 'Connected' : 'Disconnected'} 
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
        </Box>

        {droneState ? (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Armed" 
                      secondary={droneState.armed ? 'Yes' : 'No'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Flight Mode" 
                      secondary={droneState.mode} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Battery" 
                      secondary={`${droneState.batteryPercentage}% (${droneState.batteryVoltage.toFixed(1)}V)`} 
                    />
                  </ListItem>
                </List>
              </Grid>

              <Grid item xs={12} sm={6}>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Altitude" 
                      secondary={`${droneState.altitude.toFixed(1)} m`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Ground Speed" 
                      secondary={`${droneState.groundSpeed.toFixed(1)} m/s`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Vertical Speed" 
                      secondary={`${droneState.verticalSpeed.toFixed(1)} m/s`} 
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>

            <Box mt={2}>
              <Typography variant="caption" display="block" gutterBottom>
                Last Heartbeat: {heartbeatTime}
              </Typography>
              <Typography variant="caption" display="block" gutterBottom>
                Position: {droneState.latitude.toFixed(6)}, {droneState.longitude.toFixed(6)}
              </Typography>
              <Typography variant="caption" display="block" gutterBottom>
                Heading: {droneState.heading.toFixed(0)}°
              </Typography>
            </Box>

            <Box mt={2}>
              <Grid container spacing={1}>
                <Grid item>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="small" 
                    onClick={() => armDrone()}
                    disabled={droneState.armed}
                  >
                    Arm
                  </Button>
                </Grid>
                <Grid item>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    size="small" 
                    onClick={() => disarmDrone()}
                    disabled={!droneState.armed}
                  >
                    Disarm
                  </Button>
                </Grid>
                <Grid item>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => setDroneMode('AUTO')}
                    disabled={!droneState.armed}
                  >
                    AUTO Mode
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </>
        ) : (
          <Typography color="textSecondary">No telemetry data available</Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default DroneTelemetry; 