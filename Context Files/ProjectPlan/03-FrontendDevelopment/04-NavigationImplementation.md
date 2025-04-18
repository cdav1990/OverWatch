# Navigation System Implementation Guide

This document provides a detailed implementation plan for the Navigation system of OverWatch Mission Control.

## Navigation Requirements

- Implement a consistent navigation system across the application
- Create a hierarchical menu structure with main and sub-sections
- Support deep linking to specific pages
- Provide breadcrumb navigation for nested pages
- Implement tab navigation for related content
- Support keyboard shortcuts for common navigation actions
- Ensure responsive behavior for different screen sizes

## Implementation Steps

### 1. Router Configuration

#### 1.1 Install and Configure React Router

Install React Router and set up the basic configuration:

```bash
npm install react-router-dom
```

Create the router configuration file:

```typescript
// src/router/index.tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { MissionPlanning } from '../pages/MissionPlanning';
import { GeoView } from '../pages/GeoView';
import { LocalView } from '../pages/LocalView';
import { Settings } from '../pages/Settings';
import { NotFound } from '../pages/NotFound';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../hooks/useAuth';

// Define route paths as constants to avoid string duplication
export const ROUTES = {
  DASHBOARD: '/',
  MISSION_PLANNING: '/missions',
  GEO_VIEW: '/geo',
  LOCAL_VIEW: '/local',
  SETTINGS: '/settings',
  LOGIN: '/login',
};

const router = createBrowserRouter([
  {
    path: ROUTES.DASHBOARD,
    element: <AppShell><Dashboard /></AppShell>,
  },
  {
    path: ROUTES.MISSION_PLANNING,
    element: <AppShell><MissionPlanning /></AppShell>,
  },
  {
    path: `${ROUTES.MISSION_PLANNING}/:missionId`,
    element: <AppShell><MissionPlanning /></AppShell>,
  },
  {
    path: ROUTES.GEO_VIEW,
    element: <AppShell><GeoView /></AppShell>,
  },
  {
    path: ROUTES.LOCAL_VIEW,
    element: <AppShell><LocalView /></AppShell>,
  },
  {
    path: ROUTES.SETTINGS,
    element: <AppShell><Settings /></AppShell>,
  },
  {
    path: ROUTES.LOGIN,
    element: <Login />,
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

#### 1.2 Implement Route Guards

Create a route guard component to handle authentication:

```typescript
// src/router/AuthRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from './index';

interface AuthRouteProps {
  children: React.ReactNode;
}

export const AuthRoute: React.FC<AuthRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    // Redirect to login page but remember the page they tried to access
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};
```

Update the router to use the auth route:

```typescript
// src/router/index.tsx
// ...existing imports
import { AuthRoute } from './AuthRoute';

const router = createBrowserRouter([
  {
    path: ROUTES.DASHBOARD,
    element: <AuthRoute><AppShell><Dashboard /></AppShell></AuthRoute>,
  },
  // Apply to other protected routes
  // ...
  {
    path: ROUTES.LOGIN,
    element: <Login />,
  },
  // ...
]);
```

### 2. Sidebar Navigation

#### 2.1 Create Navigation Data Structure

Define the navigation structure in a separate file:

```typescript
// src/navigation/navigationItems.ts
import {
  Dashboard as DashboardIcon,
  Map as MapIcon,
  ViewInAr as ViewInArIcon,
  Settings as SettingsIcon,
  FlightTakeoff as MissionIcon,
} from '@mui/icons-material';
import { ROUTES } from '../router';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  children?: NavigationItem[];
  keyboardShortcut?: string;
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: DashboardIcon,
    keyboardShortcut: 'Alt+D',
  },
  {
    id: 'missions',
    label: 'Missions',
    path: ROUTES.MISSION_PLANNING,
    icon: MissionIcon,
    keyboardShortcut: 'Alt+M',
  },
  {
    id: 'views',
    label: 'Views',
    path: '',
    icon: MapIcon,
    children: [
      {
        id: 'geo-view',
        label: 'Geographic View',
        path: ROUTES.GEO_VIEW,
        icon: MapIcon,
        keyboardShortcut: 'Alt+G',
      },
      {
        id: 'local-view',
        label: 'Local View',
        path: ROUTES.LOCAL_VIEW,
        icon: ViewInArIcon,
        keyboardShortcut: 'Alt+L',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: ROUTES.SETTINGS,
    icon: SettingsIcon,
    keyboardShortcut: 'Alt+S',
  },
];
```

#### 2.2 Implement Sidebar Navigation Component

Create the sidebar navigation component:

```typescript
// src/components/navigation/Sidebar.tsx
import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Menu as MenuIcon,
  ChevronLeft,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigationItems, NavigationItem } from '../../navigation/navigationItems';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  
  // Track which navigation groups are expanded
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const handleNavigation = (path: string) => {
    if (path) {
      navigate(path);
      if (isMobile) {
        onToggle(); // Close sidebar on mobile
      }
    }
  };
  
  // Render a navigation item and its children
  const renderNavItem = (item: NavigationItem, depth = 0) => {
    const isItemActive = isActive(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.id];
    
    // Check if any child is active
    const isChildActive = hasChildren && item.children?.some(
      child => isActive(child.path) || child.children?.some(grandchild => isActive(grandchild.path))
    );
    
    return (
      <React.Fragment key={item.id}>
        <ListItem 
          disablePadding 
          sx={{ 
            display: 'block',
            pl: depth * 2, // Indent based on depth
          }}
        >
          <ListItemButton
            selected={isItemActive || isChildActive}
            onClick={() => hasChildren ? toggleExpand(item.id) : handleNavigation(item.path)}
            sx={{
              minHeight: 48,
              px: 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 2,
                justifyContent: 'center',
                color: (isItemActive || isChildActive) ? 'primary.main' : 'inherit',
              }}
            >
              <item.icon />
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              primaryTypographyProps={{
                noWrap: true,
                fontSize: 14,
              }}
            />
            {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(childItem => renderNavItem(childItem, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };
  
  const drawerWidth = 240;
  
  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={open}
      onClose={onToggle}
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          p: 1,
        }}
      >
        <IconButton onClick={onToggle}>
          <ChevronLeft />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navigationItems.map(item => renderNavItem(item))}
      </List>
    </Drawer>
  );
};
```

### 3. Breadcrumb Navigation

#### 3.1 Create Breadcrumb Component

Implement a breadcrumb component for page hierarchy:

```typescript
// src/components/navigation/Breadcrumbs.tsx
import React from 'react';
import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Box,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { NavigateNext } from '@mui/icons-material';
import { navigationItems, NavigationItem } from '../../navigation/navigationItems';

interface BreadcrumbsProps {
  customItems?: { label: string; path?: string }[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ customItems }) => {
  const location = useLocation();
  
  // Function to find the navigation path that matches the current URL
  const findNavigationPath = (
    items: NavigationItem[],
    path: string,
    currentPath: NavigationItem[] = []
  ): NavigationItem[] => {
    for (const item of items) {
      // Check if this item matches
      if (item.path === path) {
        return [...currentPath, item];
      }
      
      // Check if any child matches
      if (item.children && item.children.length > 0) {
        const result = findNavigationPath(
          item.children,
          path,
          [...currentPath, item]
        );
        if (result.length > 0) {
          return result;
        }
      }
    }
    
    return [];
  };
  
  // Get the breadcrumb items
  const getItems = () => {
    if (customItems) {
      return customItems;
    }
    
    const navPath = findNavigationPath(navigationItems, location.pathname);
    return navPath.map(item => ({
      label: item.label,
      path: item.path,
    }));
  };
  
  const items = getItems();
  
  // Don't render if there's only one item (home)
  if (items.length <= 1) {
    return null;
  }
  
  return (
    <Box sx={{ mb: 2 }}>
      <MuiBreadcrumbs
        separator={<NavigateNext fontSize="small" />}
        aria-label="breadcrumb"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return isLast ? (
            <Typography key={index} color="text.primary" fontWeight={500}>
              {item.label}
            </Typography>
          ) : (
            <Link
              key={index}
              component={RouterLink}
              to={item.path || '#'}
              underline="hover"
              color="inherit"
            >
              {item.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};
```

### 4. Tab Navigation

#### 4.1 Create Reusable Tab Component

Implement a reusable tab navigation component:

```typescript
// src/components/navigation/TabNavigation.tsx
import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Tab,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

export interface TabItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: TabItem[];
  basePath?: string;
  onChange?: (value: string) => void;
  persistKey?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  basePath = '',
  onChange,
  persistKey,
}) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get the active tab based on the current URL or from localStorage
  const getInitialTab = (): string => {
    if (persistKey) {
      const saved = localStorage.getItem(`tab-${persistKey}`);
      if (saved && tabs.some(tab => tab.id === saved)) {
        return saved;
      }
    }
    
    // Find tab by current path
    const currentPath = location.pathname;
    const matchingTab = tabs.find(tab => 
      basePath + tab.path === currentPath ||
      currentPath.startsWith(basePath + tab.path + '/')
    );
    
    return matchingTab?.id || tabs[0]?.id || '';
  };
  
  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  
  // Update tab when URL changes
  useEffect(() => {
    const currentPath = location.pathname;
    const matchingTab = tabs.find(tab => 
      basePath + tab.path === currentPath ||
      currentPath.startsWith(basePath + tab.path + '/')
    );
    
    if (matchingTab) {
      setActiveTab(matchingTab.id);
    }
  }, [location.pathname, tabs, basePath]);
  
  // Save tab preference if persistKey is provided
  useEffect(() => {
    if (persistKey && activeTab) {
      localStorage.setItem(`tab-${persistKey}`, activeTab);
    }
  }, [activeTab, persistKey]);
  
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    
    // Find the selected tab
    const selectedTab = tabs.find(tab => tab.id === newValue);
    if (selectedTab) {
      // Navigate to the tab's path
      navigate(basePath + selectedTab.path);
      
      // Call onChange callback if provided
      if (onChange) {
        onChange(newValue);
      }
    }
  };
  
  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Tabs
        value={activeTab}
        onChange={handleChange}
        variant={isSmall ? 'scrollable' : 'standard'}
        scrollButtons={isSmall ? 'auto' : false}
        allowScrollButtonsMobile
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            label={tab.label}
            value={tab.id}
            icon={tab.icon}
            iconPosition="start"
            disabled={tab.disabled}
          />
        ))}
      </Tabs>
    </Box>
  );
};
```

### 5. Keyboard Shortcuts

#### 5.1 Create Keyboard Shortcut System

Implement a keyboard shortcut system:

```typescript
// src/utils/keyboardShortcuts.ts
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { navigationItems, NavigationItem } from '../navigation/navigationItems';

// Flatten the navigation structure to get all items with shortcuts
const getAllShortcuts = (items: NavigationItem[]): NavigationItem[] => {
  let result: NavigationItem[] = [];
  
  for (const item of items) {
    if (item.keyboardShortcut) {
      result.push(item);
    }
    
    if (item.children && item.children.length > 0) {
      result = [...result, ...getAllShortcuts(item.children)];
    }
  }
  
  return result;
};

// Parse keyboard shortcut string
const parseShortcut = (shortcut: string): { alt: boolean; key: string } => {
  const parts = shortcut.split('+');
  const alt = parts.includes('Alt');
  const key = parts[parts.length - 1].toLowerCase();
  
  return { alt, key };
};

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const shortcutItems = getAllShortcuts(navigationItems);
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for items that match this key combination
      for (const item of shortcutItems) {
        if (item.keyboardShortcut) {
          const { alt, key } = parseShortcut(item.keyboardShortcut);
          
          if (
            alt === event.altKey &&
            key === event.key.toLowerCase()
          ) {
            event.preventDefault();
            if (item.path) {
              navigate(item.path);
            }
            break;
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);
};
```

#### 5.2 Create Keyboard Shortcut Help Modal

Implement a help modal to display available keyboard shortcuts:

```typescript
// src/components/navigation/KeyboardShortcutHelp.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import { Close, Keyboard } from '@mui/icons-material';
import { navigationItems, NavigationItem } from '../../navigation/navigationItems';

// Flatten navigation structure and group by category
const getShortcutGroups = (items: NavigationItem[]) => {
  const result: Record<string, NavigationItem[]> = {};
  
  const processItems = (items: NavigationItem[], category: string) => {
    for (const item of items) {
      if (item.keyboardShortcut) {
        if (!result[category]) {
          result[category] = [];
        }
        result[category].push(item);
      }
      
      if (item.children && item.children.length > 0) {
        processItems(item.children, item.label);
      }
    }
  };
  
  processItems(navigationItems, 'Navigation');
  
  return result;
};

export const KeyboardShortcutHelp: React.FC = () => {
  const [open, setOpen] = useState(false);
  
  const handleOpen = () => {
    setOpen(true);
  };
  
  const handleClose = () => {
    setOpen(false);
  };
  
  const shortcutGroups = getShortcutGroups(navigationItems);
  
  return (
    <>
      <Button 
        startIcon={<Keyboard />}
        onClick={handleOpen}
        size="small"
      >
        Keyboard Shortcuts
      </Button>
      
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="keyboard-shortcuts-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="keyboard-shortcuts-title">
          Keyboard Shortcuts
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {Object.entries(shortcutGroups).map(([category, items], index) => (
            <React.Fragment key={category}>
              {index > 0 && <Divider sx={{ my: 2 }} />}
              <Typography variant="subtitle1" gutterBottom>
                {category}
              </Typography>
              <List dense>
                {items.map((item) => (
                  <ListItem key={item.id}>
                    <ListItemText
                      primary={item.label}
                      secondary={item.keyboardShortcut}
                    />
                  </ListItem>
                ))}
              </List>
            </React.Fragment>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
};
```

### 6. Mobile Navigation

#### 6.1 Create Mobile Navigation Menu

Implement a mobile-friendly navigation menu:

```typescript
// src/components/navigation/MobileNavigation.tsx
import React, { useState } from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import { Menu, Close } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationItems } from '../../navigation/navigationItems';

export const MobileNavigation: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };
  
  // Get the top-level navigation items for the bottom bar
  const mainNavItems = navigationItems.slice(0, 4); // Limit to 4 items
  
  return (
    <>
      {/* Bottom Navigation Bar */}
      <Paper
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000,
          display: { xs: 'block', md: 'none' }
        }}
        elevation={3}
      >
        <BottomNavigation
          showLabels
          value={location.pathname}
          onChange={(event, newValue) => {
            // If the "More" button is clicked, open the drawer
            if (newValue === 'more') {
              setDrawerOpen(true);
            } else {
              navigate(newValue);
            }
          }}
        >
          {mainNavItems.map((item) => (
            <BottomNavigationAction
              key={item.id}
              label={item.label}
              icon={<item.icon />}
              value={item.path}
            />
          ))}
          <BottomNavigationAction
            label="More"
            icon={<Menu />}
            value="more"
          />
        </BottomNavigation>
      </Paper>
      
      {/* Drawer for full navigation */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 280, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Menu</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List>
            {navigationItems.map((item) => (
              <React.Fragment key={item.id}>
                <ListItemButton 
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
                {item.children && (
                  <List disablePadding>
                    {item.children.map((childItem) => (
                      <ListItemButton 
                        key={childItem.id}
                        onClick={() => handleNavigation(childItem.path)}
                        selected={location.pathname === childItem.path}
                        sx={{ pl: 4 }}
                      >
                        <ListItemIcon>
                          <childItem.icon />
                        </ListItemIcon>
                        <ListItemText primary={childItem.label} />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};
```

### 7. Integration with App Shell

#### 7.1 Update AppShell to Include Navigation Components

Update the AppShell component to include all navigation components:

```typescript
// src/components/layout/AppShell.tsx
import React, { useState, useEffect } from 'react';
import { Box, CssBaseline, useMediaQuery, useTheme } from '@mui/material';
import { Header } from './Header';
import { Sidebar } from '../navigation/Sidebar';
import { Footer } from './Footer';
import { MainContent } from './MainContent';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { MobileNavigation } from '../navigation/MobileNavigation';
import { useKeyboardShortcuts } from '../../utils/keyboardShortcuts';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  // Update sidebar state when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <ThemeProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <CssBaseline />
        <Header onMenuClick={toggleSidebar} />
        <Box sx={{ display: 'flex', flex: 1 }}>
          <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />
          <MainContent sidebarOpen={sidebarOpen} isMobile={isMobile}>
            {children}
          </MainContent>
        </Box>
        <Footer />
        {isMobile && <MobileNavigation />}
        {/* Add padding at the bottom on mobile to account for the navigation bar */}
        {isMobile && <Box sx={{ height: 56 }} />}
      </Box>
    </ThemeProvider>
  );
};
```

#### 7.2 Update MainContent to Include Breadcrumbs

Update the MainContent component to include breadcrumbs:

```typescript
// src/components/layout/MainContent.tsx
import React from 'react';
import { Box } from '@mui/material';
import { Breadcrumbs } from '../navigation/Breadcrumbs';

interface MainContentProps {
  children: React.ReactNode;
  sidebarOpen: boolean;
  isMobile: boolean;
}

export const MainContent: React.FC<MainContentProps> = ({ 
  children, 
  sidebarOpen,
  isMobile 
}) => {
  const drawerWidth = 240;
  
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        width: { md: `calc(100% - ${sidebarOpen ? drawerWidth : 0}px)` },
        ml: { md: sidebarOpen ? `${drawerWidth}px` : 0 },
        transition: theme => theme.transitions.create(['margin', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Breadcrumbs />
      {children}
    </Box>
  );
};
```

#### 7.3 Update Header to Include Navigation Controls

Update the Header component to include navigation controls:

```typescript
// src/components/layout/Header.tsx
import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton, 
  useMediaQuery,
  useTheme,
  Button,
} from '@mui/material';
import { Menu as MenuIcon, Notifications, AccountCircle } from '@mui/icons-material';
import { ThemeToggle } from '../theme/ThemeToggle';
import { KeyboardShortcutHelp } from '../navigation/KeyboardShortcutHelp';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../../assets/logo.svg';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth();
  
  return (
    <AppBar 
      position="sticky" 
      color="default" 
      elevation={1}
      sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuClick}
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src={Logo} alt="OverWatch Logo" height={32} />
          <Typography
            variant="h6"
            component="div"
            sx={{ 
              ml: 1, 
              fontWeight: 'bold',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            OverWatch
          </Typography>
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {!isMobile && <KeyboardShortcutHelp />}
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ThemeToggle />
          
          <IconButton color="inherit">
            <Notifications />
          </IconButton>
          
          <Box sx={{ ml: 1 }}>
            <IconButton
              color="inherit"
              aria-label="account"
              edge="end"
            >
              <AccountCircle />
            </IconButton>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
```

## Integration Points

Document these integration points for when completing the system:

1. Authentication integration:
   ```typescript
   // Implementation for the useAuth hook
   import { useState, useEffect, createContext, useContext } from 'react';

   interface User {
     id: string;
     name: string;
     email: string;
     // Add other user properties as needed
   }

   interface AuthContextType {
     user: User | null;
     isAuthenticated: boolean;
     login: (email: string, password: string) => Promise<void>;
     logout: () => void;
     isLoading: boolean;
     error: string | null;
   }

   const AuthContext = createContext<AuthContextType>({
     user: null,
     isAuthenticated: false,
     login: async () => {},
     logout: () => {},
     isLoading: false,
     error: null,
   });

   export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     // Implementation of the authentication provider
     // ...
   };

   export const useAuth = () => useContext(AuthContext);
   ```

2. Integration with page components:
   ```typescript
   // Example of using TabNavigation in a page component
   import React from 'react';
   import { Box, Typography } from '@mui/material';
   import { TabNavigation, TabItem } from '../components/navigation/TabNavigation';
   import { Settings, Security, Notifications } from '@mui/icons-material';

   export const Settings: React.FC = () => {
     const tabs: TabItem[] = [
       { id: 'general', label: 'General', path: '', icon: <Settings fontSize="small" /> },
       { id: 'security', label: 'Security', path: '/security', icon: <Security fontSize="small" /> },
       { id: 'notifications', label: 'Notifications', path: '/notifications', icon: <Notifications fontSize="small" /> },
     ];
     
     return (
       <Box>
         <Typography variant="h4" gutterBottom>Settings</Typography>
         
         <TabNavigation 
           tabs={tabs} 
           basePath="/settings"
           persistKey="settings-tabs"
         />
         
         {/* Tab content will be rendered here based on the current route */}
       </Box>
     );
   };
   ```

## Mock Data Setup

Create mock user data for authentication:

```typescript
// src/mocks/userData.ts
export const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123', // Never store passwords like this in production!
    role: 'admin',
  },
  {
    id: '2',
    name: 'Test User',
    email: 'user@example.com',
    password: 'password123',
    role: 'user',
  },
];
```

## Next Steps

After implementing the Navigation system:

1. Implement the actual page components that will be navigated to
2. Create the authentication system
3. Integrate keyboard shortcuts with specific page actions
4. Implement deep linking capabilities for sharing URLs

## Tracking Table

| Component | Status | Notes |
|-----------|--------|-------|
| Router Configuration | Not Started | |
| Route Guards | Not Started | |
| Navigation Data Structure | Not Started | |
| Sidebar Navigation Component | Not Started | |
| Breadcrumb Component | Not Started | |
| Tab Navigation Component | Not Started | |
| Keyboard Shortcut System | Not Started | |
| Keyboard Shortcut Help Modal | Not Started | |
| Mobile Navigation Menu | Not Started | |
| AppShell Integration | Not Started | |
| MainContent Integration | Not Started | |
| Header Integration | Not Started | | 