import { Typography, Paper, Box, Grid } from '@mui/material';
import DroneTelemetry from '../../components/DroneTelemetry/DroneTelemetry';

const Dashboard = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Status
            </Typography>
            <Typography variant="body1">
              System is operational
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} lg={8}>
          <DroneTelemetry />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            <Typography variant="body1">
              No new notifications
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Overview
            </Typography>
            <Typography variant="body1">
              This dashboard provides an overview of all connected systems and their current status.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 