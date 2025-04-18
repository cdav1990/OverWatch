# Dashboard Implementation Guide

This document provides a detailed implementation plan for the Dashboard views of OverWatch Mission Control.

## Dashboard Requirements

- Provide at-a-glance status overview of system components
- Display real-time telemetry data (or mock data during development)
- Allow customization of dashboard layout
- Offer quick access to common actions
- Present mission status and progress
- Visualize system health metrics
- Support both light and dark themes

## Implementation Steps

### 1. Dashboard Layout

#### 1.1 Create Dashboard Container

Create the main dashboard container component to manage the overall layout:

```typescript
// src/pages/Dashboard/Dashboard.tsx
import React from 'react';
import { Box, Grid, Typography, Paper } from '@mui/material';
import { DashboardLayout } from './DashboardLayout';
import { PageHeader } from '../../components/layout/PageHeader';
import { TelemetryPanel } from './panels/TelemetryPanel';
import { MissionStatusPanel } from './panels/MissionStatusPanel';
import { SystemHealthPanel } from './panels/SystemHealthPanel';
import { QuickActionsPanel } from './panels/QuickActionsPanel';
import { RecentMissionsPanel } from './panels/RecentMissionsPanel';
import { AlertsPanel } from './panels/AlertsPanel';

export const Dashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <PageHeader 
        title="Mission Control Dashboard" 
        subtitle="System overview and status"
      />
      
      <DashboardLayout>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TelemetryPanel />
          </Grid>
          <Grid item xs={12} md={4}>
            <MissionStatusPanel />
          </Grid>
          <Grid item xs={12} lg={6}>
            <SystemHealthPanel />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <QuickActionsPanel />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <RecentMissionsPanel />
          </Grid>
          <Grid item xs={12}>
            <AlertsPanel />
          </Grid>
        </Grid>
      </DashboardLayout>
    </Box>
  );
};
```

#### 1.2 Create Dashboard Layout Component

Create a customizable dashboard layout component that could support different layouts and reordering:

```typescript
// src/pages/Dashboard/DashboardLayout.tsx
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  // In the future, this component could handle:
  // - Dashboard layout persistence
  // - Drag and drop reordering
  // - Layout customization settings
  
  return (
    <Box sx={{ mt: 2 }}>
      {children}
    </Box>
  );
};
```

### 2. Dashboard Panels

#### 2.1 Create Base Panel Component

Create a reusable panel component for consistency across dashboard widgets:

```typescript
// src/components/dashboard/DashboardPanel.tsx
import React from 'react';
import { Paper, Box, Typography, IconButton, Divider } from '@mui/material';
import { MoreVert, Fullscreen } from '@mui/icons-material';

interface DashboardPanelProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  expandable?: boolean;
  children: React.ReactNode;
  minHeight?: number | string;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  title,
  subtitle,
  actions,
  expandable = false,
  children,
  minHeight = 200,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <Paper
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {actions}
          {expandable && (
            <IconButton size="small" onClick={toggleExpand}>
              <Fullscreen fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small">
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <Divider />
      <Box
        sx={{
          p: 2,
          flexGrow: 1,
          minHeight,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};
```

#### 2.2 Implement Telemetry Panel

Create a panel to display key telemetry data:

```typescript
// src/pages/Dashboard/panels/TelemetryPanel.tsx
import React from 'react';
import { Grid, Box } from '@mui/material';
import { DashboardPanel } from '../../../components/dashboard/DashboardPanel';
import { BatteryStatus } from '../../../components/telemetry/BatteryStatus';
import { SignalStrength } from '../../../components/telemetry/SignalStrength';
import { AltitudeGauge } from '../../../components/telemetry/AltitudeGauge';
import { SpeedGauge } from '../../../components/telemetry/SpeedGauge';
import { GPSStatus } from '../../../components/telemetry/GPSStatus';
import { useTelemetryData } from '../../../hooks/useTelemetryData';

export const TelemetryPanel: React.FC = () => {
  const { data, isLoading, error } = useTelemetryData();
  
  // Use mock data during development until ROS integration
  const telemetry = data || {
    battery: { percentage: 78, voltage: 11.6, current: 2.4, timeRemaining: 22 },
    signal: { strength: 85, quality: 92 },
    position: { altitude: 120, accuracy: 2.5 },
    speed: { horizontal: 5.2, vertical: 1.1 },
    gps: { satellites: 12, fix: 'RTK Fixed', hdop: 0.8 }
  };
  
  return (
    <DashboardPanel 
      title="Telemetry" 
      subtitle="Real-time system data"
      expandable
    >
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <BatteryStatus 
            percentage={telemetry.battery.percentage}
            voltage={telemetry.battery.voltage}
            timeRemaining={telemetry.battery.timeRemaining}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SignalStrength 
            strength={telemetry.signal.strength}
            quality={telemetry.signal.quality}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <GPSStatus 
            satellites={telemetry.gps.satellites}
            fix={telemetry.gps.fix}
            hdop={telemetry.gps.hdop}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <AltitudeGauge altitude={telemetry.position.altitude} />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <SpeedGauge 
            horizontal={telemetry.speed.horizontal}
            vertical={telemetry.speed.vertical}
          />
        </Grid>
      </Grid>
    </DashboardPanel>
  );
};
```

#### 2.3 Implement Mission Status Panel

Create a panel to display mission progress and status:

```typescript
// src/pages/Dashboard/panels/MissionStatusPanel.tsx
import React from 'react';
import { Box, Typography, LinearProgress, Chip, Stack, Button } from '@mui/material';
import { DashboardPanel } from '../../../components/dashboard/DashboardPanel';
import { PlayArrow, Pause, Stop } from '@mui/icons-material';
import { useMissionStatus } from '../../../hooks/useMissionStatus';

export const MissionStatusPanel: React.FC = () => {
  const { data, isLoading, error } = useMissionStatus();
  
  // Use mock data during development
  const mission = data || {
    name: 'Factory Inspection #42',
    status: 'in_progress', // 'idle', 'in_progress', 'paused', 'completed', 'aborted'
    progress: 38,
    currentWaypoint: 11,
    totalWaypoints: 28,
    timeElapsed: '00:18:45',
    timeRemaining: '00:30:12',
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'primary';
      case 'paused': return 'warning';
      case 'completed': return 'success';
      case 'aborted': return 'error';
      default: return 'default';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'aborted': return 'Aborted';
      default: return 'Idle';
    }
  };
  
  return (
    <DashboardPanel 
      title="Mission Status" 
      subtitle={mission.name}
    >
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Chip 
            label={getStatusLabel(mission.status)} 
            color={getStatusColor(mission.status) as any}
            size="small"
          />
          <Typography variant="body2">
            {mission.progress}% complete
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={mission.progress} 
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>
      
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Current waypoint:
          </Typography>
          <Typography variant="body2">
            {mission.currentWaypoint} / {mission.totalWaypoints}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Time elapsed:
          </Typography>
          <Typography variant="body2">
            {mission.timeElapsed}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Estimated time remaining:
          </Typography>
          <Typography variant="body2">
            {mission.timeRemaining}
          </Typography>
        </Box>
      </Stack>
      
      <Box sx={{ mt: 'auto', pt: 3, display: 'flex', gap: 1 }}>
        {mission.status === 'in_progress' ? (
          <Button variant="outlined" startIcon={<Pause />} fullWidth>
            Pause
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<PlayArrow />}
            fullWidth
            disabled={mission.status === 'completed'}
          >
            {mission.status === 'paused' ? 'Resume' : 'Start'}
          </Button>
        )}
        
        <Button 
          variant="outlined" 
          color="error" 
          startIcon={<Stop />}
          disabled={mission.status === 'idle' || mission.status === 'completed'}
        >
          Abort
        </Button>
      </Box>
    </DashboardPanel>
  );
};
```

#### 2.4 Implement System Health Panel

Create a panel to display system health metrics:

```typescript
// src/pages/Dashboard/panels/SystemHealthPanel.tsx
import React from 'react';
import { Box, Grid, Divider } from '@mui/material';
import { DashboardPanel } from '../../../components/dashboard/DashboardPanel';
import { StatusIndicator } from '../../../components/status/StatusIndicator';
import { useSystemHealth } from '../../../hooks/useSystemHealth';

export const SystemHealthPanel: React.FC = () => {
  const { data, isLoading, error } = useSystemHealth();
  
  // Use mock data during development
  const health = data || {
    components: {
      'ros_bridge': { status: 'online', lastUpdated: Date.now() },
      'camera_control': { status: 'online', lastUpdated: Date.now() },
      'drone_control': { status: 'warning', message: 'High latency', lastUpdated: Date.now() },
      'gps': { status: 'online', lastUpdated: Date.now() },
      'imu': { status: 'online', lastUpdated: Date.now() },
      'lidar': { status: 'offline', message: 'Not connected', lastUpdated: Date.now() },
      'phase_one': { status: 'online', lastUpdated: Date.now() },
      'data_storage': { status: 'online', lastUpdated: Date.now() },
    }
  };
  
  const components = Object.entries(health.components);
  
  return (
    <DashboardPanel 
      title="System Health" 
      subtitle="Component status"
    >
      <Grid container spacing={2}>
        {components.map(([key, value]) => (
          <Grid item xs={12} sm={6} key={key}>
            <StatusIndicator
              status={value.status as any}
              label={key.replace(/_/g, ' ')}
              message={value.message}
            />
          </Grid>
        ))}
      </Grid>
    </DashboardPanel>
  );
};
```

#### 2.5 Implement Quick Actions Panel

Create a panel with buttons for common actions:

```typescript
// src/pages/Dashboard/panels/QuickActionsPanel.tsx
import React from 'react';
import { Box, Button, Stack } from '@mui/material';
import { 
  FlightTakeoff, FlightLand, Add, Cached, Camera, Insights
} from '@mui/icons-material';
import { DashboardPanel } from '../../../components/dashboard/DashboardPanel';

export const QuickActionsPanel: React.FC = () => {
  return (
    <DashboardPanel 
      title="Quick Actions" 
    >
      <Stack spacing={1.5}>
        <Button 
          variant="contained" 
          fullWidth 
          startIcon={<Add />}
          onClick={() => {/* Navigate to mission creation */}}
        >
          New Mission
        </Button>
        
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<FlightTakeoff />}
          color="primary"
        >
          Takeoff
        </Button>
        
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<FlightLand />}
          color="secondary"
        >
          Land
        </Button>
        
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<Cached />}
        >
          Return to Home
        </Button>
        
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<Camera />}
        >
          Capture Image
        </Button>
        
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<Insights />}
        >
          View Telemetry
        </Button>
      </Stack>
    </DashboardPanel>
  );
};
```

#### 2.6 Implement Recent Missions Panel

Create a panel to display recent missions:

```typescript
// src/pages/Dashboard/panels/RecentMissionsPanel.tsx
import React from 'react';
import { 
  Box, List, ListItem, ListItemText, ListItemButton, 
  Typography, Chip, Divider 
} from '@mui/material';
import { DashboardPanel } from '../../../components/dashboard/DashboardPanel';
import { useRecentMissions } from '../../../hooks/useRecentMissions';

export const RecentMissionsPanel: React.FC = () => {
  const { data, isLoading, error } = useRecentMissions();
  
  // Use mock data during development
  const missions = data || [
    { id: 1, name: 'Factory Inspection #42', status: 'in_progress', updatedAt: '2023-07-15T10:30:00Z' },
    { id: 2, name: 'Solar Panel Survey', status: 'completed', updatedAt: '2023-07-14T16:45:00Z' },
    { id: 3, name: 'Building Perimeter Scan', status: 'completed', updatedAt: '2023-07-12T09:15:00Z' },
    { id: 4, name: 'Thermal Inspection', status: 'aborted', updatedAt: '2023-07-10T14:20:00Z' },
  ];
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'primary';
      case 'paused': return 'warning';
      case 'completed': return 'success';
      case 'aborted': return 'error';
      default: return 'default';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <DashboardPanel 
      title="Recent Missions" 
    >
      <List disablePadding>
        {missions.map((mission, index) => (
          <React.Fragment key={mission.id}>
            {index > 0 && <Divider component="li" />}
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemText
                  primary={mission.name}
                  secondary={formatDate(mission.updatedAt)}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: 500,
                  }}
                  secondaryTypographyProps={{
                    variant: 'caption',
                  }}
                />
                <Chip
                  label={mission.status}
                  color={getStatusColor(mission.status) as any}
                  size="small"
                />
              </ListItemButton>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </DashboardPanel>
  );
};
```

#### 2.7 Implement Alerts Panel

Create a panel to display system alerts and notifications:

```typescript
// src/pages/Dashboard/panels/AlertsPanel.tsx
import React from 'react';
import { 
  Box, List, ListItem, ListItemText, ListItemIcon, 
  Typography, Chip, Divider, IconButton
} from '@mui/material';
import { 
  Warning, Error, Info, CheckCircle, Close
} from '@mui/icons-material';
import { DashboardPanel } from '../../../components/dashboard/DashboardPanel';
import { useAlerts } from '../../../hooks/useAlerts';

export const AlertsPanel: React.FC = () => {
  const { data, isLoading, error, dismissAlert } = useAlerts();
  
  // Use mock data during development
  const alerts = data || [
    { id: 1, type: 'warning', message: 'Battery level below 30%', timestamp: '2023-07-15T10:35:00Z' },
    { id: 2, type: 'error', message: 'Lost connection to LiDAR sensor', timestamp: '2023-07-15T10:32:00Z' },
    { id: 3, type: 'info', message: 'Waypoint 11/28 reached', timestamp: '2023-07-15T10:30:00Z' },
    { id: 4, type: 'success', message: 'Connection to ROS Bridge established', timestamp: '2023-07-15T10:25:00Z' },
  ];
  
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      case 'success': return <CheckCircle color="success" />;
      default: return <Info color="info" />;
    }
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };
  
  return (
    <DashboardPanel 
      title="System Alerts" 
      subtitle="Recent notifications and alerts"
    >
      <List>
        {alerts.map((alert, index) => (
          <React.Fragment key={alert.id}>
            {index > 0 && <Divider component="li" />}
            <ListItem
              secondaryAction={
                <IconButton edge="end" onClick={() => dismissAlert(alert.id)}>
                  <Close fontSize="small" />
                </IconButton>
              }
            >
              <ListItemIcon>
                {getAlertIcon(alert.type)}
              </ListItemIcon>
              <ListItemText
                primary={alert.message}
                secondary={formatTime(alert.timestamp)}
                primaryTypographyProps={{
                  variant: 'body2',
                }}
              />
            </ListItem>
          </React.Fragment>
        ))}
        {alerts.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No alerts to display
          </Typography>
        )}
      </List>
    </DashboardPanel>
  );
};
```

### 3. Data Hooks

#### 3.1 Create Telemetry Data Hook

Create a hook to fetch telemetry data (will use mock data during development):

```typescript
// src/hooks/useTelemetryData.ts
import { useState, useEffect } from 'react';
import { TelemetryData } from '../types/telemetry';
import { getMockTelemetryData } from '../mocks/telemetryData';

interface UseTelemetryDataResult {
  data: TelemetryData | null;
  isLoading: boolean;
  error: Error | null;
}

export const useTelemetryData = (): UseTelemetryDataResult => {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // In the future, this will fetch from ROS Bridge
        // For now, we'll use mock data
        setIsLoading(true);
        
        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockData = getMockTelemetryData();
        setData(mockData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // In the future, set up real-time updates
    const interval = setInterval(fetchData, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  return { data, isLoading, error };
};
```

#### 3.2 Create Mission Status Hook

Create a hook to fetch mission status (will use mock data during development):

```typescript
// src/hooks/useMissionStatus.ts
import { useState, useEffect } from 'react';
import { MissionStatus } from '../types/mission';
import { getMockMissionStatus } from '../mocks/missionData';

interface UseMissionStatusResult {
  data: MissionStatus | null;
  isLoading: boolean;
  error: Error | null;
}

export const useMissionStatus = (): UseMissionStatusResult => {
  const [data, setData] = useState<MissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // In the future, this will fetch from the backend
        // For now, we'll use mock data
        setIsLoading(true);
        
        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockData = getMockMissionStatus();
        setData(mockData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // In the future, set up real-time updates
    const interval = setInterval(fetchData, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  return { data, isLoading, error };
};
```

### 4. Telemetry Components

#### 4.1 Implement Battery Status Component

```typescript
// src/components/telemetry/BatteryStatus.tsx
import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { Battery90, Battery20, Battery50, BatteryFull } from '@mui/icons-material';

interface BatteryStatusProps {
  percentage: number;
  voltage?: number;
  timeRemaining?: number;
}

export const BatteryStatus: React.FC<BatteryStatusProps> = ({
  percentage,
  voltage,
  timeRemaining,
}) => {
  const getBatteryIcon = () => {
    if (percentage >= 90) return <BatteryFull />;
    if (percentage >= 50) return <Battery90 />;
    if (percentage >= 20) return <Battery50 />;
    return <Battery20 color="error" />;
  };

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {getBatteryIcon()}
        <Typography variant="subtitle1" sx={{ ml: 1 }}>
          Battery
        </Typography>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={percentage} 
        color={percentage < 20 ? "error" : "primary"}
        sx={{ mb: 1, height: 8, borderRadius: 1 }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2">{percentage}%</Typography>
        {voltage && <Typography variant="body2">{voltage.toFixed(1)}V</Typography>}
      </Box>
      {timeRemaining && (
        <Typography variant="caption" color="text.secondary">
          Est. {timeRemaining} min remaining
        </Typography>
      )}
    </Box>
  );
};
```

#### 4.2 Implement Signal Strength Component

```typescript
// src/components/telemetry/SignalStrength.tsx
import React from 'react';
import { Box, Typography, LinearProgress, Stack } from '@mui/material';
import { SignalCellular4Bar } from '@mui/icons-material';

interface SignalStrengthProps {
  strength: number;
  quality?: number;
}

export const SignalStrength: React.FC<SignalStrengthProps> = ({
  strength,
  quality,
}) => {
  const getSignalColor = (strength: number) => {
    if (strength >= 70) return 'success';
    if (strength >= 30) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <SignalCellular4Bar />
        <Typography variant="subtitle1" sx={{ ml: 1 }}>
          Signal
        </Typography>
      </Box>
      
      <Stack spacing={1.5}>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">Strength</Typography>
            <Typography variant="caption">{strength}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={strength} 
            color={getSignalColor(strength) as any}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Box>
        
        {quality !== undefined && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption">Quality</Typography>
              <Typography variant="caption">{quality}%</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={quality} 
              color={getSignalColor(quality) as any}
              sx={{ height: 6, borderRadius: 1 }}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
};
```

## Integration Points

Document these integration points for when ROS Bridge is implemented:

1. Telemetry data - When connecting to real telemetry data:
   ```typescript
   // In useTelemetryData.ts
   
   import { useRosContext } from '../contexts/RosContext';
   
   export const useTelemetryData = () => {
     const ros = useRosContext();
     
     useEffect(() => {
       if (!ros.isConnected) return;
       
       // Subscribe to battery topic
       const batteryListener = new ROSLIB.Topic({
         ros: ros.instance,
         name: '/drone/battery',
         messageType: 'sensor_msgs/BatteryState'
       });
       
       batteryListener.subscribe((message) => {
         // Update battery state
       });
       
       // Similar subscriptions for other telemetry
       
       return () => {
         batteryListener.unsubscribe();
         // Unsubscribe from other topics
       };
     }, [ros.isConnected, ros.instance]);
     
     // Rest of hook implementation
   };
   ```

2. Mission control commands - When implementing actual mission controls:
   ```typescript
   // In MissionStatusPanel.tsx
   
   import { useRosContext } from '../../../contexts/RosContext';
   
   export const MissionStatusPanel = () => {
     const ros = useRosContext();
     
     const startMission = () => {
       if (!ros.isConnected) return;
       
       const startService = new ROSLIB.Service({
         ros: ros.instance,
         name: '/mission/start',
         serviceType: 'std_srvs/Trigger'
       });
       
       const request = new ROSLIB.ServiceRequest({});
       
       startService.callService(request, (result) => {
         if (result.success) {
           // Handle success
         } else {
           // Handle error
         }
       });
     };
     
     // Similar implementations for pause, resume, abort
     
     // Rest of component implementation
   };
   ```

## Mock Data Setup

Create mock data for dashboard development:

```typescript
// src/mocks/telemetryData.ts
import { TelemetryData } from '../types/telemetry';

export const getMockTelemetryData = (): TelemetryData => ({
  battery: {
    percentage: Math.floor(Math.random() * 30) + 60, // 60-90%
    voltage: 11.1 + (Math.random() * 1.5), // 11.1-12.6V
    current: 2 + (Math.random() * 1.5), // 2-3.5A
    timeRemaining: Math.floor(Math.random() * 10) + 15, // 15-25 min
  },
  signal: {
    strength: Math.floor(Math.random() * 20) + 75, // 75-95%
    quality: Math.floor(Math.random() * 15) + 80, // 80-95%
  },
  position: {
    latitude: 37.7749 + (Math.random() * 0.01 - 0.005),
    longitude: -122.4194 + (Math.random() * 0.01 - 0.005),
    altitude: 100 + (Math.random() * 50), // 100-150m
    accuracy: 1 + (Math.random() * 2), // 1-3m
  },
  speed: {
    horizontal: Math.random() * 8, // 0-8 m/s
    vertical: Math.random() * 2, // 0-2 m/s
  },
  gps: {
    satellites: Math.floor(Math.random() * 6) + 9, // 9-14 satellites
    fix: Math.random() > 0.2 ? 'RTK Fixed' : 'GPS',
    hdop: 0.5 + (Math.random() * 1), // 0.5-1.5
  },
});
```

## Next Steps

After implementing the Dashboard components:

1. Implement type definitions for all data structures
2. Create tests for Dashboard components
3. Implement the Navigation system
4. Develop the mission planning pages

## Tracking Table

| Component | Status | Notes |
|-----------|--------|-------|
| Dashboard Layout | Not Started | |
| Dashboard Panel Component | Not Started | |
| Telemetry Panel | Not Started | |
| Mission Status Panel | Not Started | |
| System Health Panel | Not Started | |
| Quick Actions Panel | Not Started | |
| Recent Missions Panel | Not Started | |
| Alerts Panel | Not Started | |
| Telemetry Data Hook | Not Started | |
| Mission Status Hook | Not Started | |
| Battery Status Component | Not Started | |
| Signal Strength Component | Not Started | |
</rewritten_file> 