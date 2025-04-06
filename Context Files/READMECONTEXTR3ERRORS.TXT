## R3F "Circle" Error Debugging Context (Local3DViewer.tsx)

**Intended Outcome:**

*   Display the detailed drone model in the `Local3DViewer`.
*   Attach the camera frustum visualization (including Near Focus Plane, Far Focus/Image Footprint Plane, and informational text labels) to the drone model.
*   Ensure the frustum visualization updates live based on hardware settings (camera, lens, f-stop, focus distance) selected via `HardwareForm` and `DronePositionControlPanel`, using the shared `MissionContext`.

**What We Have Done:**

1.  **Initial Setup & Errors:**
    *   Copied the detailed `CameraFrustum3D` logic from `DroneSceneViewerWrapper.tsx` into the `CameraFrustum` component within `Local3DViewer.tsx`.
    *   Fixed initial errors like "return outside function" and "hardware is not defined".
    *   Resolved several TypeScript/linter errors related to component props and refs (e.g., `OrbitControls`).
2.  **State Flow Confirmed:**
    *   Confirmed via console logs that `MissionContext` state (`state.hardware`) is updated correctly with full details (including `cameraDetails`, `lensDetails`) both on initial default load (dev mode) and after selecting hardware via `HardwareForm`.
3.  **Visibility Confirmed:**
    *   Ensured the `DroneModel` component renders even when only default hardware is set (added fallback position).
    *   Confirmed via console logs that `DroneModel` *is* rendering and receiving the correct `hardware` props from the context.
4.  **Render Loop Fixed:**
    *   Identified and fixed an infinite render loop in `DroneModel` caused by `setState` within `useFrame` for propeller animation (animation temporarily disabled).
5.  **Error Isolation:**
    *   Determined the "R3F: Circle is not part of the THREE namespace!" error occurs specifically when the "Near Focus Plane" block (containing `<Plane>`, `<Line>`, and `<Text>`) within the `CameraFrustum` component is rendered.
    *   The error disappears when this block is commented out, leaving only the main frustum volume (`<mesh>`) and wireframe (`<Line>`) rendering, which work correctly and update live.

**Suspected Issue:**

*   The "R3F: Circle is not part of the THREE namespace!" error originates from one or more components within the "Near Focus Plane" block (approx. lines 418-438 in `Local3DViewer.tsx`):
    *   The `<Plane>` component used for the near focus plane itself.
    *   The `<Line>` component used for the near focus plane outline.
    *   The `<Text>` component used for the "Near Focus: ...ft" label.
*   The exact component causing the issue is currently unknown. It might be due to specific props, internal geometry handling within `@react-three/drei`, or interactions between these components.

**Debugging Plan:**

1.  **Restore Working State:** Ensure `Local3DViewer.tsx` is in the state where the "Near Focus Plane" block (lines ~418-438) is fully commented out. Verify the app loads showing the drone and the basic blue frustum wireframe without errors.
2.  **Isolate Component (Manual Steps Required):**
    *   **Step 2a:** Manually uncomment *only* the `<Plane>` component (and its `<meshStandardMaterial>`) within the block (lines ~420-428). Restart & test for the "Circle" error.
    *   **Step 2b:** If 2a works, re-comment the `<Plane>`. Manually uncomment *only* the `<Line>` component used for the near focus outline (lines ~429-431). Restart & test.
    *   **Step 2c:** If 2b works, re-comment the `<Line>`. Manually uncomment *only* the `<Text>` component used for the near focus label (lines ~433-438). Restart & test.
3.  **Identify Culprit:** The component (`<Plane>`, `<Line>`, or `<Text>`) that causes the "Circle" error to reappear when uncommented is the source.
4.  **Fix Culprit:** Once the specific component is identified, investigate its props, how it's used, and search for known issues or alternative implementations in `@react-three/drei` documentation or community forums.
