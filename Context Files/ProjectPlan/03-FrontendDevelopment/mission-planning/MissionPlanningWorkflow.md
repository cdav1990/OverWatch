# Mission Planning Workflow

This document outlines the standard workflow for creating and planning drone missions in Overwatch, with special focus on how geographic point selection works across different views.

## Overview

The mission planning workflow consists of several key steps:

1. **Geographic Area Selection** (GeoPage)
2. **Mission Creation**
3. **Takeoff Location Initialization**
4. **GCP (Ground Control Point) Placement**
5. **Mission Planning** (MissionPage)

## Detailed Workflow

### 1. Geographic Area Selection

In the GeoPage, users can select geographic areas using three methods:

- **Draw Box**: Draw a rectangular region
- **Set Point**: Select a precise point on the map
- **Draw Area**: Create a custom polygon area

#### Using "Set Point" Method

The "Set Point" method is particularly useful for precise mission planning:

1. Navigate to the GeoPage
2. Click the "Set Point" button in the Drawing Tools panel
3. Click any location on the map to select it
4. A dialog will appear showing the coordinates and allowing you to name the mission
5. Click "Create Mission & Plan" to proceed

When a point is selected:
- The geographic coordinates (latitude/longitude) are stored
- These coordinates become the central reference point for the mission
- The point is used to initialize the takeoff location and first GCP

### 2. Mission Creation

When a mission is created from the GeoPage:

1. The selected point or area is used to create a new mission
2. A unique mission ID is generated
3. The geographic coordinates are stored as the mission's `localOrigin`
4. The system converts geographic coordinates to local coordinates for 3D visualization

### 3. Takeoff Location Initialization

The takeoff location is automatically initialized as follows:

1. If a specific point was selected in GeoPage, its coordinates are converted to local coordinates
2. These local coordinates become the takeoff point (`{ x: value, y: value, z: 0 }`)
3. The z-coordinate is set to 0, representing ground level
4. This takeoff point becomes the default drone position in the 3D view

### 4. GCP Placement

Ground Control Points (GCPs) are initialized as follows:

1. The first GCP (GCP-A) is placed at the takeoff point
2. Additional GCPs (GCP-B, GCP-C) are placed at fixed distances from GCP-A:
   - GCP-B: Placed east of GCP-A along the x-axis
   - GCP-C: Placed north of GCP-A along the y-axis
3. The geographic coordinates of GCP-A match the selected point from GeoPage
4. Other GCPs have their local coordinates calculated relative to the takeoff point

### 5. Mission Planning

In the Mission Planning page (after GeoPage):

1. The 3D view loads with the drone positioned at the takeoff location
2. The GCPs are visible in their initialized positions
3. Users can:
   - Adjust the takeoff point if needed
   - Move GCPs by holding Shift + Double-clicking
   - Add waypoints and create flight paths
   - Plan the mission using the initialized reference points

## Coordinate Systems

The system uses two coordinate systems:

- **Geographic Coordinates** (Lat/Lon): Used in GeoPage and for storing global position
- **Local Coordinates** (ENU - East, North, Up): Used in the 3D view for mission planning

The conversion between these systems happens automatically when:
- Creating a mission from GeoPage
- Initializing the takeoff point
- Placing GCPs

## Key Components Involved

The following components play critical roles in this workflow:

- `GeoPage.tsx`: Handles geographic area selection
- `MissionContext.tsx`: Manages mission state and conversion between coordinate systems
- `Main3DScene.tsx`: Renders the 3D view of the mission
- `MissionScene.tsx`: Manages the scene including drone, GCPs, and other elements
- `DroneModel.tsx`: Visualizes the drone at the takeoff location

## Technical Implementation

When a point is selected in GeoPage:

1. The `handleAreaSelect` function captures the selected point
2. When "Create Mission" is clicked, `handleCreateMission` dispatches:
   - `SET_SELECTED_POINT` action with the geographic coordinates
   - `CREATE_MISSION` action with mission metadata

The MissionContext reducer then:
1. Converts the selected geographic point to local coordinates
2. Sets the takeoff point using these coordinates
3. Creates GCPs positioned relative to the takeoff point
4. Initializes the mission with these reference points

In the 3D view:
1. The drone is positioned at the takeoff point
2. GCPs are shown at their calculated positions
3. The camera view is centered on the takeoff location

## Best Practices

For optimal mission planning:

1. Always select a precise point in GeoPage when planning missions that require exact positioning
2. Verify the takeoff location in the 3D view matches your intended starting point
3. Check that GCPs are correctly positioned before proceeding with mission planning
4. Use the drone position controls to fine-tune the takeoff position if needed

## Troubleshooting

If the takeoff point or GCPs don't appear where expected:

1. Check that a point was properly selected in GeoPage before creating the mission
2. Verify the mission has a valid `localOrigin` from the selected point
3. Ensure coordinate conversion is working correctly
4. Try creating a new mission with a clearly visible landmark as the selected point 