import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Chip,
  Stack,
  Button,
  Tooltip,
  styled 
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StraightenIcon from '@mui/icons-material/Straighten';
import TimerIcon from '@mui/icons-material/Timer';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PolylineIcon from '@mui/icons-material/Polyline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useMissionSummary } from '../../hooks/useMissionSummary';
import { useNavigate } from 'react-router-dom';

// Styled components for industrial UI
const PanelContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: 'rgba(21, 21, 21, 0.97)',
  color: theme.palette.common.white,
  borderRadius: '4px',
  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const PanelTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '0.95rem',
  letterSpacing: '0.5px',
  color: 'rgba(255, 255, 255, 0.9)',
  textTransform: 'uppercase',
  marginBottom: theme.spacing(2),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.8rem',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.7)',
  marginBottom: theme.spacing(1),
}));

const InfoLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.5)',
  marginBottom: theme.spacing(0.25),
}));

const InfoValue = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  color: 'rgba(255, 255, 255, 0.9)',
  fontWeight: 500,
  marginBottom: theme.spacing(1),
}));

const ActionButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  textTransform: 'none',
  fontWeight: 500,
  boxShadow: 'none',
  '&.MuiButton-containedPrimary': {
    backgroundColor: '#4fc3f7',
    color: '#000',
    '&:hover': {
      backgroundColor: '#81d4fa',
    },
  },
}));

const NoMissionContainer = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(3),
  color: 'rgba(255, 255, 255, 0.5)',
}));

const StatItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
}));

const StatIcon = styled(Box)(({ theme }) => ({
  marginRight: theme.spacing(1),
  color: 'rgba(255, 255, 255, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StatValue = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: 'rgba(255, 255, 255, 0.9)',
  fontWeight: 500,
}));

const StatLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.5)',
}));

const ReadyChip = styled(Chip)(({ theme }) => ({
  height: '24px',
  fontSize: '0.75rem',
  fontWeight: 500,
  marginLeft: 'auto',
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

const MissionId = styled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: 'rgba(255, 255, 255, 0.4)',
  fontFamily: '"Roboto Mono", monospace',
  marginTop: theme.spacing(0.5),
}));

const MissionSummaryPanel: React.FC = () => {
  const missionSummary = useMissionSummary();
  const navigate = useNavigate();

  const goToMissionPlanning = () => {
    navigate('/mission');
  };

  const goToGeoPage = () => {
    navigate('/geo');
  };

  if (!missionSummary.missionId) {
    return (
      <PanelContainer>
        <PanelTitle>Mission Summary</PanelTitle>
        <NoMissionContainer>
          <Typography variant="body1" sx={{ mb: 2, fontSize: '0.9rem' }}>
            No mission is currently selected.
          </Typography>
          <ActionButton 
            variant="contained" 
            color="primary" 
            onClick={goToGeoPage}
            endIcon={<ArrowForwardIcon />}
          >
            Create New Mission
          </ActionButton>
        </NoMissionContainer>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <PanelTitle sx={{ mb: 0 }}>Mission Summary</PanelTitle>
        <ReadyChip 
          label={missionSummary.isSimulationReady ? 'Ready' : 'Incomplete'} 
          color={missionSummary.isSimulationReady ? 'success' : 'error'}
          size="small"
        />
      </Box>

      <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
        {missionSummary.missionName}
      </Typography>
      
      <MissionId>
        ID: {missionSummary.missionId?.substring(0, 8)}...
      </MissionId>
      
      <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
        Created: {missionSummary.createdAt}
      </Typography>

      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      <SectionTitle>Hardware Configuration</SectionTitle>
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Box>
          <InfoLabel>Drone</InfoLabel>
          <InfoValue>{missionSummary.droneName}</InfoValue>
        </Box>
        <Box>
          <InfoLabel>Camera</InfoLabel>
          <InfoValue>{missionSummary.cameraName}</InfoValue>
        </Box>
        <Box>
          <InfoLabel>Lens</InfoLabel>
          <InfoValue>{missionSummary.lensName}</InfoValue>
        </Box>
      </Stack>

      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      <SectionTitle>Mission Statistics</SectionTitle>
      <Box sx={{ mb: 2 }}>
        <StatItem>
          <StatIcon>
            <PolylineIcon fontSize="small" />
          </StatIcon>
          <Box>
            <StatValue>{missionSummary.pathSegmentCount}</StatValue>
            <StatLabel>Path Segments</StatLabel>
          </Box>
        </StatItem>

        <StatItem>
          <StatIcon>
            <LocationOnIcon fontSize="small" />
          </StatIcon>
          <Box>
            <StatValue>{missionSummary.waypointCount}</StatValue>
            <StatLabel>Waypoints</StatLabel>
          </Box>
        </StatItem>

        <StatItem>
          <StatIcon>
            <StraightenIcon fontSize="small" />
          </StatIcon>
          <Box>
            <Tooltip title={`${missionSummary.totalDistanceMeters.toFixed(1)} meters`}>
              <StatValue>{Math.round(missionSummary.totalDistanceFeet)} ft</StatValue>
            </Tooltip>
            <StatLabel>Total Distance</StatLabel>
          </Box>
        </StatItem>

        <StatItem>
          <StatIcon>
            <TimerIcon fontSize="small" />
          </StatIcon>
          <Box>
            <StatValue>{missionSummary.estimatedFlightTimeFormatted}</StatValue>
            <StatLabel>Est. Flight Time</StatLabel>
          </Box>
        </StatItem>

        <StatItem>
          <StatIcon>
            <CameraAltIcon fontSize="small" />
          </StatIcon>
          <Box>
            <StatValue>{missionSummary.gcpCount}</StatValue>
            <StatLabel>GCPs</StatLabel>
          </Box>
        </StatItem>
      </Box>

      <Box sx={{ mt: 'auto' }}>
        <ActionButton 
          variant="contained" 
          color="primary" 
          fullWidth 
          onClick={goToMissionPlanning}
          endIcon={<ArrowForwardIcon />}
        >
          Go to Mission Planning
        </ActionButton>
      </Box>
    </PanelContainer>
  );
};

export default MissionSummaryPanel; 