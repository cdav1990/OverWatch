import Local3DViewer from './Local3DViewer';

// Re-export main component as default
export default Local3DViewer;

// Re-export MissionScene component
export { default as MissionScene } from './MissionScene';

// Re-export drone-related components
export { default as DroneModel } from './drone/DroneModel';
export { default as CameraFrustum } from './drone/CameraFrustum';

// Re-export marker components
export { default as WaypointMarker } from './markers/WaypointMarker';
export { default as PathLine } from './markers/PathLine';
export { default as GCPMarker } from './markers/GCPMarker';

// Re-export scene object components
export { default as SceneObjectRenderer } from './objects/SceneObjectRenderer';
export { default as BoxObject } from './objects/BoxObject';

// Re-export indicator components
export { default as HighlightFaceIndicator } from './indicators/HighlightFaceIndicator';

// Re-export modal components
export { default as SceneObjectEditModal } from './modals/SceneObjectEditModal';

// Re-export utility functions
export * from './utils/threeHelpers'; 