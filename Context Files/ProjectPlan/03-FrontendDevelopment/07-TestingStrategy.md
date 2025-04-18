# Frontend Testing Strategy

## Overview

OverWatch Mission Control requires a comprehensive testing strategy to ensure reliability, performance, and maintainability. This document outlines the multi-layered testing approach for the frontend, covering everything from individual units to complete user workflows.

## Testing Pyramid

The testing strategy follows a testing pyramid approach, with more tests at lower levels:

```
┌───────────┐
│   E2E     │  Few, slow, but comprehensive
├───────────┤
│Integration│  Verify component interactions
├───────────┤
│ Component │  Test UI components in isolation
├───────────┤
│   Unit    │  Many fast-running tests
└───────────┘
```

## Tools and Technologies

| Test Type | Primary Tools | Supporting Tools |
|-----------|--------------|------------------|
| Unit | Jest, Testing Library | ts-jest, jest-mock-extended |
| Component | Storybook, React Testing Library | Chromatic, Storybook Test Runner |
| Integration | Jest, React Testing Library | Mock Service Worker (MSW) |
| Performance | Lighthouse, React Profiler | Chrome DevTools, WebPageTest |
| End-to-End | Cypress | Percy (visual regression) |

## Unit Testing

Unit tests verify individual functions, hooks, and small components in isolation.

### Scope

- Utility functions
- Custom React hooks
- State transformations (reducers, state updates)
- Helper classes
- Isolated small components

### Implementation Approach

**1. Testing Utility Functions:**

```typescript
// geometry.ts
export function calculateDistance(point1: Point, point2: Point): number {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + 
    Math.pow(point2.y - point1.y, 2) + 
    Math.pow(point2.z - point1.z, 2)
  );
}

// geometry.test.ts
import { calculateDistance } from './geometry';

describe('calculateDistance', () => {
  it('calculates distance between two 3D points correctly', () => {
    const point1 = { x: 0, y: 0, z: 0 };
    const point2 = { x: 3, y: 4, z: 0 };
    
    expect(calculateDistance(point1, point2)).toBe(5);
  });
  
  it('handles negative coordinates', () => {
    const point1 = { x: -1, y: -1, z: -1 };
    const point2 = { x: 1, y: 1, z: 1 };
    
    expect(calculateDistance(point1, point2)).toBeCloseTo(3.464, 3);
  });
});
```

**2. Testing Custom Hooks:**

```typescript
// useCoordinateTransform.ts
export function useCoordinateTransform(origin) {
  const toLocal = useCallback((globalCoord) => {
    // Transform from global to local
    return transformedCoord;
  }, [origin]);
  
  const toGlobal = useCallback((localCoord) => {
    // Transform from local to global
    return transformedCoord;
  }, [origin]);
  
  return { toLocal, toGlobal };
}

// useCoordinateTransform.test.ts
import { renderHook } from '@testing-library/react-hooks';
import { useCoordinateTransform } from './useCoordinateTransform';

describe('useCoordinateTransform', () => {
  const origin = { latitude: 37.7749, longitude: -122.4194 };
  
  it('transforms coordinates from global to local', () => {
    const { result } = renderHook(() => useCoordinateTransform(origin));
    
    const globalCoord = { latitude: 37.7750, longitude: -122.4195 };
    const localCoord = result.current.toLocal(globalCoord);
    
    // Check that localCoord is correct
    expect(localCoord.x).toBeCloseTo(-8.6, 1);
    expect(localCoord.y).toBeCloseTo(11.1, 1);
    expect(localCoord.z).toBeCloseTo(0, 1);
  });
  
  it('transforms coordinates from local to global', () => {
    const { result } = renderHook(() => useCoordinateTransform(origin));
    
    const localCoord = { x: 10, y: 10, z: 0 };
    const globalCoord = result.current.toGlobal(localCoord);
    
    // Check that globalCoord is correct
    expect(globalCoord.latitude).toBeCloseTo(37.77578, 5);
    expect(globalCoord.longitude).toBeCloseTo(-122.41851, 5);
  });
});
```

**3. Testing Reducers:**

```typescript
// missionReducer.ts
export function missionReducer(state, action) {
  switch (action.type) {
    case 'ADD_WAYPOINT':
      return {
        ...state,
        waypoints: [...state.waypoints, action.payload]
      };
    // ... other cases
  }
}

// missionReducer.test.ts
import { missionReducer } from './missionReducer';

describe('missionReducer', () => {
  it('adds a waypoint to state', () => {
    const initialState = {
      waypoints: [{ id: 1, position: { x: 0, y: 0, z: 0 } }]
    };
    
    const newWaypoint = { id: 2, position: { x: 10, y: 10, z: 10 } };
    
    const newState = missionReducer(initialState, {
      type: 'ADD_WAYPOINT',
      payload: newWaypoint
    });
    
    expect(newState.waypoints).toHaveLength(2);
    expect(newState.waypoints[1]).toEqual(newWaypoint);
  });
});
```

### Best Practices for Unit Testing

1. **Test behavior, not implementation details**
2. **Use Test-Driven Development (TDD) when appropriate**
3. **Keep tests focused on a single functionality**
4. **Use descriptive test names following a "it should..." pattern**
5. **Arrange-Act-Assert pattern for test structure**
6. **Mock external dependencies appropriately**
7. **Aim for high coverage (>85%) of utility functions and state logic**
8. **Run tests in watch mode during development**

## Component Testing

Component tests verify that UI components render correctly and respond appropriately to user interaction.

### Scope

- Shared UI components (buttons, cards, modals)
- Complex form components
- Visualization components
- Panels and control interfaces

### Implementation Approach

**1. Testing with React Testing Library:**

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with provided text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });
  
  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText('Click Me'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('applies variant styling correctly', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByText('Primary Button');
    
    expect(button).toHaveClass('btn-primary');
  });
  
  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    
    expect(screen.getByText('Disabled Button')).toBeDisabled();
  });
});
```

**2. Testing with Storybook:**

```typescript
// Button.stories.tsx
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger'] },
    disabled: { control: 'boolean' },
    onClick: { action: 'clicked' }
  }
};

const Template = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  variant: 'primary',
  children: 'Primary Button'
};

export const Secondary = Template.bind({});
Secondary.args = {
  variant: 'secondary',
  children: 'Secondary Button'
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
  children: 'Disabled Button'
};
```

**3. Testing with Storybook Test Runner:**

```typescript
// Button.stories.test.ts
import { composeStories } from '@storybook/testing-react';
import { render, screen } from '@testing-library/react';
import * as stories from './Button.stories';

const { Primary, Disabled } = composeStories(stories);

describe('Button stories', () => {
  it('renders primary button', () => {
    render(<Primary />);
    expect(screen.getByText('Primary Button')).toHaveClass('btn-primary');
  });
  
  it('renders disabled button', () => {
    render(<Disabled />);
    expect(screen.getByText('Disabled Button')).toBeDisabled();
  });
});
```

### Visual Regression Testing with Storybook and Chromatic

Visual regression testing ensures component appearance remains consistent across changes:

1. Configure Chromatic integration with Storybook
2. Run baseline capture
3. Compare future changes against the baseline
4. Approve or reject visual changes

### Best Practices for Component Testing

1. **Test the component as users would use it**
2. **Focus on accessibility concerns**
3. **Test edge cases like loading states and error conditions**
4. **Check component responsiveness**
5. **Verify component interactions (clicks, inputs, etc.)**
6. **Use mocks for external dependencies and state**
7. **Document component usage with Storybook**
8. **Run visual regression tests for UI changes**

## Integration Testing

Integration tests verify that multiple components work together correctly and that frontend code integrates properly with backend services.

### Scope

- Page components
- Feature flows
- Backend API interactions
- WebSocket communication
- State management

### Implementation Approach

**1. Testing Page Components:**

```typescript
// MissionPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import { MissionProvider } from '../contexts/MissionContext';
import { MissionPage } from './MissionPage';

// Mock the API
jest.mock('../services/api', () => ({
  fetchMission: jest.fn().mockResolvedValue({
    id: '123',
    name: 'Test Mission',
    waypoints: []
  })
}));

describe('MissionPage', () => {
  it('loads and displays mission data', async () => {
    render(
      <MemoryRouter initialEntries={['/missions/123']}>
        <MissionProvider>
          <Route path="/missions/:id">
            <MissionPage />
          </Route>
        </MissionProvider>
      </MemoryRouter>
    );
    
    // Check loading state first
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Mission')).toBeInTheDocument();
    });
  });
});
```

**2. Testing API Integration with MSW:**

```typescript
// setupTests.js - MSW setup
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const server = setupServer(
  rest.get('/api/missions/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        name: 'Test Mission',
        waypoints: []
      })
    );
  }),
  
  rest.post('/api/missions', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: '123',
        ...req.body
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// missionService.test.ts
import { fetchMission, createMission } from './missionService';

describe('Mission Service', () => {
  it('fetches mission by id', async () => {
    const mission = await fetchMission('123');
    
    expect(mission).toEqual({
      id: '123',
      name: 'Test Mission',
      waypoints: []
    });
  });
  
  it('creates a new mission', async () => {
    const newMission = {
      name: 'New Mission',
      description: 'Test description'
    };
    
    const result = await createMission(newMission);
    
    expect(result).toEqual({
      id: '123',
      name: 'New Mission',
      description: 'Test description'
    });
  });
});
```

**3. Testing WebSocket Communication:**

```typescript
// rosConnectionService.test.ts
import { useROSConnection } from './rosConnectionService';
import { renderHook, act } from '@testing-library/react-hooks';

// Mock ROSLIB
jest.mock('roslib', () => {
  const EventEmitter = require('events');
  
  class MockRos extends EventEmitter {
    constructor() {
      super();
      this.url = 'ws://localhost:9090';
    }
    
    connect() {
      this.emit('connection');
    }
    
    close() {}
  }
  
  class MockTopic {
    constructor(options) {
      this.name = options.name;
      this.messageType = options.messageType;
      this.ros = options.ros;
      this.callbacks = [];
    }
    
    subscribe(callback) {
      this.callbacks.push(callback);
    }
    
    unsubscribe() {
      this.callbacks = [];
    }
    
    publish(message) {
      // Mock publish
    }
    
    // Helper method for tests to trigger messages
    simulateMessage(message) {
      this.callbacks.forEach(callback => callback(message));
    }
  }
  
  return {
    Ros: MockRos,
    Topic: MockTopic
  };
});

describe('useROSConnection', () => {
  it('establishes connection and subscribes to topics', () => {
    const { result } = renderHook(() => 
      useROSConnection('ws://localhost:9090')
    );
    
    expect(result.current.connectionStatus).toBe('connected');
    
    // Subscribe to a topic
    const mockCallback = jest.fn();
    const unsubscribe = result.current.subscribeTopic(
      '/test/topic',
      'std_msgs/String',
      mockCallback
    );
    
    // Simulate receiving a message
    act(() => {
      // Access the mock topic and simulate a message
      // This implementation depends on how your hooks are structured
    });
    
    expect(mockCallback).toHaveBeenCalled();
  });
});
```

### Best Practices for Integration Testing

1. **Mock external services for predictable behavior**
2. **Test realistic user flows**
3. **Verify data is correctly displayed from API responses**
4. **Test error handling and recovery**
5. **Verify form submissions update the application state**
6. **Test navigation flows and page transitions**
7. **Validate API request/response cycles**
8. **Focus on critical business flows**

## Performance Testing

Performance tests verify that the application meets performance requirements and remains responsive under various conditions.

### Scope

- Initial load time
- Interactive responsiveness
- Babylon.js rendering performance
- Memory usage
- WebSocket message handling
- Worker thread efficiency

### Implementation Approach

**1. Performance Monitoring Component:**

```typescript
// PerformanceMonitor.tsx
import { useEffect, useState } from 'react';

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    nodes: 0
  });
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animFrameId;
    
    const measure = () => {
      frameCount++;
      const now = performance.now();
      
      // Update every second
      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        
        // Get memory usage if available
        const memory = window.performance?.memory?.usedJSHeapSize / (1024 * 1024) || 0;
        
        // Count scene nodes if Babylon.js is available
        const nodes = window.threeJSScene?.children.length || 0;
        
        setMetrics({ fps, memory, nodes });
        
        frameCount = 0;
        lastTime = now;
      }
      
      animFrameId = requestAnimationFrame(measure);
    };
    
    measure();
    
    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, []);
  
  // Only show in development/testing
  if (process.env.NODE_ENV === 'production') return null;
  
  return (
    <div className="performance-monitor">
      <div>FPS: {metrics.fps}</div>
      <div>Memory: {metrics.memory.toFixed(1)} MB</div>
      <div>Scene nodes: {metrics.nodes}</div>
    </div>
  );
};
```

**2. Lighthouse Performance Testing:**

Implement automated Lighthouse audits in CI pipeline to track metrics:

```javascript
// lighthouse.js - for CI pipeline
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

(async () => {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port,
    onlyCategories: ['performance'],
  };
  
  const result = await lighthouse('http://localhost:5000', options);
  
  // Save the report
  const reportPath = './lighthouse-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(result.lhr, null, 2));
  
  // Check performance score against threshold
  const performanceScore = result.lhr.categories.performance.score * 100;
  console.log(`Performance score: ${performanceScore}`);
  
  if (performanceScore < 80) {
    console.error('Performance score is below threshold of 80');
    process.exit(1);
  }
  
  await chrome.kill();
})();
```

**3. Babylon.js Performance Optimization Tests:**

```typescript
// threeJsPerformance.test.ts
import { renderHook } from '@testing-library/react-hooks';
import { useThreeJSScene } from './useThreeJSScene';

describe('Babylon.js Scene Performance', () => {
  it('maintains sufficient performance with 1000 objects', async () => {
    // Create mock renderer
    const mockRenderer = {
      render: jest.fn(),
      info: {
        render: {
          calls: 0,
          triangles: 0,
          points: 0
        }
      }
    };
    
    // Render hook with performance test configuration
    const { result, waitForNextUpdate } = renderHook(() => 
      useThreeJSScene({
        objectCount: 1000,
        renderer: mockRenderer,
        runPerformanceTest: true
      })
    );
    
    // Wait for scene to initialize and run test
    await waitForNextUpdate();
    
    // Check results from the hook
    expect(result.current.performanceMetrics.fps).toBeGreaterThan(30);
    expect(result.current.performanceMetrics.renderTime).toBeLessThan(16); // 60fps = ~16ms/frame
  });
});
```

**4. User Interaction Performance Tests:**

```typescript
// userInteraction.perf.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import { Main3DScene } from './Main3DScene';

describe('User Interaction Performance', () => {
  it('responds to user interaction within acceptable time', async () => {
    render(<Main3DScene />);
    
    const canvas = screen.getByTestId('3d-scene-canvas');
    
    // Measure operation time
    const startTime = performance.now();
    
    // Trigger interaction - e.g., rotate camera
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    for (let i = 0; i < 10; i++) {
      fireEvent.mouseMove(canvas, { clientX: 100 + i*10, clientY: 100 });
    }
    fireEvent.mouseUp(canvas);
    
    const endTime = performance.now();
    const operationTime = endTime - startTime;
    
    // Operation should complete within 100ms for good responsiveness
    expect(operationTime).toBeLessThan(100);
  });
});
```

### Web Worker Performance Testing

For Web Worker testing, validate that computation is properly offloaded:

```typescript
// workerPerformance.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useWorkerComputation } from './useWorkerComputation';

describe('Worker Performance', () => {
  it('processes large data sets efficiently', async () => {
    // Create large test data
    const largeData = Array(10000).fill(0).map((_, i) => ({ id: i, value: Math.random() }));
    
    // Render hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useWorkerComputation(largeData)
    );
    
    // Initial state should be loading
    expect(result.current.status).toBe('loading');
    
    // Wait for worker to complete
    await waitForNextUpdate();
    
    // Check processing time and results
    expect(result.current.status).toBe('complete');
    expect(result.current.processingTimeMs).toBeLessThan(500); // Should process in under 500ms
    expect(result.current.results.length).toBe(10000);
  });
});
```

### Best Practices for Performance Testing

1. **Establish measurable performance targets (FPS, load time, etc.)**
2. **Monitor trends over time, not just absolute values**
3. **Test with realistic data volumes**
4. **Create specific test cases for performance-critical features**
5. **Automate performance testing in CI pipeline**
6. **Test on different devices and browsers**
7. **Optimize based on performance profiling results**
8. **Focus on user-perceived performance metrics**

## End-to-End Testing

End-to-end tests verify complete user workflows across the entire application.

### Scope

- Mission creation flow
- Path planning workflow
- ROS connection and data flow
- Hardware control interactions
- User authentication
- Navigation between major sections

### Implementation Approach

**1. Basic Cypress Test:**

```javascript
// cypress/integration/mission_creation.spec.js
describe('Mission Creation Flow', () => {
  beforeEach(() => {
    // Mock authentication
    cy.login('testuser', 'password');
    
    // Visit the GeoPage
    cy.visit('/geo');
    
    // Mock any API responses needed
    cy.intercept('GET', '/api/missions', { fixture: 'missions.json' });
  });
  
  it('creates a new mission using point selection', () => {
    // Click the point selection tool
    cy.contains('Set Point').click();
    
    // Select a point on the map
    cy.get('.cesium-container').click(500, 300);
    
    // Verify the dialog appears
    cy.get('.mission-dialog').should('be.visible');
    
    // Enter mission name
    cy.get('input[name="missionName"]').type('E2E Test Mission');
    
    // Create the mission
    cy.contains('Create Mission & Plan').click();
    
    // Verify we're redirected to the mission page
    cy.url().should('include', '/mission/');
    
    // Verify the mission is loaded
    cy.contains('E2E Test Mission').should('be.visible');
    
    // Verify the 3D scene is loaded
    cy.get('canvas').should('be.visible');
    
    // Verify takeoff point is created
    cy.contains('Takeoff Point').should('be.visible');
  });
});
```

**2. Testing with Visual Comparison using Percy:**

```javascript
// cypress/integration/visualization.spec.js
describe('3D Visualization', () => {
  beforeEach(() => {
    // Mock authentication and load test mission
    cy.login('testuser', 'password');
    cy.loadTestMission('test-mission-id');
    cy.visit('/mission/test-mission-id');
    
    // Wait for 3D scene to fully load
    cy.get('.loading-indicator').should('not.exist');
  });
  
  it('displays mission elements correctly', () => {
    // Take snapshot for visual comparison
    cy.percySnapshot('3D Mission View');
    
    // Interact with the scene
    cy.get('.camera-controls').contains('Top View').click();
    cy.wait(1000); // Allow for animation
    
    // Take another snapshot
    cy.percySnapshot('3D Mission - Top View');
    
    // Add a waypoint
    cy.get('.action-toolbar').contains('Add Waypoint').click();
    cy.get('canvas').click(400, 300);
    
    // Verify waypoint is added
    cy.contains('Waypoint 1').should('be.visible');
    
    // Take snapshot with waypoint
    cy.percySnapshot('3D Mission - With Waypoint');
  });
});
```

**3. Testing ROS Integration:**

```javascript
// cypress/integration/ros_integration.spec.js
describe('ROS Integration', () => {
  beforeEach(() => {
    // Mock authentication and load test mission
    cy.login('testuser', 'password');
    cy.visit('/mission/test-mission-id');
    
    // Mock ROS connection
    cy.window().then((win) => {
      win.mockROSConnection = {
        isConnected: true,
        publishMessage: cy.stub().as('publishMessage'),
        subscribeTopic: cy.stub().returns(() => {}).as('subscribeTopic')
      };
    });
  });
  
  it('sends drone position commands via ROS', () => {
    // Open drone position control
    cy.contains('Drone Controls').click();
    
    // Change position values
    cy.get('input[name="x"]').clear().type('10');
    cy.get('input[name="y"]').clear().type('20');
    cy.get('input[name="z"]').clear().type('30');
    
    // Apply changes
    cy.contains('Apply Position').click();
    
    // Verify message was published
    cy.get('@publishMessage').should('have.been.calledWith', 
      '/mavros/setpoint_raw/local',
      'mavros_msgs/PositionTarget',
      Cypress.sinon.match({
        position: Cypress.sinon.match({
          x: Cypress.sinon.match.number,
          y: Cypress.sinon.match.number,
          z: Cypress.sinon.match.number,
        })
      })
    );
  });
});
```

### Best Practices for E2E Testing

1. **Focus on critical user flows**
2. **Mock external services and APIs**
3. **Test realistic scenarios**
4. **Create custom commands for common operations**
5. **Use data attributes for test selection instead of CSS classes**
6. **Run tests against a staging environment**
7. **Include visual regression tests for key screens**
8. **Keep E2E tests focused and independent**

## CI/CD Integration

The testing strategy is integrated into the CI/CD pipeline:

```
┌─────────────────────┐
│ Code Commit/PR      │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Linting & TypeScript│
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Unit Tests          │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Component Tests     │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Integration Tests   │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Performance Tests   │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Build Application   │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Deploy to Staging   │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ E2E Tests           │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Deploy to Production│
└─────────────────────┘
```

### Github Actions Example

```yaml
# .github/workflows/frontend-test.yml
name: Frontend Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: TypeScript check
        run: npm run type-check
      
      - name: Unit tests
        run: npm run test:unit
      
      - name: Component tests
        run: npm run test:components
      
      - name: Integration tests
        run: npm run test:integration
      
      - name: Performance tests
        run: npm run test:perf
      
      - name: Build
        run: npm run build
      
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: npm run deploy:staging
      
      - name: E2E tests
        if: github.ref == 'refs/heads/develop'
        run: npm run test:e2e
      
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: npm run deploy:production
```

## Test Coverage and Reporting

Test coverage is tracked to ensure code quality:

1. **Coverage Targets**:
   - Unit tests: >90% function coverage
   - Component tests: >85% branch coverage
   - Integration tests: Key workflows covered
   - E2E tests: Critical user journeys covered

2. **Reporting Strategy**:
   - Generate coverage reports with each test run
   - Track coverage trends over time
   - Review coverage reports in PRs
   - Display coverage badges in repository README

3. **Integration with Code Review**:
   - Automatically comment coverage changes on PRs
   - Block PR merges if coverage decreases significantly
   - Provide test results summary in PR comments

## Conclusion

A comprehensive testing strategy is essential for the OverWatch Mission Control system to ensure reliability, functionality, and performance. By implementing the multi-layered approach outlined in this document, we will establish confidence in the codebase while enabling rapid, safe iterations during development. 