# Babylon.js Viewer Implementation Checklist

This checklist outlines the steps to develop the `BabylonViewer` component into a spatially accurate, enterprise-grade visualization tool for OverWatch mission planning and monitoring.

## I. Core Coordinate System & Accuracy Setup (High Priority)

-   [ ] **Implement Coordinate Conversion Utilities:**
    -   [ ] Create or verify functions in `src/utils/coordinateUtils.ts` (or similar).
    -   [ ] `globalToLocalENU(lat, lon, alt, origin)`: Converts WGS84 geographic coordinates to local ENU meters relative to a defined origin (likely the first takeoff point).
    -   [ ] `localENUToBabylon(enuCoords)`: Converts local ENU meters `{x: East, y: North, z: Up}` to Babylon.js scene coordinates `{x: East, y: Up, z: North}`.
    -   [ ] `babylonToLocalENU(babylonCoords)`: Converts Babylon.js scene coordinates back to local ENU meters.
    -   [ ] Ensure high precision suitable for survey accuracy in all calculations.
-   [ ] **Integrate Conversions in `BabylonViewer`:**
    -   [ ] Import the necessary conversion utilities.
    -   [ ] Modify rendering logic (Steps II & III) to *always* convert Local ENU coordinates from `MissionContext` state to Babylon.js coordinates before positioning objects in the scene.
-   [ ] **Verify Scene Orientation:**
    -   [ ] Confirm the `AxesViewer` correctly represents East (+X, Red), Up (+Y, Green), North (+Z, Blue).
    -   [ ] Ensure the initial camera orientation provides a clear view of this coordinate system.

## II. Mission Data Visualization

-   [ ] **Access Full Mission Context:**
    -   [ ] Ensure `BabylonViewer` uses `useMission()` to access `currentMission` details (GCPs, waypoints, paths, drone state, hardware config).
-   [ ] **Render Ground Control Points (GCPs):**
    -   [ ] Fetch `currentMission.gcps` from context.
    -   [ ] For each GCP, convert its `local` ENU coordinates to Babylon.js coordinates.
    -   [ ] Create distinct visual markers (e.g., `MeshBuilder.CreateSphere` or custom meshes/sprites) at the converted positions.
    -   [ ] Add labels (`GUI.TextBlock` or `Mesh` with `TextTexture`) displaying GCP names.
-   [ ] **Render Waypoints:**
    -   [ ] Fetch `currentMission.waypoints` (or waypoints within path segments).
    -   [ ] Convert waypoint Local ENU coordinates to Babylon.js coordinates.
    -   [ ] Create visual markers (e.g., `MeshBuilder.CreateSphere`) for each waypoint.
    -   [ ] Optionally add labels or sequence numbers.
-   [ ] **Render Flight Paths:**
    -   [ ] Fetch `currentMission.pathSegments`.
    -   [ ] For each segment, get its waypoints.
    -   [ ] Convert all waypoint coordinates in the segment to Babylon.js coordinates.
    -   [ ] Draw lines between waypoints using `MeshBuilder.CreateLines` or `MeshBuilder.CreateTube`.
    -   [ ] Consider different visual styles for different path types (straight, curved).

## III. Drone Visualization & Real-time Updates

-   [ ] **Load Correct Drone Model:**
    -   [ ] Update `SceneLoader.ImportMeshAsync` call in `BabylonViewer` to load the appropriate drone model GLTF/GLB file (if different from the current eagle/`scene.gltf`).
    -   [ ] Ensure correct scaling and root node selection.
-   [ ] **Real-time Drone Position/Rotation:**
    -   [ ] Read drone's current position (Local ENU) and rotation (heading, pitch, roll) from `MissionContext` state.
    -   [ ] In a `useEffect` hook that depends on the drone state from context, or using Babylon's `scene.onBeforeRenderObservable`:
        -   Convert the drone's Local ENU position to Babylon.js coordinates.
        -   Convert heading/pitch/roll to a Babylon.js `Quaternion` or update mesh rotation directly (ensure correct axis mapping and rotation order - YXZ is common).
        -   Update the loaded drone mesh's `position` and `rotationQuaternion` (or `rotation`).
-   [ ] **Implement Drone Animation (Optional):**
    -   [ ] Port animation logic (e.g., propeller rotation) from the R3F `DroneModel` to Babylon.js using `AnimationGroup` or manual updates in the render loop/observable.

## IV. Camera & Interaction Enhancements

-   [ ] **Implement CAD-Style Controls:**
    -   [ ] Replace or augment `ArcRotateCamera` default input.
    -   [ ] Add panning controls (e.g., right-mouse drag or middle-mouse drag).
    -   [ ] Implement orbiting around a specific point (set via double-click or 'C' key as in `03-Visualization.md` examples).
    -   [ ] Ensure smooth zoom behavior.
-   [ ] **Camera Frustum Visualization:**
    -   [ ] Get camera/lens details (`hardware` state) from `MissionContext`.
    -   [ ] Create a Babylon.js equivalent of the `CameraFrustum` logic from the R3F version. This involves calculating the frustum geometry based on sensor size, focal length, aspect ratio, and focus distance.
    -   [ ] Attach the frustum mesh to the drone model, oriented correctly based on gimbal pitch.
    -   [ ] Add UI toggle for frustum visibility.
-   [ ] **Object Selection/Interaction (Future):**
    -   [ ] Implement picking logic (`scene.pick`) to identify clicked objects (drone, waypoints, GCPs).
    -   [ ] Trigger appropriate actions (e.g., open edit panel, select for deletion).

## V. Environment Enhancements

-   [ ] **Terrain Visualization (Future):**
    -   [ ] Determine terrain data source (e.g., Cesium integration, heightmaps, DEM files).
    -   [ ] Implement terrain mesh generation (e.g., `MeshBuilder.CreateGroundFromHeightMap` or custom geometry).
    -   [ ] Apply appropriate textures and materials.
-   [ ] **Improve Skybox/IBL:**
    -   [ ] Ensure high-quality skybox textures are used.
    -   [ ] Consider using `.env` or `.hdr` files for more realistic Image Based Lighting via `CubeTexture.CreateFromPrefilteredData`. Adjust `scene.environmentIntensity`.

## VI. Performance & Optimization (As Needed)

-   [ ] **Level of Detail (LOD):** Implement Babylon.js `LODGroup` for complex models (drone, terrain) if performance suffers.
-   [ ] **Instancing:** Use `InstancedMesh` for large numbers of identical objects (e.g., waypoint markers, GCP markers).
-   [ ] **Worker Threads (Advanced):** If main thread becomes blocked by heavy calculations (e.g., complex path generation, physics), consider offloading tasks to Web Workers using Babylon's `scene.offlineProvider` or standard Worker APIs.

## VII. ROS Integration (Core Functionality)

-   [ ] **Establish WebSocket Connection:**
    -   [ ] Implement connection logic (using `roslib` or native WebSockets) to the ROS Bridge.
    -   [ ] Handle connection status, errors, and reconnections.
-   [ ] **Subscribe to Telemetry:**
    -   [ ] Subscribe to relevant ROS topics (drone pose, orientation, status).
    -   [ ] Update `MissionContext` state with incoming data. The `BabylonViewer` should react to these context changes for real-time updates (see Step III).
