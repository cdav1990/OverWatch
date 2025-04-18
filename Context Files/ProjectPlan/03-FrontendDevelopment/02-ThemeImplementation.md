# Theme Implementation Guide

This document outlines the integration with Gecko-UI's theming system for OverWatch Mission Control.

## Theming Requirements

- Respect and leverage the Gecko-UI theming system
- Ensure consistent styling across custom components
- Support dark mode through Gecko-UI's theme provider
- Maintain visual coherence with the rest of the Gecko ecosystem
- Define component extensions that follow the Gecko-UI design language

## Implementation Steps

### 1. Gecko-UI Theme Integration

#### 1.1 Set Up Gecko Theme Provider

Use the Gecko-UI's theme provider as the foundation for application theming:

```typescript
// src/App.tsx
import React from 'react';
import { GeckoThemeProvider, GeckoTheme, ThemeType } from 'gecko-ui';
import { Router } from './router';

const App: React.FC = () => {
  return (
    <GeckoThemeProvider theme={GeckoTheme as ThemeType}>
      <Router />
    </GeckoThemeProvider>
  );
};

export default App;
```

#### 1.2 Access Theme Values in Styled Components

Use the theme values in styled components via the theme prop:

```typescript
// src/components/layout/Container.tsx
import styled from 'styled-components';

export const Container = styled.div`
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.md}px;
  border-radius: ${props => props.theme.borderRadius}px;
`;
```

### 2. Theme Extension (if needed)

#### 2.1 Extend Gecko Theme for App-Specific Tokens

If additional theme tokens are needed specifically for OverWatch, create an extended theme:

```typescript
// src/theme/overwatch-theme.ts
import { GeckoTheme, ThemeType } from 'gecko-ui';

// Extend the Gecko theme type
export interface OverWatchThemeType extends ThemeType {
  missionStatus: {
    active: string;
    paused: string;
    completed: string;
    aborted: string;
  };
  telemetry: {
    battery: {
      high: string;
      medium: string;
      low: string;
      critical: string;
    };
    signal: {
      strong: string;
      moderate: string;
      weak: string;
    };
  };
}

// Create the extended theme
export const OverWatchTheme: OverWatchThemeType = {
  ...GeckoTheme as ThemeType,
  missionStatus: {
    active: GeckoTheme.colors.primary,
    paused: GeckoTheme.colors.warning,
    completed: GeckoTheme.colors.success,
    aborted: GeckoTheme.colors.error,
  },
  telemetry: {
    battery: {
      high: GeckoTheme.colors.success,
      medium: GeckoTheme.colors.warning,
      low: GeckoTheme.colors.warning,
      critical: GeckoTheme.colors.error,
    },
    signal: {
      strong: GeckoTheme.colors.success,
      moderate: GeckoTheme.colors.warning,
      weak: GeckoTheme.colors.error,
    },
  },
};
```

#### 2.2 Update Theme Provider with Extended Theme

```typescript
// src/App.tsx
import React from 'react';
import { GeckoThemeProvider } from 'gecko-ui';
import { OverWatchTheme, OverWatchThemeType } from './theme/overwatch-theme';
import { Router } from './router';

const App: React.FC = () => {
  return (
    <GeckoThemeProvider theme={OverWatchTheme as OverWatchThemeType}>
      <Router />
    </GeckoThemeProvider>
  );
};

export default App;
```

### 3. Styled Component Integration

#### 3.1 Create Theme-Aware Components

Create components that properly use the theme:

```typescript
// src/components/mission/MissionStatusBadge.tsx
import React from 'react';
import styled from 'styled-components';
import { Badge, BadgeProps } from 'gecko-ui';
import { OverWatchThemeType } from '../../theme/overwatch-theme';

type MissionStatus = 'active' | 'paused' | 'completed' | 'aborted';

interface MissionStatusBadgeProps extends Omit<BadgeProps, 'color'> {
  status: MissionStatus;
}

const StyledBadge = styled(Badge)<{ status: MissionStatus }>`
  background-color: ${props => {
    const theme = props.theme as OverWatchThemeType;
    return theme.missionStatus[props.status];
  }};
`;

export const MissionStatusBadge: React.FC<MissionStatusBadgeProps> = ({ 
  status, 
  children, 
  ...props 
}) => {
  const getLabel = () => {
    switch (status) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'aborted': return 'Aborted';
      default: return status;
    }
  };
  
  return (
    <StyledBadge status={status} {...props}>
      {children || getLabel()}
    </StyledBadge>
  );
};
```

#### 3.2 Create Utility Hooks for Theme Access

Create hooks to easily access theme values:

```typescript
// src/hooks/useOverWatchTheme.ts
import { useTheme } from 'styled-components';
import { OverWatchThemeType } from '../theme/overwatch-theme';

export const useOverWatchTheme = () => {
  return useTheme() as OverWatchThemeType;
};
```

### 4. Color Utilities

#### 4.1 Create Mission Status Color Utility

Create utilities to easily access mission status colors:

```typescript
// src/utils/colorUtils.ts
import { OverWatchThemeType } from '../theme/overwatch-theme';

type MissionStatus = 'active' | 'paused' | 'completed' | 'aborted';

export const getMissionStatusColor = (
  theme: OverWatchThemeType,
  status: MissionStatus
): string => {
  return theme.missionStatus[status];
};

export const getBatteryColor = (
  theme: OverWatchThemeType,
  percentage: number
): string => {
  if (percentage >= 70) return theme.telemetry.battery.high;
  if (percentage >= 30) return theme.telemetry.battery.medium;
  if (percentage >= 15) return theme.telemetry.battery.low;
  return theme.telemetry.battery.critical;
};

export const getSignalColor = (
  theme: OverWatchThemeType,
  strength: number
): string => {
  if (strength >= 70) return theme.telemetry.signal.strong;
  if (strength >= 30) return theme.telemetry.signal.moderate;
  return theme.telemetry.signal.weak;
};
```

### 5. Global Style Extensions

#### 5.1 Create Global Style Enhancements

If needed, create global style extensions for app-specific styling:

```typescript
// src/theme/globalStyles.ts
import { createGlobalStyle } from 'styled-components';
import { OverWatchThemeType } from './overwatch-theme';

export const GlobalStyles = createGlobalStyle<{theme: OverWatchThemeType}>`
  html, body {
    margin: 0;
    padding: 0;
    font-family: ${props => props.theme.fonts.body};
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
  }
  
  * {
    box-sizing: border-box;
  }
  
  /* Add any OverWatch-specific global styles here */
  .telemetry-widget {
    border-radius: ${props => props.theme.borderRadius}px;
    border: 1px solid ${props => props.theme.colors.border};
  }
`;
```

Add the global styles to the App:

```typescript
// src/App.tsx
import React from 'react';
import { GeckoThemeProvider } from 'gecko-ui';
import { OverWatchTheme, OverWatchThemeType } from './theme/overwatch-theme';
import { GlobalStyles } from './theme/globalStyles';
import { Router } from './router';

const App: React.FC = () => {
  return (
    <GeckoThemeProvider theme={OverWatchTheme as OverWatchThemeType}>
      <GlobalStyles />
      <Router />
    </GeckoThemeProvider>
  );
};

export default App;
```

## Usage Examples

### Using Theme in Components

```tsx
import React from 'react';
import styled from 'styled-components';
import { Typography, Card } from 'gecko-ui';
import { useOverWatchTheme } from '../hooks/useOverWatchTheme';
import { getBatteryColor } from '../utils/colorUtils';

// Styled component using theme
const StatusContainer = styled.div`
  padding: ${props => props.theme.spacing.sm}px;
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius}px;
`;

interface BatteryStatusProps {
  percentage: number;
}

export const BatteryStatus: React.FC<BatteryStatusProps> = ({ percentage }) => {
  const theme = useOverWatchTheme();
  const batteryColor = getBatteryColor(theme, percentage);
  
  return (
    <Card>
      <StatusContainer>
        <Typography>Battery Status</Typography>
        <div 
          style={{ 
            height: 8, 
            width: `${percentage}%`, 
            backgroundColor: batteryColor,
            borderRadius: 4,
          }}
        />
        <Typography>{percentage}%</Typography>
      </StatusContainer>
    </Card>
  );
};
```

## Theme Enhancement Process

When extending the theme for new UI components, follow this process:

1. Check if Gecko-UI's theme already has appropriate tokens:
   ```typescript
   // Use existing tokens when possible
   const Component = styled.div`
     color: ${props => props.theme.colors.primary};
     padding: ${props => props.theme.spacing.md}px;
   `;
   ```

2. If specialized tokens are needed:
   - Add them to the OverWatchThemeType interface
   - Add corresponding values to the OverWatchTheme object
   - Consider whether these should be contributed back to Gecko-UI

3. Create utility functions for complex color logic:
   ```typescript
   // Create utilities for recurring patterns
   export const getStatusColor = (status: string, theme: OverWatchThemeType) => {
     // Logic to determine color based on status and theme
   };
   ```

## Tracking Table

| Component | Status | Notes |
|-----------|--------|-------|
| Gecko Theme Integration | Not Started | |
| Extended Theme Definition | Not Started | Only if needed |
| Theme-Aware Components | Not Started | |
| Color Utilities | Not Started | |
| Global Style Extensions | Not Started | | 