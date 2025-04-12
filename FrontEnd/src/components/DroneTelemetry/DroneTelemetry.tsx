import { FC } from 'react';
import { 
  Typography, 
  Box, 
  Chip, 
  CircularProgress,
  List, 
  ListItem, 
  ListItemText, 
  Button,
  Alert,
} from '@mui/material';
import { useDroneTelemetry } from '../../hooks/useDroneTelemetry';
import { styled } from '@mui/material/styles';

// Styled components for industrial UI
const TelemetryCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: 'rgba(21, 21, 21, 0.97)',
  color: theme.palette.common.white,
  borderRadius: '4px',
  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  height: '100%',
}));

const TelemetryHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

const TelemetryTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '0.95rem',
  letterSpacing: '0.5px',
  color: 'rgba(255, 255, 255, 0.9)',
  textTransform: 'uppercase',
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  height: '22px',
  fontSize: '0.75rem',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  '&.MuiChip-colorSuccess': {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    color: '#4caf50',
    border: '1px solid rgba(76, 175, 80, 0.3)',
  },
  '&.MuiChip-colorError': {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    color: '#f44336',
    border: '1px solid rgba(244, 67, 54, 0.3)',
  },
}));

const StyledList = styled(List)(({ theme }) => ({
  padding: 0,
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(0.5, 0),
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
}));

const ListLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.8rem',
  color: 'rgba(255, 255, 255, 0.6)',
  minWidth: '100px',
}));

const ListValue = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  color: 'rgba(255, 255, 255, 0.9)',
  fontFamily: '"Roboto Mono", monospace',
}));

const MetaInfo = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.5)',
  marginTop: theme.spacing(1),
  fontFamily: '"Roboto Mono", monospace',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  minWidth: 'auto',
  fontSize: '0.75rem',
  padding: theme.spacing(0.5, 1.5),
  marginRight: theme.spacing(1),
  borderRadius: '3px',
  textTransform: 'uppercase',
  fontWeight: 500,
  letterSpacing: '0.5px',
  boxShadow: 'none',
  '&.MuiButton-containedPrimary': {
    backgroundColor: '#4fc3f7',
    color: '#000',
    '&:hover': {
      backgroundColor: '#81d4fa',
    },
  },
  '&.MuiButton-containedSecondary': {
    backgroundColor: '#ff3366',
    color: '#000',
    '&:hover': {
      backgroundColor: '#ff5c85',
    },
  },
  '&.MuiButton-outlined': {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    color: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      borderColor: 'rgba(255, 255, 255, 0.5)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
  },
  '&.Mui-disabled': {
    opacity: 0.5,
  },
}));

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
        <CircularProgress sx={{ color: '#4fc3f7' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          backgroundColor: 'rgba(244, 67, 54, 0.15)', 
          border: '1px solid rgba(244, 67, 54, 0.3)', 
          color: '#f44336',
          '& .MuiAlert-icon': { color: '#f44336' } 
        }}
      >
        Error connecting to drone: {error}
      </Alert>
    );
  }

  // Format the last heartbeat timestamp
  const heartbeatTime = lastHeartbeat ? new Date(lastHeartbeat.timestamp).toLocaleTimeString() : 'No data';

  return (
    <TelemetryCard>
      <TelemetryHeader>
        <TelemetryTitle variant="h6">Drone Telemetry</TelemetryTitle>
        <StatusChip 
          label={isConnected ? 'Connected' : 'Disconnected'} 
          color={isConnected ? 'success' : 'error'}
          size="small"
        />
      </TelemetryHeader>

      {droneState ? (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ flex: '1 1 200px' }}>
              <StyledList>
                <StyledListItem>
                  <ListLabel>Armed</ListLabel>
                  <ListValue>{droneState.armed ? 'Yes' : 'No'}</ListValue>
                </StyledListItem>
                <StyledListItem>
                  <ListLabel>Flight Mode</ListLabel>
                  <ListValue>{droneState.mode}</ListValue>
                </StyledListItem>
                <StyledListItem>
                  <ListLabel>Battery</ListLabel>
                  <ListValue>{`${droneState.batteryPercentage}% (${droneState.batteryVoltage.toFixed(1)}V)`}</ListValue>
                </StyledListItem>
              </StyledList>
            </Box>

            <Box sx={{ flex: '1 1 200px' }}>
              <StyledList>
                <StyledListItem>
                  <ListLabel>Altitude</ListLabel>
                  <ListValue>{`${droneState.altitude.toFixed(1)} m`}</ListValue>
                </StyledListItem>
                <StyledListItem>
                  <ListLabel>Ground Speed</ListLabel>
                  <ListValue>{`${droneState.groundSpeed.toFixed(1)} m/s`}</ListValue>
                </StyledListItem>
                <StyledListItem>
                  <ListLabel>Vertical Speed</ListLabel>
                  <ListValue>{`${droneState.verticalSpeed.toFixed(1)} m/s`}</ListValue>
                </StyledListItem>
              </StyledList>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <MetaInfo>
              Last Heartbeat: {heartbeatTime}
            </MetaInfo>
            <MetaInfo>
              Position: {droneState.latitude.toFixed(6)}, {droneState.longitude.toFixed(6)}
            </MetaInfo>
            <MetaInfo>
              Heading: {droneState.heading.toFixed(0)}°
            </MetaInfo>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <ActionButton 
              variant="contained" 
              color="primary" 
              size="small" 
              onClick={() => armDrone()}
              disabled={droneState.armed}
            >
              Arm
            </ActionButton>
            <ActionButton 
              variant="contained" 
              color="secondary" 
              size="small" 
              onClick={() => disarmDrone()}
              disabled={!droneState.armed}
            >
              Disarm
            </ActionButton>
            <ActionButton 
              variant="outlined" 
              size="small" 
              onClick={() => setDroneMode('AUTO')}
              disabled={!droneState.armed}
            >
              AUTO Mode
            </ActionButton>
          </Box>
        </>
      ) : (
        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' }}>
          No telemetry data available
        </Typography>
      )}
    </TelemetryCard>
  );
};

export default DroneTelemetry; 