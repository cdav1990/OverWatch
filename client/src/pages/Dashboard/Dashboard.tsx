import { Typography, Paper, Box, Grid, Theme } from '@mui/material';
import DroneTelemetry from '../../components/DroneTelemetry/DroneTelemetry';
import { styled } from '@mui/material/styles';

// Styled components for industrial UI
const DashboardContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'transparent',
  color: theme.palette.common.white,
}));

const DashboardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '1.5rem',
  letterSpacing: '1px',
  marginBottom: theme.spacing(3),
  textTransform: 'uppercase',
  color: '#4fc3f7', // Match blue accent color from other components
}));

const DashboardCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: 'rgba(21, 21, 21, 0.97)',
  color: theme.palette.common.white,
  borderRadius: '4px',
  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  height: '100%',
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '0.95rem',
  letterSpacing: '0.5px',
  marginBottom: theme.spacing(2),
  color: 'rgba(255, 255, 255, 0.9)',
  textTransform: 'uppercase',
}));

const CardContent = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: '"Roboto Mono", monospace',
}));

// Define the status type
type StatusType = 'online' | 'offline' | 'warning';

// Define props for the StatusIndicator
interface StatusIndicatorProps {
  status: StatusType;
}

const StatusIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status'
})<StatusIndicatorProps>(({ theme, status }) => ({
  display: 'inline-block',
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  marginRight: theme.spacing(1),
  backgroundColor: 
    status === 'online' ? '#4caf50' :
    status === 'warning' ? '#ff9800' : 
    '#f44336',
}));

const Dashboard = () => {
  return (
    <DashboardContainer>
      <DashboardTitle variant="h4">
        Dashboard
      </DashboardTitle>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard>
            <CardTitle variant="h6">
              System Status
            </CardTitle>
            <Box display="flex" alignItems="center">
              <StatusIndicator status="online" />
              <CardContent variant="body1">
                System is operational
              </CardContent>
            </Box>
          </DashboardCard>
        </Grid>
        <Grid item xs={12} md={6} lg={8}>
          <DroneTelemetry />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard>
            <CardTitle variant="h6">
              Notifications
            </CardTitle>
            <CardContent variant="body1">
              No new notifications
            </CardContent>
          </DashboardCard>
        </Grid>
        <Grid item xs={12} md={6} lg={8}>
          <DashboardCard>
            <CardTitle variant="h6">
              System Overview
            </CardTitle>
            <CardContent variant="body1">
              This dashboard provides an overview of all connected systems and their current status.
            </CardContent>
          </DashboardCard>
        </Grid>
      </Grid>
    </DashboardContainer>
  );
};

export default Dashboard; 