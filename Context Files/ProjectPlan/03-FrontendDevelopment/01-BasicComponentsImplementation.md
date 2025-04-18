# Basic Frontend Components Implementation Plan

This document provides a detailed implementation plan for the Basic Frontend Components that don't directly depend on ROS integration, using the company's Gecko-UI library.

## Prerequisites

Before starting this implementation, ensure:
- Development environment is set up with React, TypeScript, and Vite
- Gecko-UI is properly linked as a local dependency
- Basic project structure is in place following frontend architecture
- Zustand is configured for state management

## Implementation Steps

### 1. Application Layout Structure

#### 1.1 Create Layout Components

Create the application shell using Gecko-UI components:

```typescript
// src/components/layout/AppShell.tsx
import React from 'react';
import { GeckoThemeProvider, GeckoTheme, ThemeType } from 'gecko-ui';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { MainContent } from './MainContent';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <GeckoThemeProvider theme={GeckoTheme as ThemeType}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar />
          <MainContent>{children}</MainContent>
        </div>
        <Footer />
      </div>
    </GeckoThemeProvider>
  );
};
```

#### 1.2 Implement Header Component

Create the header component using Gecko-UI:

```typescript
// src/components/layout/Header.tsx
import React from 'react';
import styled from 'styled-components';
import { Flex, IconButton, Typography } from 'gecko-ui';
// Import appropriate icons from Gecko-UI or use system defaults

const HeaderContainer = styled.header`
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.sm}px ${props => props.theme.spacing.md}px;
`;

export const Header: React.FC = () => {
  return (
    <HeaderContainer>
      <Flex justifyContent="space-between" alignItems="center">
        <Flex alignItems="center">
          {/* Use appropriate Gecko icon here */}
          <Typography variant="h5" style={{ marginLeft: '8px', fontWeight: 'bold' }}>
            OverWatch
          </Typography>
        </Flex>
        
        <Flex gap={8}>
          {/* Use appropriate Gecko icons and buttons here */}
          <IconButton icon="settings" aria-label="settings" />
          <IconButton icon="profile" aria-label="profile" />
        </Flex>
      </Flex>
    </HeaderContainer>
  );
};
```

#### 1.3 Implement Sidebar Component

Create the sidebar navigation using Gecko-UI:

```typescript
// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate, useLocation } from 'react-router-dom';
import { Flex, Typography } from 'gecko-ui';

const SidebarContainer = styled.aside`
  width: 240px;
  background-color: ${props => props.theme.colors.background};
  border-right: 1px solid ${props => props.theme.colors.border};
  height: 100%;
  overflow-y: auto;
`;

const NavItem = styled.div<{ active?: boolean }>`
  padding: ${props => props.theme.spacing.sm}px ${props => props.theme.spacing.md}px;
  cursor: pointer;
  background-color: ${props => props.active ? props.theme.colors.primaryLight : 'transparent'};
  
  &:hover {
    background-color: ${props => props.active 
      ? props.theme.colors.primaryLight 
      : props.theme.colors.backgroundHover};
  }
`;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/' },
    { id: 'missions', label: 'Missions', path: '/missions' },
    { id: 'geo', label: 'Geographic View', path: '/geo' },
    { id: 'local', label: 'Local View', path: '/local' },
    { id: 'settings', label: 'Settings', path: '/settings' },
  ];
  
  return (
    <SidebarContainer>
      {navItems.map(item => (
        <NavItem 
          key={item.id} 
          active={location.pathname === item.path}
          onClick={() => navigate(item.path)}
        >
          <Flex alignItems="center">
            {/* Use appropriate Gecko icon based on item.id */}
            <Typography 
              variant="body1" 
              style={{ marginLeft: '8px', fontWeight: location.pathname === item.path ? 'bold' : 'normal' }}
            >
              {item.label}
            </Typography>
          </Flex>
        </NavItem>
      ))}
    </SidebarContainer>
  );
};
```

#### 1.4 Implement Main Content Area

```typescript
// src/components/layout/MainContent.tsx
import React from 'react';
import styled from 'styled-components';

const ContentContainer = styled.main`
  flex: 1;
  padding: ${props => props.theme.spacing.md}px;
  overflow-y: auto;
`;

interface MainContentProps {
  children: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({ children }) => {
  return (
    <ContentContainer>
      {children}
    </ContentContainer>
  );
};
```

### 2. UI Component Library

For this section, we'll focus on using existing Gecko-UI components and only create custom components when necessary.

#### 2.1 Create Button Wrappers (if needed)

If Gecko-UI buttons need additional functionality for our use case:

```typescript
// src/components/buttons/ActionButton.tsx
import React from 'react';
import { Button, ButtonProps } from 'gecko-ui';

interface ActionButtonProps extends ButtonProps {
  loading?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ 
  children, 
  loading = false, 
  disabled,
  ...props 
}) => {
  return (
    <Button
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </Button>
  );
};
```

#### 2.2 Create Form Components (if needed)

Leverage Gecko-UI form components when available:

```typescript
// src/components/forms/FormField.tsx
import React from 'react';
import styled from 'styled-components';
import { Input, Typography, Flex } from 'gecko-ui';

const FieldContainer = styled.div`
  margin-bottom: ${props => props.theme.spacing.md}px;
`;

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  required = false,
  error,
  value,
  onChange,
}) => {
  return (
    <FieldContainer>
      <Flex justifyContent="space-between" alignItems="center" marginBottom="4px">
        <Typography variant="label">
          {label}{required && <span style={{ color: 'red' }}> *</span>}
        </Typography>
      </Flex>
      
      <Input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        error={!!error}
        fullWidth
      />
      
      {error && (
        <Typography variant="caption" color="error" marginTop="4px">
          {error}
        </Typography>
      )}
    </FieldContainer>
  );
};
```

#### 2.3 Create Data Display Components (if needed)

Create data display components that complement Gecko-UI:

```typescript
// src/components/display/DataCard.tsx
import React from 'react';
import styled from 'styled-components';
import { Card, Typography, Flex } from 'gecko-ui';

const CardHeader = styled.div`
  padding: ${props => props.theme.spacing.sm}px ${props => props.theme.spacing.md}px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const CardContent = styled.div`
  padding: ${props => props.theme.spacing.md}px;
`;

interface DataCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  children,
  actions,
}) => {
  return (
    <Card>
      <CardHeader>
        <Flex justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="h6">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </div>
          {actions}
        </Flex>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};
```

#### 2.4 Create Status Indicators

Implement status indicators for the system health display:

```typescript
// src/components/status/StatusIndicator.tsx
import React from 'react';
import styled from 'styled-components';
import { Flex, Typography } from 'gecko-ui';

interface StatusDotProps {
  status: 'online' | 'offline' | 'warning' | 'error';
}

const StatusDot = styled.div<StatusDotProps>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => {
    switch (props.status) {
      case 'online': return props.theme.colors.success;
      case 'warning': return props.theme.colors.warning;
      case 'error': return props.theme.colors.error;
      default: return props.theme.colors.disabled;
    }
  }};
`;

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error';
  label: string;
  message?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  message,
}) => {
  return (
    <Flex alignItems="center">
      <StatusDot status={status} />
      <div style={{ marginLeft: '8px' }}>
        <Typography variant="body2">{label}</Typography>
        {message && (
          <Typography variant="caption" color="textSecondary">
            {message}
          </Typography>
        )}
      </div>
    </Flex>
  );
};
```

### 3. Navigation System

#### 3.1 Router Setup

Configure React Router with route definitions:

```typescript
// src/router/index.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { MissionPlanning } from '../pages/MissionPlanning';
import { GeoView } from '../pages/GeoView';
import { LocalView } from '../pages/LocalView';
import { Settings } from '../pages/Settings';
import { NotFound } from '../pages/NotFound';
import { AppShell } from '../components/layout/AppShell';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell><Dashboard /></AppShell>,
  },
  {
    path: '/missions',
    element: <AppShell><MissionPlanning /></AppShell>,
  },
  {
    path: '/geo',
    element: <AppShell><GeoView /></AppShell>,
  },
  {
    path: '/local',
    element: <AppShell><LocalView /></AppShell>,
  },
  {
    path: '/settings',
    element: <AppShell><Settings /></AppShell>,
  },
  {
    path: '*',
    element: <AppShell><NotFound /></AppShell>,
  },
]);

export const Router = () => {
  return <RouterProvider router={router} />;
};
```

#### 3.2 Create TabNavigation Component (if not in Gecko-UI)

Check if Gecko-UI has a tab component. If not, create a custom one:

```typescript
// src/components/navigation/TabNavigation.tsx
import React from 'react';
import styled from 'styled-components';
import { Tabs, Tab } from 'gecko-ui'; // Assuming Gecko-UI has these components
// If Gecko-UI doesn't have Tab components, implement using styled-components

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabNavigationProps {
  tabs: TabItem[];
  defaultTab?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  defaultTab = tabs[0]?.id,
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  return (
    <div>
      <Tabs value={activeTab} onChange={value => setActiveTab(value as string)}>
        {tabs.map(tab => (
          <Tab key={tab.id} value={tab.id} label={tab.label} />
        ))}
      </Tabs>
      
      <div style={{ marginTop: '16px' }}>
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};
```

### 4. Dashboard Views

#### 4.1 Dashboard Layout

Create the dashboard layout using Gecko-UI components:

```typescript
// src/pages/Dashboard/Dashboard.tsx
import React from 'react';
import { Grid, Typography } from 'gecko-ui';
import { TelemetryPanel } from './panels/TelemetryPanel';
import { MissionStatusPanel } from './panels/MissionStatusPanel';
import { SystemHealthPanel } from './panels/SystemHealthPanel';
import { QuickActionsPanel } from './panels/QuickActionsPanel';
import { RecentMissionsPanel } from './panels/RecentMissionsPanel';
import { AlertsPanel } from './panels/AlertsPanel';

export const Dashboard: React.FC = () => {
  return (
    <div>
      <Typography variant="h4" style={{ marginBottom: '16px' }}>
        Mission Control Dashboard
      </Typography>
      
      <Grid container spacing={16}>
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
    </div>
  );
};
```

#### 4.2 Implement Telemetry Visualization Components

Create telemetry visualization components:

```typescript
// src/components/telemetry/BatteryStatus.tsx
import React from 'react';
import styled from 'styled-components';
import { Flex, Typography, ProgressBar } from 'gecko-ui';

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
  // Determine color based on battery percentage
  const getColor = () => {
    if (percentage < 20) return 'error';
    if (percentage < 50) return 'warning';
    return 'success';
  };

  return (
    <div style={{ padding: '16px', border: '1px solid', borderColor: 'var(--border-color)', borderRadius: '4px' }}>
      <Flex alignItems="center" style={{ marginBottom: '8px' }}>
        {/* Use appropriate Gecko-UI icon here or a custom battery icon */}
        <Typography variant="subtitle1" style={{ marginLeft: '8px' }}>
          Battery
        </Typography>
      </Flex>
      
      <ProgressBar 
        value={percentage} 
        color={getColor()}
        style={{ marginBottom: '8px', height: '8px', borderRadius: '4px' }}
      />
      
      <Flex justifyContent="space-between">
        <Typography variant="body2">{percentage}%</Typography>
        {voltage && <Typography variant="body2">{voltage.toFixed(1)}V</Typography>}
      </Flex>
      
      {timeRemaining && (
        <Typography variant="caption" color="textSecondary" style={{ marginTop: '4px' }}>
          Est. {timeRemaining} min remaining
        </Typography>
      )}
    </div>
  );
};
```

### 5. Data Hooks

#### 5.1 Create Telemetry Data Hook

Create a hook to fetch telemetry data (using mock data during development):

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

## Integration Points

Document these integration points for when ROS Bridge is implemented:

1. Telemetry data - prepare interfaces for:
   ```typescript
   interface TelemetryData {
     battery: {
       percentage: number;
       voltage: number;
       current: number;
       timeRemaining: number;
     };
     signal: {
       strength: number;
       quality: number;
     };
     position: {
       latitude: number;
       longitude: number;
       altitude: number;
       accuracy: number;
     };
     // Additional telemetry properties
   }
   ```

2. For any components not available in Gecko-UI, thoroughly evaluate:
   - If a custom component based on existing primitives can be created
   - If introducing a new dependency is necessary, check for conflicts with existing libraries
   - Consider contributing the new component back to the Gecko-UI library if it has broader utility

## Mock Data Setup

Create mock data providers for frontend development:

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

## Component Discovery Process

When implementing a new UI component, follow this process:

1. First check if the component exists in Gecko-UI:
   ```typescript
   import { ComponentName } from 'gecko-ui';
   ```

2. If the component doesn't exist, check if it can be composed from existing Gecko-UI primitives:
   ```typescript
   import { Flex, Typography, Button } from 'gecko-ui';
   
   const CustomComponent = ({ prop1, prop2 }) => (
     <Flex direction="column">
       <Typography>{prop1}</Typography>
       <Button>{prop2}</Button>
     </Flex>
   );
   ```

3. If a new external library is absolutely necessary:
   - Check compatibility with styled-components
   - Ensure it doesn't conflict with existing dependencies
   - Create a wrapper component to maintain consistent styling
   - Document the decision and rationale

## Next Steps

After implementing these Basic Frontend Components:

1. Proceed to implement coordinate system utilities
2. Develop mission data model and storage
3. Implement Geographic View (GeoPage) with Cesium
4. Set up Babylon.js visualization foundation

## Tracking Table

| Component | Status | Notes |
|-----------|--------|-------|
| Layout Structure | Not Started | Using Gecko-UI |
| Header Component | Not Started | Using Gecko-UI |
| Sidebar Component | Not Started | Using Gecko-UI |
| Main Content Area | Not Started | Using Gecko-UI |
| Button Components | Not Started | Using Gecko-UI buttons |
| Form Components | Not Started | Using Gecko-UI form components |
| Data Display Components | Not Started | Using Gecko-UI + custom components |
| Status Indicators | Not Started | Custom components with Gecko-UI styles |
| Router Setup | Not Started | Using React Router |
| Tab Navigation | Not Started | Check if in Gecko-UI first |
| Dashboard Layout | Not Started | Using Gecko-UI Grid |
| Telemetry Visualization | Not Started | Custom components with Gecko-UI styles |
| Telemetry Data Hook | Not Started | | 