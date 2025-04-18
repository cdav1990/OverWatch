# Takeoff-Centric Coordinate System Guide

## Overview

This document explains how OverWatch uses drone takeoff locations as the origin (0,0,0) for our coordinate system during field operations. This approach creates an intuitive reference framework that improves spatial awareness, simplifies communication, and enhances operational efficiency.

## Why Use Takeoff Points as Origin?

### Operational Benefits

1. **Intuitive Field Navigation**
   - Directions become relative to a known physical point (e.g., "20 meters east of takeoff point")
   - Eliminates confusion with abstract coordinate values
   - Reduces cognitive load during complex operations

2. **Survey Integration**
   - Takeoff points can be precisely surveyed and marked in the field
   - Creates a direct link between physical markers and digital coordinates
   - Enables accurate georeferencing of all collected data

3. **Consistent Reference Framework**
   - Everyone refers to the same physical point (the takeoff location)
   - Simplifies cross-team communication
   - Provides consistency across multiple missions in the same area

4. **Improved Situational Awareness**
   - Operators can visualize positions directly related to their physical location
   - Easier to correlate digital map/model with real-world observations
   - Reduces errors in spatial reasoning

## Field Setup Procedure

### 1. Establishing Takeoff Points

1. **Site Survey**
   - Survey the operational area to identify optimal takeoff location(s)
   - Consider line of sight, obstacles, access, and safety factors
   - Select 1-2 primary takeoff points that provide good coverage of the area

2. **Physical Marking**
   - Mark takeoff points with high-visibility ground markers
   - Use survey equipment to precisely measure the latitude, longitude, and altitude
   - Document these coordinates with survey-grade accuracy (RTK GPS when available)

3. **Digital Registration**
   - Enter the surveyed coordinates into OverWatch
   - The application will automatically designate this as the (0,0,0) origin point
   - All other coordinates will be calculated relative to this origin

### 2. Multi-Point Operations

For larger areas requiring multiple takeoff points:

1. **Primary Reference Point**
   - Designate one takeoff point as the primary reference (Origin A)
   - All coordinates primarily reference this point

2. **Secondary Points**
   - Additional takeoff points should be precisely measured relative to Origin A
   - Document the exact offset from the primary origin
   - OverWatch can translate between these reference frames

3. **Handoff Procedure**
   - When transitioning operations between takeoff points, use the "Change Reference Point" function
   - The system will recalculate all coordinates relative to the new reference
   - Visual scene remains consistent while coordinate display updates

## Using the Takeoff-Centric System

### In Pre-Mission Planning

1. **Creating New Missions**
   - Define the takeoff point first before adding other elements
   - The system will establish this as the (0,0,0) origin
   - All waypoints, areas of interest, and models will use this reference

2. **Importing Existing Data**
   - When importing CAD models, GIS data, or other spatial information:
   - Use the "Align to Takeoff" function to reposition imported data
   - Maintain the option to toggle between absolute and takeoff-relative coordinates

3. **Mission Simulation**
   - During simulations, the drone will start at (0,0,0)
   - All flight paths and measurements use the takeoff-relative system
   - This directly corresponds to how the actual mission will be executed

### During Field Operations

1. **Pre-Flight Setup**
   - Position the drone precisely at the surveyed takeoff marker
   - Use RTK GPS when available to ensure accurate positioning
   - Run the "Calibrate Origin" procedure in OverWatch

2. **Operational Communication**
   - Reference all positions relative to takeoff point
   - Example: "Target structure is 45 meters North, 20 meters East of takeoff"
   - Height references should specify "above takeoff elevation"

3. **Data Collection**
   - All sensor data (photos, LiDAR, etc.) will be automatically georeferenced
   - Uses the takeoff point as the primary reference
   - Maintains both relative and absolute coordinate information

4. **Position Troubleshooting**
   - If position drift occurs, return to the physical takeoff marker
   - Use the "Recalibrate Origin" function to reset the reference frame
   - All existing data points maintain their relative positions

## Implementation for Developers

### Setting Up the Takeoff-Centric System

1. **Initialize Coordinate System**

```typescript
// When creating a new mission:
function initializeTakeoffCentricSystem(takeoffGlobalCoordinates) {
  // Store the global coordinates of the takeoff point
  mission.takeoffGlobalPosition = takeoffGlobalCoordinates;
  
  // Set as origin for local coordinate system
  mission.localOrigin = takeoffGlobalCoordinates;
  
  // Initialize the takeoff point at (0,0,0) in local coordinates
  mission.takeoffPoint = { x: 0, y: 0, z: 0 };
}
```

2. **Transform Existing Objects**

```typescript
// Repositioning existing objects relative to takeoff point
function repositionSceneObjects(takeoffPoint) {
  const objects = getAllSceneObjects();
  
  objects.forEach(object => {
    // Calculate new position relative to takeoff
    const newPosition = {
      x: object.position.x - takeoffPoint.x,
      y: object.position.y - takeoffPoint.y,
      z: object.position.z - takeoffPoint.z
    };
    
    // Update the object position
    updateObjectPosition(object.id, newPosition);
  });
}
```

3. **Adding New Objects**

```typescript
// When adding new objects (like models of structures)
function addNewObjectRelativeToTakeoff(objectData, positionRelativeToTakeoff) {
  // Position is already relative to takeoff (which is 0,0,0)
  // No transformation needed
  return createSceneObject({
    ...objectData,
    position: positionRelativeToTakeoff
  });
}
```

4. **Coordinate Display and Conversion**

```typescript
// Converting between relative and absolute coordinates for display
function displayCoordinates(localPosition, coordinateDisplayMode) {
  if (coordinateDisplayMode === 'RELATIVE_TO_TAKEOFF') {
    // Already relative, display as is
    return `X: ${localPosition.x}m, Y: ${localPosition.y}m, Z: ${localPosition.z}m`;
  } else {
    // Convert to global coordinates
    const globalPosition = localToGlobal(localPosition, mission.localOrigin);
    return `Lat: ${globalPosition.latitude}°, Lon: ${globalPosition.longitude}°, Alt: ${globalPosition.altitude}m`;
  }
}
```

## Common Use Cases

### 1. Ship/Dock Inspection Operations

When inspecting ships or dock facilities:
- Place takeoff point at a well-defined location (e.g., entrance to dock area)
- All ship positions and inspection waypoints reference this fixed point
- Operators can easily correlate digital positions with physical observations
- Multiple missions over time maintain consistent reference points

### 2. Construction Site Monitoring

For long-term monitoring of construction sites:
- Establish permanent survey markers for takeoff points
- Document precise GPS coordinates of these markers
- Each monitoring mission uses the same reference points
- Time-series data automatically aligns for accurate progress tracking

### 3. Emergency Response

During emergency operations:
- Quickly establish a visible takeoff point at incident command
- All team members instantly understand the reference system
- Coordinate response activities relative to this known point
- Simplifies cross-agency coordination when using common reference

## Best Practices

1. **Documentation**
   - Maintain detailed records of all takeoff points used
   - Include photographs, survey data, and field notes
   - Document any adjustments made during operations

2. **Verification Procedures**
   - Before each mission, verify the physical takeoff marker is undisturbed
   - Compare RTK GPS readings with stored coordinates
   - If discrepancies exist, update the reference data accordingly

3. **Redundancy**
   - Mark at least one backup takeoff point for each operation
   - Establish procedure for transitioning to backup point if needed
   - Practice these transitions during training exercises

4. **Training**
   - Train all personnel in takeoff-centric referencing
   - Include exercises translating between different coordinate systems
   - Ensure everyone understands both relative and absolute positioning

## Appendix: Glossary

- **Takeoff Point**: The physical location where the drone takes off, serving as the (0,0,0) origin for the local coordinate system.
- **Origin**: The (0,0,0) point in a coordinate system, in this case aligned with the takeoff position.
- **Relative Coordinates**: Positions described as distances (in meters) from the takeoff point.
- **Absolute Coordinates**: Global positions in latitude, longitude, and altitude.
- **RTK GPS**: Real-Time Kinematic GPS, providing centimeter-level positioning accuracy.
- **Reference Frame**: The coordinate system framework established using the takeoff point as origin. 