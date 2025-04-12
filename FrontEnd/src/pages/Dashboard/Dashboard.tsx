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
import { styled, keyframes } from '@mui/material/styles';
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

// Add new animations for industrial theme
const scanLineHorizontal = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const pulse = keyframes`
  0% { opacity: 0.7; text-shadow: 0 0 10px rgba(79, 195, 247, 0.3); }
  50% { opacity: 1; text-shadow: 0 0 20px rgba(79, 195, 247, 0.8); }
  100% { opacity: 0.7; text-shadow: 0 0 10px rgba(79, 195, 247, 0.3); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(79, 195, 247, 0.3); }
  50% { box-shadow: 0 0 15px rgba(79, 195, 247, 0.6); }
  100% { box-shadow: 0 0 5px rgba(79, 195, 247, 0.3); }
`;

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

// Styled components for industrial-grade UI
const DashboardContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'transparent',
  backgroundImage: `
    linear-gradient(rgba(0, 0, 0, 0.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.5) 1px, transparent 1px),
    radial-gradient(circle at 50% 50%, rgba(30, 40, 50, 0.3) 0%, rgba(6, 10, 14, 0.9) 100%)
  `,
  backgroundSize: '40px 40px, 40px 40px, 100% 100%',
  color: theme.palette.common.white,
  height: 'calc(100vh - 72px)',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 50% 70%, rgba(79, 195, 247, 0.1) 0%, rgba(0, 0, 0, 0) 60%)',
    pointerEvents: 'none',
  }
}));

const DashboardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '1.6rem',
  letterSpacing: '2px',
  marginBottom: theme.spacing(2),
  textTransform: 'uppercase',
  color: '#4fc3f7',
  fontFamily: '"Rajdhani", "Roboto", sans-serif',
  animation: `${pulse} 3s infinite ease-in-out`,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -8,
    left: 0,
    width: '60px',
    height: '2px',
    background: 'linear-gradient(90deg, rgba(79, 195, 247, 0.8), rgba(79, 195, 247, 0))',
  }
}));

const DashboardCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: 'rgba(10, 15, 20, 0.90)',
  color: theme.palette.common.white,
  borderRadius: '4px',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.5)',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease-in-out',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, rgba(79, 195, 247, 0), rgba(79, 195, 247, 0.5), rgba(79, 195, 247, 0))',
  },
  '&:hover': {
    boxShadow: '0px 6px 25px rgba(0, 0, 0, 0.5)',
    borderColor: 'rgba(79, 195, 247, 0.3)',
    '&::after': {
      opacity: 1,
    }
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, rgba(79, 195, 247, 0), rgba(79, 195, 247, 0.5), rgba(79, 195, 247, 0))',
    opacity: 0,
    transition: 'opacity 0.3s ease-in-out',
    animation: `${scanLineHorizontal} 4s infinite linear`,
  }
}));

const CardHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  position: 'relative',
  paddingBottom: theme.spacing(1),
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '1px',
    background: 'linear-gradient(90deg, rgba(79, 195, 247, 0.3), rgba(255, 255, 255, 0.05), rgba(79, 195, 247, 0))',
  }
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.95rem',
  letterSpacing: '1px',
  color: 'rgba(255, 255, 255, 0.9)',
  textTransform: 'uppercase',
  fontFamily: '"Rajdhani", "Roboto", sans-serif',
}));

const CardContent = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: '"Roboto Mono", monospace',
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'rgba(79, 195, 247, 0.15)',
  },
  '& .MuiTabs-indicator': {
    backgroundColor: '#4fc3f7',
    height: '3px',
    borderRadius: '1px 1px 0 0',
    boxShadow: '0 0 8px rgba(79, 195, 247, 0.6)',
  },
  '& .MuiTab-root': {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.95rem',
    letterSpacing: '0.5px',
    color: 'rgba(255, 255, 255, 0.7)',
    minHeight: '48px',
    '&.Mui-selected': {
      color: '#4fc3f7',
      fontWeight: 600,
    },
    '&:hover': {
      color: 'rgba(79, 195, 247, 0.9)',
      backgroundColor: 'rgba(79, 195, 247, 0.05)',
    }
  },
}));

// Add new styled components for stats cards
const StatsCard = styled(DashboardCard)(({ theme }) => ({
  padding: theme.spacing(2),
  transition: 'all 0.3s ease-in-out',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: '130px',
  '&:hover': {
    animation: `${glow} 2s infinite ease-in-out`,
  }
}));

const StatLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  fontWeight: 500,
  letterSpacing: '0.5px',
  color: 'rgba(255, 255, 255, 0.7)',
  textTransform: 'uppercase',
  marginBottom: theme.spacing(1),
}));

const StatValue = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  color: '#4fc3f7',
  fontFamily: '"Rajdhani", "Roboto", sans-serif',
  letterSpacing: '1px',
  lineHeight: 1.2,
  textShadow: '0 0 10px rgba(79, 195, 247, 0.4)',
}));

// Enhanced StatusIndicator
type StatusType = 'online' | 'offline' | 'warning';

interface StatusIndicatorProps {
  status: StatusType;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getColor = () => {
    switch (status) {
      case 'online':
        return '#4caf50';
      case 'offline':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: getColor(),
        boxShadow: `0 0 8px ${getColor()}`,
        display: 'inline-block',
        marginRight: 1.5,
        position: 'relative',
        overflow: 'visible',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          borderRadius: '50%',
          border: `1px solid ${getColor()}`,
          opacity: 0.5,
          animation: status === 'online' ? 'pulse 2s infinite' : 'none',
        }
      }}
    />
  );
};

// Enhanced ActionButton for an industrial look
const ActionButton = styled(Button)(({ theme }) => ({
  backgroundColor: 'rgba(79, 195, 247, 0.15)',
  color: '#4fc3f7',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.85rem',
  padding: '6px 16px',
  border: '1px solid rgba(79, 195, 247, 0.3)',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    backgroundColor: 'rgba(79, 195, 247, 0.25)',
    borderColor: 'rgba(79, 195, 247, 0.5)',
    boxShadow: '0 0 10px rgba(79, 195, 247, 0.3)',
  },
  '&:active': {
    backgroundColor: 'rgba(79, 195, 247, 0.35)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
    transform: 'translateY(-100%)',
    transition: 'transform 0.3s ease-in-out',
  },
  '&:hover::before': {
    transform: 'translateY(100%)',
  }
}));

// Enhanced ModalContent for fullscreen panels
const ModalContent = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  height: '90%',
  backgroundColor: 'rgba(10, 15, 20, 0.97)',
  borderRadius: '8px',
  padding: theme.spacing(4),
  boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.5)',
  border: '1px solid rgba(79, 195, 247, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  outline: 'none',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, rgba(79, 195, 247, 0), rgba(79, 195, 247, 0.8), rgba(79, 195, 247, 0))',
  }
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
      {/* Scan line effect for top of dashboard */}
      <Box
        sx={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(79, 195, 247, 0), rgba(79, 195, 247, 0.3), rgba(79, 195, 247, 0))',
          opacity: 0.7,
          zIndex: 0,
        }}
      />
      
      <Box display="flex" justifyContent="space-between" alignItems="center" position="relative" zIndex={1}>
        <DashboardTitle variant="h4">
          Dashboard
        </DashboardTitle>
        <Box>
          <Tooltip title="Notifications">
            <IconButton
              size="small"
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                mr: 1.5,
                '&:hover': { 
                  backgroundColor: 'rgba(79, 195, 247, 0.1)',
                  color: '#4fc3f7',
                }
              }}
            >
              <Badge 
                badgeContent={2} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    boxShadow: '0 0 5px rgba(244, 67, 54, 0.5)',
                  }
                }}
              >
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
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { 
                  backgroundColor: 'rgba(79, 195, 247, 0.1)',
                  color: '#4fc3f7', 
                },
                '&::after': {
                  content: isRefreshing ? '""' : 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: '#4fc3f7',
                  animation: 'spin 1s linear infinite',
                }
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
            mt: 1,
            height: '2px',
            backgroundColor: 'rgba(79, 195, 247, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#4fc3f7',
              backgroundImage: 'linear-gradient(90deg, rgba(79, 195, 247, 0.5), #4fc3f7, rgba(79, 195, 247, 0.5))',
              boxShadow: '0 0 8px rgba(79, 195, 247, 0.5)',
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
                      fontWeight: 500,
                      textShadow: isConnected 
                        ? '0 0 10px rgba(76, 175, 80, 0.5)' 
                        : '0 0 10px rgba(244, 67, 54, 0.5)',
                      fontFamily: '"Rajdhani", "Roboto", sans-serif',
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
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#4caf50',
                    textShadow: '0 0 5px rgba(76, 175, 80, 0.5)',
                    fontWeight: 500,
                    letterSpacing: '0.5px'
                  }}
                >
                  RTK Fixed
                </Typography>
              </StatsCard>
            </Box>

            {/* System Health Panel */}
            <Box sx={{ flex: { xs: '100%', md: '48%' } }}>
              <ExpandablePanel title="SYSTEM HEALTH">
                <Box sx={{ p: 1 }}>
                  {isSystemHealthLoading && (
                    <Box display="flex" justifyContent="center" my={2}>
                      <CircularProgress 
                        size={24} 
                        sx={{ 
                          color: '#4fc3f7',
                          '& .MuiCircularProgress-circle': {
                            strokeWidth: 5,
                            strokeLinecap: 'round',
                          } 
                        }} 
                      />
                    </Box>
                  )}
                  
                  {systemHealthError && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mb: 2, 
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        border: '1px solid rgba(244, 67, 54, 0.3)',
                        color: '#f44336',
                        '& .MuiAlert-icon': {
                          color: '#f44336'
                        }
                      }}
                    >
                      {systemHealthError}
                    </Alert>
                  )}

                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <SpeedIcon fontSize="small" sx={{ mr: 1, color: '#4fc3f7', opacity: 0.8 }} />
                        <Typography variant="body2" fontWeight={500}>CPU Usage</Typography>
                      </Box>
                      <Typography variant="body2" fontFamily="'Roboto Mono', monospace">{systemHealth.cpu.toFixed(1)}%</Typography>
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
                                          systemHealth.cpu > 60 ? '#ff9800' : '#4caf50',
                          boxShadow: systemHealth.cpu > 80 ? '0 0 8px rgba(244, 67, 54, 0.5)' : 
                                    systemHealth.cpu > 60 ? '0 0 8px rgba(255, 152, 0, 0.5)' : '0 0 8px rgba(76, 175, 80, 0.5)',
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <MemoryIcon fontSize="small" sx={{ mr: 1, color: '#4fc3f7', opacity: 0.8 }} />
                        <Typography variant="body2" fontWeight={500}>Memory Usage</Typography>
                      </Box>
                      <Typography variant="body2" fontFamily="'Roboto Mono', monospace">{systemHealth.memory.toFixed(1)}%</Typography>
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
                                          systemHealth.memory > 60 ? '#ff9800' : '#4caf50',
                          boxShadow: systemHealth.memory > 80 ? '0 0 8px rgba(244, 67, 54, 0.5)' : 
                                    systemHealth.memory > 60 ? '0 0 8px rgba(255, 152, 0, 0.5)' : '0 0 8px rgba(76, 175, 80, 0.5)',
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <StorageIcon fontSize="small" sx={{ mr: 1, color: '#4fc3f7', opacity: 0.8 }} />
                        <Typography variant="body2" fontWeight={500}>Storage Usage</Typography>
                      </Box>
                      <Typography variant="body2" fontFamily="'Roboto Mono', monospace">{systemHealth.storage.toFixed(1)}%</Typography>
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
                                          systemHealth.storage > 60 ? '#ff9800' : '#4caf50',
                          boxShadow: systemHealth.storage > 80 ? '0 0 8px rgba(244, 67, 54, 0.5)' : 
                                    systemHealth.storage > 60 ? '0 0 8px rgba(255, 152, 0, 0.5)' : '0 0 8px rgba(76, 175, 80, 0.5)',
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <DataUsageIcon fontSize="small" sx={{ mr: 1, color: '#4fc3f7', opacity: 0.8 }} />
                        <Typography variant="body2" fontWeight={500}>Network Bandwidth</Typography>
                      </Box>
                      <Typography variant="body2" fontFamily="'Roboto Mono', monospace">{systemHealth.network.toFixed(1)}%</Typography>
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
                          backgroundColor: systemHealth.network > 80 ? '#f44336' : 
                                          systemHealth.network > 60 ? '#ff9800' : '#4caf50',
                          boxShadow: systemHealth.network > 80 ? '0 0 8px rgba(244, 67, 54, 0.5)' : 
                                    systemHealth.network > 60 ? '0 0 8px rgba(255, 152, 0, 0.5)' : '0 0 8px rgba(76, 175, 80, 0.5)',
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
            <Box sx={{ flex: { xs: '100%', md: '48%' } }}>
              <ExpandablePanel title="RECENT MISSIONS">
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

            <Box sx={{ width: '100%' }}>
              <Alert 
                severity="success"
                icon={<CheckCircleOutlineIcon />}
                sx={{
                  backgroundColor: 'rgba(76, 175, 80, 0.08)',
                  color: '#4caf50',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  borderRadius: '4px',
                  position: 'relative',
                  overflow: 'hidden',
                  '& .MuiAlert-icon': {
                    color: '#4caf50'
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: 'linear-gradient(90deg, rgba(76, 175, 80, 0), rgba(76, 175, 80, 0.5), rgba(76, 175, 80, 0))',
                  }
                }}
              >
                <AlertTitle sx={{ fontWeight: 600 }}>All Systems Operational</AlertTitle>
                Current environment: <Box component="span" sx={{ fontWeight: 600 }}>Production</Box> — System status checks passing on all nodes
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