declare module 'resium' {
  import { ReactNode, ComponentType } from 'react';
  import { CesiumViewer as CesiumViewerType, Entity as CesiumEntity, Viewer as CesiumViewerInstance, ScreenSpaceEventHandler, ScreenSpaceEventType, Cartesian3, Rectangle, CameraEventType } from 'cesium';

  export interface ViewerProps {
    full?: boolean;
    children?: ReactNode;
    className?: string;
    id?: string;
    style?: React.CSSProperties;
    timeline?: boolean;
    animation?: boolean;
    baseLayerPicker?: boolean;
    fullscreenButton?: boolean;
    vrButton?: boolean;
    geocoder?: boolean;
    homeButton?: boolean;
    infoBox?: boolean;
    sceneModePicker?: boolean;
    selectionIndicator?: boolean;
    navigationHelpButton?: boolean;
    navigationInstructionsInitiallyVisible?: boolean;
    scene3DOnly?: boolean;
    shouldAnimate?: boolean;
    terrainProvider?: any;
    imageryProvider?: any;
    onMoveEnd?: (viewer: CesiumViewerInstance) => void;
    onMoveStart?: (viewer: CesiumViewerInstance) => void;
    onClick?: (movement: any, target: Entity | undefined) => void;
    onDoubleClick?: (movement: any, target: Entity | undefined) => void;
    onMouseDown?: (movement: any) => void;
    onMouseUp?: (movement: any) => void;
    onLeftClick?: (movement: any) => void;
    onLeftDoubleClick?: (movement: any) => void;
    onRightClick?: (movement: any) => void;
    onRightDoubleClick?: (movement: any) => void;
    onMiddleClick?: (movement: any) => void;
    onMiddleDoubleClick?: (movement: any) => void;
    onMountEnd?: (viewer: CesiumViewerInstance) => void;
  }

  export interface EntityProps {
    name?: string;
    description?: string;
    position?: any;
    billboard?: any;
    box?: any;
    corridor?: any;
    cylinder?: any;
    ellipse?: any;
    ellipsoid?: any;
    label?: any;
    model?: any;
    path?: any;
    plane?: any;
    point?: any;
    polygon?: any;
    polyline?: any;
    properties?: any;
    rectangle?: any;
    wall?: any;
    onClick?: (entity: CesiumEntity) => void;
    onDoubleClick?: (entity: CesiumEntity) => void;
    onMouseDown?: (entity: CesiumEntity) => void;
    onMouseUp?: (entity: CesiumEntity) => void;
    onLeftClick?: (entity: CesiumEntity) => void;
    onLeftDoubleClick?: (entity: CesiumEntity) => void;
    onRightClick?: (entity: CesiumEntity) => void;
    onRightDoubleClick?: (entity: CesiumEntity) => void;
    onMiddleClick?: (entity: CesiumEntity) => void;
    onMiddleDoubleClick?: (entity: CesiumEntity) => void;
  }

  export interface CameraProps {
    position?: any;
    direction?: any;
    up?: any;
    right?: any;
    frustum?: any;
    defaultMoveAmount?: number;
    defaultLookAmount?: number;
    defaultRotateAmount?: number;
    defaultZoomAmount?: number;
    maximumZoomFactor?: number;
    percentageChanged?: number;
    onChange?: () => void;
    onMoveEnd?: () => void;
    onMoveStart?: () => void;
  }

  export interface ImageryLayerProps {
    alpha?: number;
    brightness?: number;
    contrast?: number;
    hue?: number;
    saturation?: number;
    gamma?: number;
    show?: boolean;
    maximumAnisotropy?: number;
    minimumTerrainLevel?: number;
    maximumTerrainLevel?: number;
    rectangle?: Rectangle;
    imageryProvider: any;
  }

  export const Viewer: ComponentType<ViewerProps>;
  export const Entity: ComponentType<EntityProps>;
  export const Camera: ComponentType<CameraProps>;
  export const ImageryLayer: ComponentType<ImageryLayerProps>;
  export const ScreenSpaceEventHandler: ComponentType<any>;
  export const CameraFlyTo: ComponentType<any>;
  export const ScreenSpaceEvent: ComponentType<any>;
} 