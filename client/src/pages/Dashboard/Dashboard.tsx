import React, { useState } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Tabs, 
  Tab, 
  IconButton, 
  Modal, 
  Fade, 
  Backdrop,
  Divider,
  Button,
  Tooltip,
  Badge,
  LinearProgress,
  Alert,
  AlertTitle,
  CircularProgress,
  ButtonGroup,
  Menu,
  MenuItem
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DroneTelemetry from '../../components/DroneTelemetry/DroneTelemetry';
import MissionSummaryPanel from '../../components/MissionSummary/MissionSummaryPanel';
import RosTopicsPanel from '../../components/RosTopicsPanel/RosTopicsPanel';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useDroneTelemetry } from '../../hooks/useDroneTelemetry';
import { useSystemHealth } from '../../hooks/useSystemHealth';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Styled components for enterprise-grade UI
const DashboardContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'transparent',
  color: theme.palette.common.white,
  height: 'calc(100vh - 64px)',
  display: 'flex',
  flexDirection: 'column',
}));

const DashboardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '1.5rem',
  letterSpacing: '1px',
  marginBottom: theme.spacing(2),
  textTransform: 'uppercase',
  color: '#4fc3f7',
}));

const DashboardCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: 'rgba(21, 21, 21, 0.97)',
  color: theme.palette.common.white,
  borderRadius: '4px',
  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: '0px 6px 15px rgba(0, 0, 0, 0.35)',
    borderColor: 'rgba(79, 195, 247, 0.2)',
  }
}));

const CardHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '0.95rem',
  letterSpacing: '0.5px',
  color: 'rgba(255, 255, 255, 0.9)',
  textTransform: 'uppercase',
}));

const CardContent = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: '"Roboto Mono", monospace',
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiTabs-indicator': {
    backgroundColor: '#4fc3f7',
  },
  '& .MuiTab-root': {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.7)',
    '&.Mui-selected': {
      color: '#4fc3f7',
    },
  },
}));

const ModalContent = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: '1200px',
  height: '90vh',
  backgroundColor: 'rgba(21, 21, 21, 0.97)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)',
  padding: theme.spacing(4),
  borderRadius: '4px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const StatsCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: 'rgba(21, 21, 21, 0.9)',
  color: theme.palette.common.white,
  borderRadius: '4px',
  boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.2)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease-in-out',
  height: '100%',
  '&:hover': {
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
    borderColor: 'rgba(79, 195, 247, 0.2)',
  }
}));

const StatValue = styled(Typography)(({ theme }) => ({
  fontSize: '2.2rem',
  fontWeight: 400,
  marginTop: theme.spacing(1),
  color: '#4fc3f7',
}));

const StatLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: 500,
  letterSpacing: '0.3px',
  borderRadius: '4px',
  padding: theme.spacing(0.75, 2),
  '&.MuiButton-contained': {
    backgroundColor: '#4fc3f7',
    color: 'rgba(0, 0, 0, 0.8)',
    '&:hover': {
      backgroundColor: '#29b6f6',
    },
  },
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
  boxShadow: status === 'online' ? '0 0 6px #4caf50' : 
            status === 'warning' ? '0 0 6px #ff9800' : 
            '0 0 6px #f44336',
}));

// Custom expandable panel component
interface ExpandablePanelProps {
  title: string;
  children: React.ReactNode;
  status?: StatusType;
}

const ExpandablePanel: React.FC<ExpandablePanelProps> = ({ title, children, status }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      <DashboardCard>
        <CardHeader>
          <Box display="flex" alignItems="center">
            {status && <StatusIndicator status={status} />}
            <CardTitle>{title}</CardTitle>
          </Box>
          <Tooltip title="Expand panel">
            <IconButton 
              size="small" 
              onClick={toggleFullscreen}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardHeader>
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {children}
        </Box>
      </DashboardCard>

      <Modal
        open={isFullscreen}
        onClose={toggleFullscreen}
        closeAfterTransition
        slots={{
          backdrop: Backdrop,
        }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={isFullscreen}>
          <ModalContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" sx={{ color: '#4fc3f7', fontWeight: 500 }}>
                {title}
              </Typography>
              <IconButton 
                onClick={toggleFullscreen}
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <FullscreenExitIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {children}
            </Box>
          </ModalContent>
        </Fade>
      </Modal>
    </>
  );
};

// Render mission items with status indicators
interface MissionItemProps {
  name: string;
  status: 'completed' | 'active' | 'scheduled';
  lastRun: string;
  description: string;
}

const MissionItem: React.FC<MissionItemProps> = ({ name, status, lastRun, description }) => {
  return (
    <Box sx={{ 
      p: 1.5, 
      borderRadius: '4px', 
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      mb: 1,
      border: '1px solid rgba(255, 255, 255, 0.06)'
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Box display="flex" alignItems="center">
          <StatusIndicator status={
            status === 'completed' ? 'online' : 
            status === 'active' ? 'warning' : 'offline'
          } />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {name}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          {lastRun}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', ml: 2.5 }}>
        {description}
      </Typography>
    </Box>
  );
};

// Refresh Rate Selector component
interface RefreshRateSelectorProps {
  currentRate: number;
  onRateChange: (rate: number) => void;
}

const RefreshRateSelector: React.FC<RefreshRateSelectorProps> = ({ currentRate, onRateChange }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Predefined refresh rates in milliseconds with performance indicators
  const refreshRates = [
    { label: '10 Hz', value: 100, performance: 'high' },
    { label: '5 Hz', value: 200, performance: 'high' },
    { label: '2 Hz', value: 500, performance: 'medium' },
    { label: '1 Hz', value: 1000, performance: 'medium' },
    { label: '0.5 Hz', value: 2000, performance: 'low' },
    { label: '0.2 Hz', value: 5000, performance: 'low' }
  ];

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRateSelect = (rate: number) => {
    onRateChange(rate);
    handleClose();
  };

  // Find the current rate label and performance
  const currentRateInfo = refreshRates.find(rate => rate.value === currentRate);
  const currentRateLabel = currentRateInfo?.label || 
    (currentRate < 1000 ? `${(1000 / currentRate).toFixed(1)} Hz` : `${(currentRate / 1000).toFixed(1)} sec`);
  
  // Determine color based on performance impact
  const getRateColor = (performance: string) => {
    return performance === 'high' ? '#ff9800' : 
           performance === 'medium' ? '#4fc3f7' : '#4caf50';
  };

  return (
    <>
      <ButtonGroup 
        variant="outlined" 
        size="small"
        sx={{ 
          '.MuiButtonGroup-grouped': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }
          }
        }}
      >
        <Button 
          sx={{ 
            minWidth: '80px', 
            fontSize: '0.75rem',
            backgroundColor: 'rgba(0,0,0,0.2)',
            color: currentRateInfo ? getRateColor(currentRateInfo.performance) : 'inherit'
          }}
        >
          {currentRateLabel}
        </Button>
        <Button
          size="small"
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
          sx={{ padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </Button>
      </ButtonGroup>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'refresh-rate-button',
          sx: { 
            backgroundColor: 'rgba(33, 33, 33, 0.95)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: '140px'
          }
        }}
      >
        {refreshRates.map((rate) => (
          <MenuItem 
            key={rate.value} 
            onClick={() => handleRateSelect(rate.value)}
            selected={currentRate === rate.value}
            sx={{ 
              fontSize: '0.85rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              '&.Mui-selected': {
                backgroundColor: 'rgba(79, 195, 247, 0.15)',
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <span>{rate.label}</span>
            <Box
              component="span"
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                ml: 1,
                backgroundColor: getRateColor(rate.performance),
                boxShadow: `0 0 4px ${getRateColor(rate.performance)}`
              }}
            />
          </MenuItem>
        ))}
        <Box sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 1, fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' }}>
          Higher rates increase system load
        </Box>
      </Menu>
    </>
  );
};

const Dashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshRate, setRefreshRate] = useState<number>(1000); // Default to 1 second (1 Hz)
  const [showRefreshRateChange, setShowRefreshRateChange] = useState(false);
  const { isConnected } = useDroneTelemetry();
  const { 
    systemHealth, 
    isLoading: isSystemHealthLoading, 
    error: systemHealthError,
    lastUpdated: systemHealthLastUpdated,
    refresh: refreshSystemHealth
  } = useSystemHealth({ 
    pollingInterval: refreshRate,
    suppressErrors: true // Explicitly suppress errors 
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Refresh system health data
    refreshSystemHealth().then(() => {
      setLastRefresh(new Date());
      setIsRefreshing(false);
    });
  };

  const handleRefreshRateChange = (rate: number) => {
    setRefreshRate(rate);
    // Show visual confirmation that refresh rate changed
    setShowRefreshRateChange(true);
    setTimeout(() => setShowRefreshRateChange(false), 1500); // Hide after 1.5 seconds
  };

  // Format the refresh rate for display
  const formatRefreshRate = (ms: number): string => {
    if (ms < 1000) {
      return `${(1000 / ms).toFixed(1)} Hz`;
    }
    return `${(ms / 1000).toFixed(1)} sec`;
  };

  // Format data for recent missions
  const recentMissions: MissionItemProps[] = [
    {
      name: "Survey Mission #1205",
      status: "completed",
      lastRun: "Today, 9:30 AM",
      description: "Area mapping with high-resolution imagery collection"
    },
    {
      name: "Inspection Route #872",
      status: "active",
      lastRun: "Today, 11:45 AM",
      description: "Pipeline infrastructure inspection with thermal imaging"
    },
    {
      name: "Perimeter Security #345",
      status: "scheduled",
      lastRun: "Yesterday, 3:15 PM",
      description: "Automated security route with anomaly detection"
    }
  ];

  // Format the last updated time
  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <DashboardContainer>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <DashboardTitle variant="h4">
          Dashboard
        </DashboardTitle>
        <Box>
          <Tooltip title="Notifications">
            <IconButton
              size="small"
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                mr: 1,
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <Badge badgeContent={2} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}>
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isRefreshing && (
        <LinearProgress 
          sx={{ 
            mb: 2, 
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#4fc3f7'
            }
          }} 
        />
      )}

      <StyledTabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
        <Tab label="Overview" id="dashboard-tab-0" aria-controls="dashboard-tabpanel-0" />
        <Tab label="System Status" id="dashboard-tab-1" aria-controls="dashboard-tabpanel-1" />
        <Tab label="ROS Integration" id="dashboard-tab-2" aria-controls="dashboard-tabpanel-2" />
      </StyledTabs>

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, height: 'auto' }}>
            {/* Stats cards */}
            <Box sx={{ flex: { xs: '100%', sm: '45%', md: '22%' } }}>
              <StatsCard>
                <StatLabel>Total Missions</StatLabel>
                <StatValue>5</StatValue>
              </StatsCard>
            </Box>
            <Box sx={{ flex: { xs: '100%', sm: '45%', md: '22%' } }}>
              <StatsCard>
                <StatLabel>Active Alerts</StatLabel>
                <StatValue>0</StatValue>
              </StatsCard>
            </Box>
            <Box sx={{ flex: { xs: '100%', sm: '45%', md: '22%' } }}>
              <StatsCard>
                <StatLabel>Drone Status</StatLabel>
                <Box display="flex" alignItems="center" mt={1}>
                  <StatusIndicator status={isConnected ? 'online' : 'offline'} />
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: isConnected ? '#4caf50' : '#f44336',
                      fontWeight: 500
                    }}
                  >
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Typography>
                </Box>
              </StatsCard>
            </Box>
            <Box sx={{ flex: { xs: '100%', sm: '45%', md: '22%' } }}>
              <StatsCard>
                <StatLabel>GPS Satellites</StatLabel>
                <StatValue>12</StatValue>
                <Typography variant="caption" sx={{ color: '#4caf50' }}>
                  RTK Fixed
                </Typography>
              </StatsCard>
            </Box>

            {/* System Health Panel */}
            <Box sx={{ flex: { xs: '100%', md: '30%' } }}>
              <ExpandablePanel title="System Health">
                <Box sx={{ p: 1 }}>
                  {isSystemHealthLoading && (
                    <Box display="flex" justifyContent="center" my={2}>
                      <CircularProgress size={24} sx={{ color: '#4fc3f7' }} />
                    </Box>
                  )}
                  
                  {systemHealthError && (
                    <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(244, 67, 54, 0.1)' }}>
                      {systemHealthError}
                    </Alert>
                  )}

                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <SpeedIcon fontSize="small" sx={{ mr: 1, color: '#4fc3f7', opacity: 0.8 }} />
                        <Typography variant="body2">CPU Usage</Typography>
                      </Box>
                      <Typography variant="body2">{systemHealth.cpu.toFixed(1)}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemHealth.cpu} 
                      sx={{ 
                        mt: 0.5, 
                        height: 8, 
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: systemHealth.cpu > 80 ? '#f44336' : 
                                          systemHealth.cpu > 60 ? '#ff9800' : '#4caf50'
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <MemoryIcon fontSize="small" sx={{ mr: 1, color: '#4fc3f7', opacity: 0.8 }} />
                        <Typography variant="body2">Memory Usage</Typography>
                      </Box>
                      <Typography variant="body2">{systemHealth.memory.toFixed(1)}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemHealth.memory} 
                      sx={{ 
                        mt: 0.5, 
                        height: 8, 
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: systemHealth.memory > 80 ? '#f44336' : 
                                          systemHealth.memory > 60 ? '#ff9800' : '#4caf50'
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <StorageIcon fontSize="small" sx={{ mr: 1, color: '#4fc3f7', opacity: 0.8 }} />
                        <Typography variant="body2">Storage Usage</Typography>
                      </Box>
                      <Typography variant="body2">{systemHealth.storage.toFixed(1)}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemHealth.storage} 
                      sx={{ 
                        mt: 0.5, 
                        height: 8, 
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: systemHealth.storage > 80 ? '#f44336' : 
                                          systemHealth.storage > 60 ? '#ff9800' : '#4caf50'
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <DataUsageIcon fontSize="small" sx={{ mr: 1, color: '#4fc3f7', opacity: 0.8 }} />
                        <Typography variant="body2">Network Bandwidth</Typography>
                      </Box>
                      <Typography variant="body2">{systemHealth.network.toFixed(1)}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemHealth.network} 
                      sx={{ 
                        mt: 0.5, 
                        height: 8, 
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: systemHealth.network > 80 ? '#ff9800' : '#4caf50'
                        }
                      }}
                    />
                  </Box>

                  {/* Refresh Rate Selector */}
                  <Box sx={{ mb: 2, mt: 3 }}>
                    <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <SpeedIcon fontSize="small" sx={{ mr: 1, color: '#4fc3f7', opacity: 0.8 }} />
                        <Typography variant="body2">Refresh Rate</Typography>
                      </Box>
                      <Box position="relative">
                        <RefreshRateSelector 
                          currentRate={refreshRate} 
                          onRateChange={handleRefreshRateChange}
                        />
                        {showRefreshRateChange && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -24,
                              right: 8,
                              backgroundColor: 'rgba(79, 195, 247, 0.2)',
                              borderRadius: '4px',
                              px: 1,
                              py: 0.5,
                              fontSize: '0.7rem',
                              color: '#4fc3f7',
                              animation: 'fadeInOut 1.5s ease-in-out',
                              '@keyframes fadeInOut': {
                                '0%': { opacity: 0 },
                                '10%': { opacity: 1 },
                                '80%': { opacity: 1 },
                                '100%': { opacity: 0 },
                              },
                            }}
                          >
                            Updated
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        CPU Temp: {systemHealth.temperature}°C
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Processes: {systemHealth.processes}
                      </Typography>
                    </Box>
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 0.5, textAlign: 'right' }}>
                      Last updated: {formatLastUpdated(systemHealthLastUpdated)}
                    </Typography>
                  </Box>
                </Box>
              </ExpandablePanel>
            </Box>

            {/* Recent Missions Panel */}
            <Box sx={{ flex: { xs: '100%', md: '65%' } }}>
              <ExpandablePanel title="Recent Missions">
                <Box sx={{ p: 1 }}>
                  {recentMissions.map((mission, index) => (
                    <MissionItem 
                      key={index}
                      name={mission.name}
                      status={mission.status}
                      lastRun={mission.lastRun}
                      description={mission.description}
                    />
                  ))}
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <ActionButton
                      variant="contained"
                      startIcon={<DescriptionIcon />}
                      size="small"
                    >
                      View All Missions
                    </ActionButton>
                  </Box>
                </Box>
              </ExpandablePanel>
            </Box>

            {/* Environmental Status */}
            <Box sx={{ width: '100%' }}>
              <Alert 
                severity="success"
                icon={<CheckCircleOutlineIcon />}
                sx={{
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  color: '#4caf50',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  '& .MuiAlert-icon': {
                    color: '#4caf50'
                  }
                }}
              >
                <AlertTitle>All Systems Operational</AlertTitle>
                Current environment: <strong>Production</strong> — System status checks passing on all nodes
              </Alert>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, height: '100%' }}>
            <Box sx={{ 
              flex: { xs: '100%', md: '45%', lg: '30%' },
              height: { md: '50%', lg: '100%' }  
            }}>
              <ExpandablePanel title="System Status" status="online">
                <DroneTelemetry />
              </ExpandablePanel>
            </Box>
            <Box sx={{ 
              flex: { xs: '100%', md: '45%', lg: '65%' },
              height: { md: '50%', lg: '50%' }  
            }}>
              <ExpandablePanel title="Mission Information">
                <MissionSummaryPanel />
              </ExpandablePanel>
            </Box>
            <Box sx={{ 
              flex: { xs: '100%', lg: '65%' },
              height: { xs: 'auto', lg: '50%' }, 
              display: { xs: 'block', md: 'none', lg: 'block' }  
            }}>
              <ExpandablePanel title="System Configuration" status="online">
                <Box p={2}>
                  <Typography variant="subtitle1" gutterBottom>
                    Advanced Configuration
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                    Configure system parameters and drone settings
                  </Typography>
                  <ActionButton
                    variant="contained"
                    startIcon={<SettingsIcon />}
                    size="small"
                  >
                    Open Configuration Panel
                  </ActionButton>
                </Box>
              </ExpandablePanel>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, height: '100%' }}>
            <Box sx={{ flex: { xs: '100%', md: '58%' }, height: '100%' }}>
              <ExpandablePanel title="ROS Topics">
                <RosTopicsPanel />
              </ExpandablePanel>
            </Box>
            <Box sx={{ flex: { xs: '100%', md: '38%' }, height: '100%' }}>
              <ExpandablePanel title="ROS Connections" status="online">
                <CardContent>
                  Connected Nodes: 8
                </CardContent>
                <CardContent>
                  Active Topics: 42
                </CardContent>
                <CardContent>
                  Message Frequency: 20Hz
                </CardContent>
              </ExpandablePanel>
            </Box>
          </Box>
        </TabPanel>
      </Box>
    </DashboardContainer>
  );
};

export default Dashboard; 