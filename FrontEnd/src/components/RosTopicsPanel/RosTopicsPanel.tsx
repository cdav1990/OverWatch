import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Chip, 
  CircularProgress,
  Button,
  Badge,
  IconButton,
  Tooltip,
  Alert,
  styled,
  Collapse,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Tab,
  Tabs
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import SettingsIcon from '@mui/icons-material/Settings';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { useRosTopics, RosTopic } from '../../hooks/useRosTopics';
import { useMission } from '../../context/MissionContext';
import { useMissionOptimizer } from '../../hooks/useMissionOptimizer';
import Pix4DPresets, { Pix4DConfiguration } from './Pix4DPresets';

// Pre-built drone configurations
interface DroneConfiguration {
  id: string;
  name: string;
  description: string;
  topicPrefix: string;
  hardware: {
    drone: string;
    camera: string;
    lens: string;
    lidar: string;
    controller: string;
  };
  requiredTopics: string[];
}

const DRONE_CONFIGURATIONS: DroneConfiguration[] = [
  {
    id: 'freefly-alta-pix4d',
    name: 'Freefly Alta X (Pix4D)',
    description: 'Freefly Alta X with Phase One IXM-100, 80mm lens, Ouster OS0-128, and Cube Blue controller',
    topicPrefix: '/freefly/alta',
    hardware: {
      drone: 'freefly-alta-x',
      camera: 'phase-one-ixm-100',
      lens: 'phaseone-rsm-80mm',
      lidar: 'ouster-os0-128',
      controller: 'cube-blue'
    },
    requiredTopics: [
      '/mavros/state',
      '/mavros/global_position/global',
      '/mavros/local_position/pose',
      '/mavros/imu/data',
      '/mavros/battery',
      '/camera/image_raw',
      '/ouster/points',
      '/tf'
    ]
  },
  {
    id: 'freefly-astro-pix4d',
    name: 'Freefly Astro (Pix4D)',
    description: 'Freefly Astro with Phase One IXM-100, 80mm lens, Ouster OS0-128, and Cube Blue controller',
    topicPrefix: '/freefly/astro',
    hardware: {
      drone: 'freefly-astro',
      camera: 'phase-one-ixm-100',
      lens: 'phaseone-rsm-80mm',
      lidar: 'ouster-os0-128',
      controller: 'cube-blue'
    },
    requiredTopics: [
      '/mavros/state',
      '/mavros/global_position/global',
      '/mavros/local_position/pose',
      '/mavros/imu/data',
      '/mavros/battery',
      '/camera/image_raw',
      '/ouster/points',
      '/tf'
    ]
  }
];

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

const PanelHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

const PanelTitle = styled(Typography)(({ theme }) => ({
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
  '&.MuiChip-colorWarning': {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    color: '#ff9800',
    border: '1px solid rgba(255, 152, 0, 0.3)',
  },
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(0.75, 1),
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  }
}));

const TopicName = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  fontFamily: '"Roboto Mono", monospace',
  color: 'rgba(255, 255, 255, 0.85)',
}));

const TopicType = styled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: 'rgba(255, 255, 255, 0.5)',
  fontFamily: '"Roboto Mono", monospace',
}));

const MessageData = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: '"Roboto Mono", monospace',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  padding: theme.spacing(1),
  borderRadius: '4px',
  overflowX: 'auto',
  whiteSpace: 'pre',
}));

const TopicListContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  marginTop: theme.spacing(1),
}));

const ActionButton = styled(Button)(({ theme }) => ({
  minWidth: 'auto',
  fontSize: '0.75rem',
  padding: theme.spacing(0.5, 1.5),
  marginRight: theme.spacing(1),
  borderRadius: '3px',
  textTransform: 'none',
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
  '&.MuiButton-outlined': {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    color: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      borderColor: 'rgba(255, 255, 255, 0.5)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
  },
}));

const DevModeNote = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
  backgroundColor: 'rgba(255, 193, 7, 0.1)',
  border: '1px solid rgba(255, 193, 7, 0.3)',
  borderRadius: '4px',
  color: '#ffc107',
  fontSize: '0.75rem',
}));

const ConfigurationSelector = styled(FormControl)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: '100%',
  '& .MuiOutlinedInput-root': {
    color: 'rgba(255, 255, 255, 0.9)',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#4fc3f7',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    '&.Mui-focused': {
      color: '#4fc3f7',
    },
  },
  '& .MuiSvgIcon-root': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
}));

const ConfigPanel = styled(Box)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: '4px',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const MissingTopicChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: 'rgba(244, 67, 54, 0.15)',
  color: '#f44336',
  border: '1px solid rgba(244, 67, 54, 0.3)',
  height: '24px',
  fontSize: '0.75rem',
}));

const PresentTopicChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: 'rgba(76, 175, 80, 0.15)',
  color: '#4caf50',
  border: '1px solid rgba(76, 175, 80, 0.3)',
  height: '24px',
  fontSize: '0.75rem',
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  minHeight: '32px',
  '& .MuiTabs-indicator': {
    backgroundColor: '#4fc3f7',
  },
  '& .MuiTab-root': {
    minHeight: '32px',
    padding: theme.spacing(0.5, 2),
    textTransform: 'none',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.6)',
    '&.Mui-selected': {
      color: '#4fc3f7',
    },
  },
}));

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
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
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

interface TopicItemProps {
  topic: RosTopic;
  isSubscribed: boolean;
  onSubscribe: (name: string) => void;
  onUnsubscribe: (name: string) => void;
}

const TopicItem: React.FC<TopicItemProps> = ({ 
  topic, 
  isSubscribed,
  onSubscribe,
  onUnsubscribe
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Format timestamp if it exists
  const formattedTime = topic.lastUpdated 
    ? topic.lastUpdated.toLocaleTimeString() 
    : 'Never';

  // Format message for display
  const messageDisplay = topic.latestMessage 
    ? JSON.stringify(topic.latestMessage, null, 2)
    : 'No data';

  return (
    <>
      <StyledListItem
        secondaryAction={
          <Box>
            {isSubscribed ? (
              <Tooltip title="Unsubscribe">
                <IconButton 
                  edge="end" 
                  aria-label="unsubscribe"
                  onClick={() => onUnsubscribe(topic.name)}
                  size="small"
                  sx={{ 
                    color: '#4fc3f7', 
                    '&:hover': { backgroundColor: 'rgba(79, 195, 247, 0.1)' } 
                  }}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Subscribe">
                <IconButton 
                  edge="end" 
                  aria-label="subscribe"
                  onClick={() => onSubscribe(topic.name)}
                  size="small"
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)', 
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } 
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              onClick={toggleExpand}
              size="small"
              sx={{ 
                transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
                color: 'rgba(255, 255, 255, 0.6)', 
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <StatusChip 
                label={topic.status} 
                color={
                  topic.status === 'active' ? 'success' : 
                  topic.status === 'error' ? 'error' : 'warning'
                }
                size="small"
                sx={{ mr: 1, height: '18px', fontSize: '0.65rem' }}
              />
              <TopicName>{topic.name}</TopicName>
            </Box>
          }
          secondary={
            <Box>
              <TopicType>{topic.type}</TopicType>
              {topic.lastUpdated && (
                <TopicType>Last update: {formattedTime}</TopicType>
              )}
            </Box>
          }
          disableTypography
        />
      </StyledListItem>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, py: 1, backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
          <MessageData>
            {messageDisplay}
          </MessageData>
        </Box>
      </Collapse>
    </>
  );
};

const RosTopicsPanel: React.FC = () => {
  const { 
    connectedToRos,
    availableTopics,
    subscribedTopics,
    error,
    isLoading,
    isDevelopmentMode,
    subscribeToTopic,
    unsubscribeFromTopic
  } = useRosTopics();

  const { state, dispatch } = useMission();
  const missionOptimizer = useMissionOptimizer();
  
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [configTabValue, setConfigTabValue] = useState(0);

  // Check if a topic is currently subscribed
  const isTopicSubscribed = (topicName: string) => {
    return subscribedTopics.some(t => t.name === topicName);
  };

  // Handle configuration change
  const handleConfigChange = (event: SelectChangeEvent) => {
    const configId = event.target.value;
    setSelectedConfig(configId);
    
    if (configId) {
      setConfigPanelOpen(true);
      
      // Get the selected configuration
      const selectedDroneConfig = DRONE_CONFIGURATIONS.find(config => config.id === configId);
      
      if (selectedDroneConfig && state.hardware) {
        // Apply hardware configuration if in development mode
        if (isDevelopmentMode) {
          dispatch({
            type: 'SET_HARDWARE',
            payload: {
              drone: selectedDroneConfig.hardware.drone,
              camera: selectedDroneConfig.hardware.camera,
              lens: selectedDroneConfig.hardware.lens,
              lidar: selectedDroneConfig.hardware.lidar
            }
          });
        }
      }
    } else {
      setConfigPanelOpen(false);
    }
  };

  // Subscribe to all required topics for the selected configuration
  const subscribeToRequiredTopics = () => {
    const config = DRONE_CONFIGURATIONS.find(config => config.id === selectedConfig);
    if (config) {
      config.requiredTopics.forEach(topicName => {
        if (!isTopicSubscribed(topicName)) {
          subscribeToTopic(topicName);
        }
      });
    }
  };

  // Compare current hardware with selected configuration
  const getConfigurationMatchStatus = () => {
    if (!selectedConfig || !state.hardware) return null;
    
    const config = DRONE_CONFIGURATIONS.find(config => config.id === selectedConfig);
    if (!config) return null;
    
    const hardwareMatches = {
      drone: state.hardware.drone === config.hardware.drone,
      camera: state.hardware.camera === config.hardware.camera,
      lens: state.hardware.lens === config.hardware.lens,
      lidar: state.hardware.lidar === config.hardware.lidar
    };
    
    return hardwareMatches;
  };

  // Get missing topics for the selected configuration
  const getMissingTopics = () => {
    if (!selectedConfig) return [];
    
    const config = DRONE_CONFIGURATIONS.find(config => config.id === selectedConfig);
    if (!config) return [];
    
    const availableTopicNames = availableTopics.map(topic => topic.name);
    return config.requiredTopics.filter(topic => !availableTopicNames.includes(topic));
  };

  // Handle Pix4D configuration applied
  const handlePix4DConfigSelected = (config: Pix4DConfiguration) => {
    // Check if we need to subscribe to essential topics for Pix4D
    const essentialTopics = [
      '/mavros/state',
      '/mavros/global_position/global',
      '/mavros/local_position/pose',
      '/camera/image_raw'
    ];
    
    essentialTopics.forEach(topic => {
      if (!isTopicSubscribed(topic)) {
        subscribeToTopic(topic);
      }
    });

    // Close config panel
    setConfigPanelOpen(false);
  };

  const configStatus = getConfigurationMatchStatus();
  const missingTopics = getMissingTopics();

  if (isLoading) {
    return (
      <PanelContainer sx={{ justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#4fc3f7' }} />
      </PanelContainer>
    );
  }

  return (
    <PanelContainer>
      <PanelHeader>
        <Box>
          <PanelTitle variant="h6">ROS Topics</PanelTitle>
          {isDevelopmentMode && (
            <Typography sx={{ fontSize: '0.75rem', color: '#ffc107', mt: 0.5 }}>
              Development Mode - Connection Simulated
            </Typography>
          )}
        </Box>
        <Box>
          <StatusChip 
            label={connectedToRos ? 'Connected' : 'Disconnected'} 
            color={connectedToRos ? 'success' : 'error'}
            size="small"
            sx={{ mr: 1 }}
          />
          <Tooltip title="Configuration">
            <IconButton 
              size="small" 
              onClick={() => setConfigPanelOpen(!configPanelOpen)}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                mr: 1,
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Topics">
            <IconButton 
              size="small" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </PanelHeader>

      {error && (
        <Alert 
          severity="error"
          sx={{ 
            backgroundColor: 'rgba(244, 67, 54, 0.15)', 
            border: '1px solid rgba(244, 67, 54, 0.3)', 
            color: '#f44336',
            '& .MuiAlert-icon': { color: '#f44336' },
            mb: 2
          }}
        >
          {error}
        </Alert>
      )}

      {!connectedToRos && isDevelopmentMode && (
        <DevModeNote>
          ROS connection disabled in development mode. Using simulated topics.
        </DevModeNote>
      )}

      <Collapse in={configPanelOpen} timeout="auto">
        <ConfigPanel>
          <StyledTabs 
            value={configTabValue} 
            onChange={(_, newValue) => setConfigTabValue(newValue)}
            aria-label="configuration tabs"
          >
            <Tab label="Basic" id="config-tab-0" />
            <Tab label="Pix4D" id="config-tab-1" />
            {missionOptimizer && missionOptimizer.hasPerformanceConcerns && (
              <Tab label="Performance" id="config-tab-2" />
            )}
          </StyledTabs>
          
          <TabPanel value={configTabValue} index={0}>
            <Typography 
              sx={{ 
                fontSize: '0.8rem', 
                fontWeight: 500, 
                color: 'rgba(255, 255, 255, 0.7)',
                mb: 1.5
              }}
            >
              Drone Configuration
            </Typography>
            
            <ConfigurationSelector size="small">
              <InputLabel id="drone-config-label">Select Configuration</InputLabel>
              <Select
                labelId="drone-config-label"
                value={selectedConfig}
                label="Select Configuration"
                onChange={handleConfigChange}
                sx={{ fontSize: '0.85rem' }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {DRONE_CONFIGURATIONS.map((config) => (
                  <MenuItem key={config.id} value={config.id}>
                    {config.name}
                  </MenuItem>
                ))}
              </Select>
            </ConfigurationSelector>
            
            {selectedConfig && (
              <>
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                  {DRONE_CONFIGURATIONS.find(c => c.id === selectedConfig)?.description}
                </Typography>
                
                {configStatus && (
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)', mb: 0.5 }}>
                      Hardware Status:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <StatusChip 
                        label="Drone" 
                        color={configStatus.drone ? 'success' : 'error'}
                        size="small"
                      />
                      <StatusChip 
                        label="Camera" 
                        color={configStatus.camera ? 'success' : 'error'}
                        size="small"
                      />
                      <StatusChip 
                        label="Lens" 
                        color={configStatus.lens ? 'success' : 'error'}
                        size="small"
                      />
                      <StatusChip 
                        label="LiDAR" 
                        color={configStatus.lidar ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Box>
                )}
                
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)', mb: 0.5 }}>
                    Required Topics:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                    {missingTopics.length > 0 ? (
                      missingTopics.map(topic => (
                        <MissingTopicChip key={topic} label={topic} />
                      ))
                    ) : (
                      DRONE_CONFIGURATIONS.find(c => c.id === selectedConfig)?.requiredTopics.map(topic => (
                        <PresentTopicChip key={topic} label={topic} />
                      ))
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ActionButton
                    variant="contained"
                    color="primary"
                    onClick={subscribeToRequiredTopics}
                    startIcon={<FlightTakeoffIcon />}
                    disabled={!connectedToRos && !isDevelopmentMode}
                  >
                    Apply Configuration
                  </ActionButton>
                </Box>
              </>
            )}
          </TabPanel>
          
          <TabPanel value={configTabValue} index={1}>
            <Pix4DPresets onConfigurationSelected={handlePix4DConfigSelected} />
          </TabPanel>
          
          {missionOptimizer && missionOptimizer.hasPerformanceConcerns && (
            <TabPanel value={configTabValue} index={2}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#ff9800', mb: 1 }}>
                Performance Optimization
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)', mb: 0.5 }}>
                  Mission Statistics:
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Total Waypoints:
                    </Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                      {missionOptimizer.totalWaypointCount.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Large Segments:
                    </Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                      {missionOptimizer.largePathSegments.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Approx. Memory:
                    </Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                      {missionOptimizer.performanceStats.memoryEstimate.toFixed(1)} KB
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <ActionButton
                  variant="outlined"
                  onClick={() => {
                    // Get optimized path previews using the missionOptimizer
                    const pathPreviews = missionOptimizer.getPathPreviews();
                    console.log('Generated path previews:', pathPreviews);
                  }}
                >
                  Generate Previews
                </ActionButton>
                <ActionButton
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    // Would simplify paths for better performance
                    if (missionOptimizer.largePathSegments.length > 0) {
                      const segment = missionOptimizer.largePathSegments[0];
                      missionOptimizer.simplifyPath(segment, 0.5, (result) => {
                        console.log('Simplified path segment:', result);
                      });
                    }
                  }}
                >
                  Optimize Paths
                </ActionButton>
              </Box>
            </TabPanel>
          )}
        </ConfigPanel>
      </Collapse>

      <TopicListContainer>
        <Typography 
          sx={{ 
            fontSize: '0.8rem', 
            fontWeight: 500, 
            color: 'rgba(255, 255, 255, 0.7)',
            px: 1,
            py: 0.5 
          }}
        >
          Available Topics
        </Typography>

        <List disablePadding>
          {availableTopics.length > 0 ? (
            availableTopics.map((topic) => (
              <TopicItem 
                key={topic.name}
                topic={topic}
                isSubscribed={isTopicSubscribed(topic.name)}
                onSubscribe={subscribeToTopic}
                onUnsubscribe={unsubscribeFromTopic}
              />
            ))
          ) : (
            <ListItem>
              <ListItemText 
                primary={
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem' }}>
                    No topics available
                  </Typography>
                } 
              />
            </ListItem>
          )}
        </List>

        {subscribedTopics.length > 0 && (
          <>
            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            <Typography 
              sx={{ 
                fontSize: '0.8rem', 
                fontWeight: 500, 
                color: 'rgba(255, 255, 255, 0.7)',
                px: 1,
                py: 0.5 
              }}
            >
              <Badge 
                badgeContent={subscribedTopics.length} 
                color="primary"
                sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: '16px', minWidth: '16px' } }}
              >
                Subscribed Topics
              </Badge>
            </Typography>

            <List disablePadding>
              {subscribedTopics.map((topic) => (
                <TopicItem 
                  key={topic.name}
                  topic={topic}
                  isSubscribed={true}
                  onSubscribe={subscribeToTopic}
                  onUnsubscribe={unsubscribeFromTopic}
                />
              ))}
            </List>
          </>
        )}
      </TopicListContainer>
    </PanelContainer>
  );
};

export default RosTopicsPanel; 