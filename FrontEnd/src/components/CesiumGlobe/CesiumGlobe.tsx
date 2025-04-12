import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Viewer, Entity, ScreenSpaceEventHandler, ScreenSpaceEvent } from 'resium';
import * as Cesium from 'cesium';
import { Box, ToggleButtonGroup, ToggleButton, ButtonGroup, Button, Typography, IconButton, Tooltip, Divider, TextField } from '@mui/material';
import { Satellite, Map as MapIcon, Terrain, AddBox, LocationOn, Edit as EditIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useMission } from '../../context/MissionContext';
import { Region, LatLng } from '../../types/mission';
import { generateUUID, cesiumRectangleToRegionBounds, getRegionCenter, haversineDistance } from '../../utils/coordinateUtils';

// Initialize Cesium ion access token (get your own from https://cesium.com/ion/)
// Use environment variable VITE_CESIUM_TOKEN if available, or default to Cesium's demo token
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk';

interface CesiumGlobeProps {
  height?: string | number;
  onAreaSelect?: (area: Region | LatLng | null) => void;
  initialImageryType?: string;
  onImageryTypeChange?: (type: string) => void;
}

export interface CesiumGlobeHandle {
  flyToDestination: (destination: Cesium.Cartesian3 | Cesium.Rectangle) => void;
  setViewDestination: (destination: Cesium.Cartesian3, orientation?: any) => void;
  getViewer: () => Cesium.Viewer | null;
  startPointSelection: () => void;
  startRegionSelection: () => void;
  startPolygonDrawing: () => void;
}

const CesiumGlobe = forwardRef<CesiumGlobeHandle, CesiumGlobeProps>((
  { 
    height = '100%',
    onAreaSelect,
    initialImageryType = 'aerial',
    onImageryTypeChange 
  },
  ref
) => {
  const { state, dispatch } = useMission();
  const [drawingRegion, setDrawingRegion] = useState(false);
  const [regionStart, setRegionStart] = useState<Cesium.Cartesian3 | null>(null);
  const [regionEnd, setRegionEnd] = useState<Cesium.Cartesian3 | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Cesium.Rectangle | null>(null);
  const [mousePosition, setMousePosition] = useState<LatLng | null>(null);
  const [selectingPoint, setSelectingPoint] = useState(false);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [regionArea, setRegionArea] = useState({ width: 0, height: 0, area: 0 });
  const pointEntityRef = useRef<Cesium.Entity | null>(null);
  const regionEntityRef = useRef<Cesium.Entity | null>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  
  const [drawingPolygon, setDrawingPolygon] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<LatLng[]>([]);
  const polygonPointEntities = useRef<Cesium.Entity[]>([]);
  const polygonDrawHandler = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  const regionDrawHandler = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  const pointSelectHandler = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  const mouseMoveHandlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  
  const { selectedPoint, tempRegion, regionName } = state;
  const [terrainProvider, setTerrainProvider] = useState<Cesium.TerrainProvider | null>(null);

  const setSelectedPoint = (point: LatLng | null) => {
    dispatch({ type: 'SET_SELECTED_POINT', payload: point });
    
    if (point) {
      localStorage.setItem('cesiumSelectedPoint', JSON.stringify(point));
    } else {
      localStorage.removeItem('cesiumSelectedPoint');
      sessionStorage.removeItem('selectedPointEntityId');
    }
  };

  const setRegionName = (name: string) => {
    dispatch({ type: 'SET_REGION_NAME', payload: name });
    localStorage.setItem('cesiumRegionName', name);
  };

  const updateSelectedRegion = (rectangle: Cesium.Rectangle | null, area?: { width: number; height: number; area: number }) => {
    setSelectedRegion(rectangle);
    
    if (rectangle && area) {
      dispatch({ 
        type: 'SET_TEMP_REGION', 
        payload: { 
          rectangle: rectangle, 
          area: area 
        } 
      });
      
      try {
        localStorage.setItem('cesiumSelectedRegion', JSON.stringify({
          west: rectangle.west,
          south: rectangle.south,
          east: rectangle.east,
          north: rectangle.north
        }));
        localStorage.setItem('cesiumRegionArea', JSON.stringify(area));
      } catch (e) {
        console.error('Error saving region to localStorage:', e);
      }
      
      if (isViewerReady && viewerRef.current) {
        updateRegionEntity();
      }
    } else if (!rectangle) {
      dispatch({ type: 'SET_TEMP_REGION', payload: null });
      
      localStorage.removeItem('cesiumSelectedRegion');
      localStorage.removeItem('cesiumRegionArea');
      
      if (regionEntityRef.current && viewerRef.current) {
        viewerRef.current.entities.remove(regionEntityRef.current);
        regionEntityRef.current = null;
      }
    }
  };

  const updatePointEntity = () => {
    const generateStablePointId = (point: LatLng) => {
      const latStr = point.latitude.toFixed(6);
      const lonStr = point.longitude.toFixed(6);
      return `selected-point-${latStr}-${lonStr}`;
    };

    if (pointEntityRef.current && viewerRef.current) {
      if (selectedPoint && pointEntityRef.current.id === generateStablePointId(selectedPoint)) {
        console.log('[updatePointEntity] Entity already exists for this point, no need to recreate');
        if (pointEntityRef.current.show === false) {
          pointEntityRef.current.show = true;
        }
        return;
      }
      
      try {
        console.log('[updatePointEntity] Removing existing point entity');
        viewerRef.current.entities.remove(pointEntityRef.current);
      } catch (err) {
        console.error('Error removing point entity:', err);
      }
      pointEntityRef.current = null;
    }
    
    if (selectedPoint && viewerRef.current) {
      console.log('[updatePointEntity] Creating point entity at:', selectedPoint);
      
      const stableId = generateStablePointId(selectedPoint);
      const existingEntity = viewerRef.current.entities.getById(stableId);
      
      if (existingEntity) {
        console.log('[updatePointEntity] Found existing entity with same ID, reusing');
        pointEntityRef.current = existingEntity;
        
        if (pointEntityRef.current.show === false) {
          pointEntityRef.current.show = true;
        }
        
        return;
      }
      
      try {
        pointEntityRef.current = viewerRef.current.entities.add({
          id: stableId,
          name: 'Selected Location',
          position: Cesium.Cartesian3.fromDegrees(
            selectedPoint.longitude,
            selectedPoint.latitude
          ),
          point: {
            pixelSize: 15,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: 'Selected Point',
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          properties: {
            isSelectedPoint: true,
            latitude: new Cesium.ConstantProperty(selectedPoint.latitude),
            longitude: new Cesium.ConstantProperty(selectedPoint.longitude)
          }
        });
        
        viewerRef.current.selectedEntity = pointEntityRef.current;
        
        sessionStorage.setItem('selectedPointEntityId', stableId);
        localStorage.setItem('selectedPointEntityId', stableId);
        
        console.log('[updatePointEntity] Created entity with ID:', stableId);
      } catch (err) {
        console.error('Failed to create point entity:', err);
      }
    } else {
      if (!selectedPoint) {
        console.log('[updatePointEntity] No selected point to create entity for');
      }
      if (!viewerRef.current) {
        console.error('[updatePointEntity] Viewer reference is null, cannot create entity');
      }
    }
  };

  const updateRegionEntity = () => {
    const generateStableRegionId = (region: Cesium.Rectangle) => {
      const westStr = Cesium.Math.toDegrees(region.west).toFixed(6);
      const southStr = Cesium.Math.toDegrees(region.south).toFixed(6);
      const eastStr = Cesium.Math.toDegrees(region.east).toFixed(6);
      const northStr = Cesium.Math.toDegrees(region.north).toFixed(6);
      return `selected-region-${westStr}-${southStr}-${eastStr}-${northStr}`;
    };

    if (regionEntityRef.current && viewerRef.current) {
      if (selectedRegion && regionEntityRef.current.id === generateStableRegionId(selectedRegion)) {
        console.log('[updateRegionEntity] Entity already exists for this region, no need to recreate');
        if (regionEntityRef.current.show === false) {
          regionEntityRef.current.show = true;
        }
        return;
      }

      viewerRef.current.entities.remove(regionEntityRef.current);
      regionEntityRef.current = null;
    }
    
    if (selectedRegion && viewerRef.current) {
      console.log('[updateRegionEntity] Creating region entity');
      
      const stableId = generateStableRegionId(selectedRegion);
      const existingEntity = viewerRef.current.entities.getById(stableId);
      
      if (existingEntity) {
        console.log('[updateRegionEntity] Found existing entity with same ID, reusing');
        regionEntityRef.current = existingEntity;
        if (regionEntityRef.current.show === false) {
          regionEntityRef.current.show = true;
        }
        return;
      }
      
      try {
        regionEntityRef.current = viewerRef.current.entities.add({
          id: stableId,
          name: 'Selected Region',
          rectangle: {
            coordinates: selectedRegion,
            material: Cesium.Color.BLUE.withAlpha(0.3),
            outline: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            classificationType: Cesium.ClassificationType.BOTH,
            zIndex: 100
          },
          properties: {
            isSelectedRegion: true
          }
        });
        
        sessionStorage.setItem('selectedRegionEntityId', stableId);
        localStorage.setItem('selectedRegionEntityId', stableId);
        
        console.log('[updateRegionEntity] Created region with ID:', stableId);
      } catch (err) {
        console.error('Failed to create region entity:', err);
      }
    }
  };

  const handleMouseMove = (movement: any) => {
    if (!viewerRef.current) return;
    
    const cartesian = viewerRef.current.scene.camera.pickEllipsoid(
      movement.endPosition,
      viewerRef.current.scene.globe.ellipsoid
    );
    
    if (Cesium.defined(cartesian)) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      
      setMousePosition({
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6))
      });
      
      if (drawingRegion && regionStart) {
        setRegionEnd(cartesian);
        
        const startCartographic = Cesium.Cartographic.fromCartesian(regionStart);
        const endCartographic = Cesium.Cartographic.fromCartesian(cartesian);
        
        const rectangle = Cesium.Rectangle.fromCartographicArray([
          startCartographic,
          endCartographic
        ]);
        
        updateSelectedRegion(rectangle);
      }
      
      if (drawingRegion || selectingPoint || drawingPolygon) {
        if (viewerRef.current.container) {
          (viewerRef.current.container as HTMLElement).style.cursor = 'crosshair';
        }
      } else {
        if (viewerRef.current.container) {
          (viewerRef.current.container as HTMLElement).style.cursor = 'default';
        }
      }
    } else {
      setMousePosition(null);
    }
  };

  const addTemporaryPointEntity = (lon: number, lat: number) => {
    if (!viewerRef.current) return;
    
    const entity = viewerRef.current.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      point: {
        pixelSize: 20,
        color: Cesium.Color.GREEN.withAlpha(0.8),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      }
    });
    
    setTimeout(() => {
      if (viewerRef.current && !viewerRef.current.isDestroyed() && entity) {
        viewerRef.current.entities.remove(entity);
      }
    }, 1000);
  };

  const cleanupHandlers = () => {
    console.log('[cleanupHandlers] Starting cleanup of all handlers');
    
    // Clean up specific handlers
    if (polygonDrawHandler.current && !polygonDrawHandler.current.isDestroyed()) {
      console.log('[cleanupHandlers] Destroying polygon handler');
      polygonDrawHandler.current.destroy();
      polygonDrawHandler.current = null;
    }
    
    if (regionDrawHandler.current && !regionDrawHandler.current.isDestroyed()) {
      console.log('[cleanupHandlers] Destroying region handler');
      regionDrawHandler.current.destroy();
      regionDrawHandler.current = null;
    }
    
    if (pointSelectHandler.current && !pointSelectHandler.current.isDestroyed()) {
      console.log('[cleanupHandlers] Destroying point handler');
      pointSelectHandler.current.destroy();
      pointSelectHandler.current = null;
    }
    
    // Reset all drawing states
    console.log('[cleanupHandlers] Resetting drawing states');
    setDrawingPolygon(false);
    setDrawingRegion(false);
    setSelectingPoint(false);
    
    // Ensure cursor is reset to default
    if (viewerRef.current?.container) {
      console.log('[cleanupHandlers] Resetting cursor to default');
      (viewerRef.current.container as HTMLElement).style.cursor = 'default';
    }
    
    console.log('[cleanupHandlers] Cleanup complete');
  };

  const completePolygonDrawing = () => {
    console.log("Completing polygon drawing");
    setDrawingPolygon(false);
    if (viewerRef.current?.container) {
      (viewerRef.current.container as HTMLElement).style.cursor = 'default';
    }
    
    if (polygonDrawHandler.current && !polygonDrawHandler.current.isDestroyed()) {
      polygonDrawHandler.current.destroy();
      polygonDrawHandler.current = null;
    }
    
    if (viewerRef.current) {
      polygonPointEntities.current.forEach(entity => viewerRef.current?.entities.remove(entity));
      polygonPointEntities.current = [];
    }
    
    if (polygonPoints.length < 3) {
      console.warn("Need at least 3 points to form a polygon region.");
      setPolygonPoints([]); 
      onAreaSelect?.(null); 
      return;
    }
    
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    polygonPoints.forEach(p => {
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      minLon = Math.min(minLon, p.longitude);
      maxLon = Math.max(maxLon, p.longitude);
    });
    const bounds = {
      north: maxLat,
      south: minLat,
      east: maxLon,
      west: minLon,
    };
    const center = getRegionCenter(bounds);

    const region: Region = {
      id: generateUUID(),
      name: 'Drawn Polygon Area',
      bounds,
      center,
    };

    console.log('[CesiumGlobe] Polygon complete, calling onAreaSelect with region:', region);
    onAreaSelect?.(region); 
    cleanupHandlers(); 
  };

  const handlePolygonClick = (click: any) => {
    if (!viewerRef.current || !drawingPolygon) return;

    const pickedPosition = viewerRef.current.scene.pickPosition(click.position);
    let position: Cesium.Cartesian3 | undefined;

    if (Cesium.defined(pickedPosition)) {
      position = pickedPosition;
    } else {
      const pickedEllipsoid = viewerRef.current.camera.pickEllipsoid(
        click.position,
        viewerRef.current.scene.globe.ellipsoid
      );
      if(Cesium.defined(pickedEllipsoid)) {
        position = pickedEllipsoid;
      }
    }

    if (Cesium.defined(position)) {
      const cartographic = Cesium.Cartographic.fromCartesian(position);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const newPoint: LatLng = {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
      };

      console.log("Adding polygon point:", newPoint);
      const updatedPoints = [...polygonPoints, newPoint];
      setPolygonPoints(updatedPoints);

      try {
        const pointEntity = viewerRef.current.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat),
          point: {
            pixelSize: 8,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });
        polygonPointEntities.current.push(pointEntity);
      } catch (err) { console.error("Failed to add point entity:", err); }

      if (updatedPoints.length >= 3) {
        const firstPoint = updatedPoints[0];
        const distance = haversineDistance(firstPoint, newPoint);
        const closingThreshold = 15; 
        console.log(`Distance to start: ${distance.toFixed(1)}m`);
        if (distance < closingThreshold) {
          completePolygonDrawing();
        }
      }
    } else {
      console.warn("Could not determine polygon point position from click.");
    }
  };

  const startPolygonDrawing = () => {
    if (!viewerRef.current) {
      console.error("Starting polygon drawing mode but viewerRef is null.");
      return;
    }
    console.log("Starting polygon drawing mode");
    cleanupHandlers(); 
    setDrawingPolygon(true);
    setDrawingRegion(false);
    setSelectingPoint(false);
    setPolygonPoints([]); 
    if (viewerRef.current) { 
      polygonPointEntities.current.forEach(entity => viewerRef.current?.entities.remove(entity));
    }
    polygonPointEntities.current = [];
    updateSelectedRegion(null);
    setSelectedPoint(null);
    onAreaSelect?.(null);
    if (viewerRef.current.container) {
      (viewerRef.current.container as HTMLElement).style.cursor = 'crosshair';
    }
    polygonDrawHandler.current = new Cesium.ScreenSpaceEventHandler(viewerRef.current.scene.canvas);
    polygonDrawHandler.current.setInputAction(handlePolygonClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    console.log("Polygon click handler set up.");
  };

  const startPointSelection = () => {
    if (!viewerRef.current) {
      console.error("[startPointSelection] Viewer reference is NULL. Cannot proceed.");
      alert("Map is not ready yet. Please wait a moment and try again.");
      return;
    }
    console.log('[startPointSelection] Starting...');
    cleanupHandlers(); // Clear previous handlers first
    
    console.log('[startPointSelection] Setting selectingPoint state to true.');
    setSelectingPoint(true);
    setDrawingRegion(false);
    setDrawingPolygon(false);
    
    // Ensure viewer and canvas are ready
    if (!viewerRef.current?.scene?.canvas) {
        console.error('[startPointSelection] Viewer or scene canvas is not available!');
        return;
    }
    
    // Set cursor style explicitly
    if (viewerRef.current.container) {
        console.log('[startPointSelection] Setting cursor style to crosshair');
        (viewerRef.current.container as HTMLElement).style.cursor = 'crosshair';
    }
    
    console.log('[startPointSelection] Setting up new ScreenSpaceEventHandler for LEFT_CLICK.');
    pointSelectHandler.current = new Cesium.ScreenSpaceEventHandler(viewerRef.current.scene.canvas);
    pointSelectHandler.current.setInputAction((click: any) => {
      // --- DETAILED LOGGING --- 
      console.log("!!!! [LEFT_CLICK Handler] Entered !!!!"); 
      if (!viewerRef.current) {
        console.error("[LEFT_CLICK Handler] Viewer became null!");
        if (pointSelectHandler.current && !pointSelectHandler.current.isDestroyed()) {
          pointSelectHandler.current.destroy();
        }
        pointSelectHandler.current = null; 
        return;
      }
      console.log("[LEFT_CLICK Handler] Picking position...");
      // Try scene.pickPosition first - works better with terrain/3D models
      const pickedPosition = viewerRef.current.scene.pickPosition(click.position);
      let position: Cesium.Cartesian3 | undefined;

      if (Cesium.defined(pickedPosition)) {
        console.log("[LEFT_CLICK Handler] Picked position from scene.");
        position = pickedPosition;
      } else {
        console.log("[LEFT_CLICK Handler] Picking position from ellipsoid (fallback)...");
        const pickedEllipsoid = viewerRef.current.camera.pickEllipsoid(
          click.position,
          viewerRef.current.scene.globe.ellipsoid
        );
        if(Cesium.defined(pickedEllipsoid)) {
          console.log("[LEFT_CLICK Handler] Picked position from ellipsoid.");
          position = pickedEllipsoid;
        } else {
           console.warn("[LEFT_CLICK Handler] Failed to pick any position.");
        }
      }
      // --- END POSITION PICKING --- 
      
      if (Cesium.defined(position)) {
        console.log("[LEFT_CLICK Handler] Position defined, calculating lat/lon...");
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const newPoint: LatLng = {
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lon.toFixed(6))
        };
        
        setSelectedPoint(newPoint); // Update internal state

        if (typeof onAreaSelect === 'function') {
          console.log('[LEFT_CLICK Handler] Calling onAreaSelect with point:', newPoint); 
          onAreaSelect(newPoint); // Pass LatLng directly
        }
        // Fly camera omitted for now to focus on selection trigger
      } else {
        console.warn("[LEFT_CLICK Handler] Could not determine point position from click.");
      }
        
      console.log("[LEFT_CLICK Handler] Resetting selectingPoint state.");
      setSelectingPoint(false); // Reset state
      if (viewerRef.current?.container) { 
         (viewerRef.current.container as HTMLElement).style.cursor = 'default';
      }
      
      console.log("[LEFT_CLICK Handler] Destroying this handler.");
      if (pointSelectHandler.current && !pointSelectHandler.current.isDestroyed()) {
         pointSelectHandler.current.destroy();
      }
      pointSelectHandler.current = null; 
      console.log("[LEFT_CLICK Handler] Finished.");
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    
    console.log('[startPointSelection] Event handler set.');
  };

  const startRegionSelection = () => {
    if (!viewerRef.current) {
      console.error("[startRegionSelection] Viewer reference is NULL. Cannot proceed.");
      alert("Map is not ready yet. Please wait a moment and try again.");
      return;
    }
    console.log('Starting region drawing mode (Box)');
    cleanupHandlers(); 
    setDrawingRegion(true);
    setRegionStart(null);
    setRegionEnd(null);
    updateSelectedRegion(null);
    setSelectingPoint(false);
    setDrawingPolygon(false);
    
    if (viewerRef.current.container) {
      (viewerRef.current.container as HTMLElement).style.cursor = 'crosshair';
    }
    
    regionDrawHandler.current = new Cesium.ScreenSpaceEventHandler(viewerRef.current.scene.canvas);

    regionDrawHandler.current.setInputAction((click: any) => {
      if (!drawingRegion || !regionDrawHandler.current || !viewerRef.current) return; 
      
      const clickCartesian = viewerRef.current.camera.pickEllipsoid(
        click.position,
        viewerRef.current.scene.globe.ellipsoid
      );
      
      if (clickCartesian) {
        setRegionStart(clickCartesian);
        
        regionDrawHandler.current.setInputAction((movement: any) => {
          if (!drawingRegion || !regionDrawHandler.current || !viewerRef.current) return; 
          
          const moveCartesian = viewerRef.current.camera.pickEllipsoid(
            movement.endPosition,
            viewerRef.current.scene.globe.ellipsoid
          );
          if (moveCartesian && regionStart) { 
            const startCartographic = Cesium.Cartographic.fromCartesian(regionStart);
            const endCartographic = Cesium.Cartographic.fromCartesian(moveCartesian as Cesium.Cartesian3);
            const rectangle = Cesium.Rectangle.fromCartographicArray([startCartographic, endCartographic]);
            updateSelectedRegion(rectangle);
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        
        regionDrawHandler.current.setInputAction(() => {
          if (!drawingRegion || !regionDrawHandler.current || !viewerRef.current) return; 
          
          if (!regionStart || !regionEnd || !selectedRegion) { 
             setDrawingRegion(false);
             if (viewerRef.current?.container) {
               (viewerRef.current.container as HTMLElement).style.cursor = 'default';
             }
             regionDrawHandler.current?.destroy();
             regionDrawHandler.current = null;
             console.log("[Region Draw] Invalid state on LEFT_UP, cleaned up.");
             return;
          }
          
          const bounds = cesiumRectangleToRegionBounds(selectedRegion);
          const center = getRegionCenter(bounds);
          const width = haversineDistance(
            { latitude: center.latitude, longitude: bounds.west },
            { latitude: center.latitude, longitude: bounds.east }
          );
          const height = haversineDistance(
            { latitude: bounds.south, longitude: center.longitude },
            { latitude: bounds.north, longitude: center.longitude }
          );
          const areaInSqMeters = width * height;
          const area = {
            width: Math.round(width),
            height: Math.round(height),
            area: Math.round(areaInSqMeters)
          };
          
          setRegionArea(area);

          const finalRegion: Region = {
            id: generateUUID(),
            name: 'Drawn Box Area',
            bounds,
            center,
          };
          console.log('[CesiumGlobe] Box drawn, calling onAreaSelect with region:', finalRegion);
          onAreaSelect?.(finalRegion);

          setDrawingRegion(false);
          if (viewerRef.current?.container) {
            (viewerRef.current.container as HTMLElement).style.cursor = 'default';
          }
          
          regionDrawHandler.current?.destroy();
          regionDrawHandler.current = null;
          console.log("[Region Draw] Finished, handler cleaned up.");
        }, Cesium.ScreenSpaceEventType.LEFT_UP);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
  };

  const createMission = () => {
    if (!selectedRegion) return;
    
    const bounds = cesiumRectangleToRegionBounds(selectedRegion);
    const center = getRegionCenter(bounds);
    
    const region: Region = {
      id: generateUUID(),
      name: regionName,
      bounds,
      center
    };
    
    localStorage.setItem('cesiumRegionName', regionName);
    
    dispatch({
      type: 'CREATE_MISSION',
      payload: { name: regionName, region }
    });
  };

  const changeImageryType = async (type: string) => { 
    if (!viewerRef.current) return;
    console.log(`[CesiumGlobe] Changing imagery to: ${type}`);
    onImageryTypeChange?.(type);
    viewerRef.current.imageryLayers.removeAll(true);
    let newLayer: Cesium.ImageryLayer | undefined;
    try {
      switch (type) {
        case 'streets':
          newLayer = new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({
            url : 'https://a.tile.openstreetmap.org/' 
          }));
          break;
        // TEMP: Use aerial logic for hybrid to isolate ArcGis provider issue
        case 'hybrid': 
        case 'aerial':
        default:
          const aerialProvider = await Cesium.createWorldImageryAsync({
               style : Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
          });
          newLayer = new Cesium.ImageryLayer(aerialProvider);
          break;
      }
      if (newLayer) { // Simplified check as hybrid case is merged
          viewerRef.current.imageryLayers.add(newLayer, 0);
      }
    } catch (error) {
        console.error(`Error changing imagery type to ${type}:`, error);
        // Fallback logic...
        try {
            const fallbackProvider = await Cesium.createWorldImageryAsync({});
            viewerRef.current?.imageryLayers.add(new Cesium.ImageryLayer(fallbackProvider), 0);
        } catch (fallbackError) {
            console.error('Error setting fallback imagery:', fallbackError);
        }
    }
    console.log("[CesiumGlobe] Imagery layers updated.");
  };

  useEffect(() => {
    if (tempRegion && isViewerReady && viewerRef.current) {
      console.log('Restoring region from context');
      setSelectedRegion(tempRegion.rectangle);
      setRegionArea(tempRegion.area);
      
      setTimeout(() => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          const regionCenter = Cesium.Rectangle.center(tempRegion.rectangle);
          const centerCartesian = Cesium.Cartographic.toCartesian(regionCenter);
          
          const width = Cesium.Math.toDegrees(tempRegion.rectangle.east - tempRegion.rectangle.west);
          const height = Cesium.Math.toDegrees(tempRegion.rectangle.north - tempRegion.rectangle.south);
          const maxDimension = Math.max(width, height) * 111000;
          const cameraHeight = maxDimension * 1.2;
          
          viewerRef.current.camera.flyTo({
            destination: new Cesium.Cartesian3(
              centerCartesian.x,
              centerCartesian.y,
              centerCartesian.z + cameraHeight
            ),
            complete: () => {
              updateRegionEntity();
            }
          });
        }
      }, 500);
    }
  }, [tempRegion, isViewerReady]);

  useEffect(() => {
    const initializeViewer = async () => {
      if (mapContainerRef.current && !viewerRef.current) {
        console.log('[useEffect Init] Initializing Cesium Viewer...');
        
        let initialTerrainProvider: Cesium.TerrainProvider;
        try {
           initialTerrainProvider = await Cesium.createWorldTerrainAsync();
           setTerrainProvider(initialTerrainProvider);
        } catch (error) {
           console.error("Failed to create world terrain:", error);
           initialTerrainProvider = new Cesium.EllipsoidTerrainProvider();
           setTerrainProvider(initialTerrainProvider);
        }

        const viewerOptions: Cesium.Viewer.ConstructorOptions = {
          animation: false,
          timeline: false,
          homeButton: false,
          sceneModePicker: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          geocoder: false,
          infoBox: false,
          selectionIndicator: false,
          vrButton: false,
          terrainProvider: initialTerrainProvider,
          // Disable default click handlers that might interfere
          requestRenderMode: false,
          msaaSamples: 4 // Add anti-aliasing for better rendering
        };

        try {
          const viewer = new Cesium.Viewer(mapContainerRef.current, viewerOptions);
          viewerRef.current = viewer;
          console.log('[useEffect Init] Cesium Viewer Created:', viewer);

          // await changeImageryType(initialImageryType); // Handled by separate effect

          viewer.scene.globe.enableLighting = false;
          viewer.scene.globe.depthTestAgainstTerrain = false;

          const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
          if (creditContainer) {
            creditContainer.style.display = 'none';
          }

          // Set up persistent mouse move handler here
          if (viewer && viewer.scene?.canvas) {
            console.log('[useEffect Init] Setting up persistent MOUSE_MOVE handler.');
            mouseMoveHandlerRef.current = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            mouseMoveHandlerRef.current.setInputAction(handleMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
          } else {
            console.error('[useEffect Init] Failed to set up mouse move handler - viewer or canvas missing.');
          }

          setIsViewerReady(true);
          console.log('[useEffect Init] Viewer is now ready!');
        } catch (error) {
          console.error('Cesium Viewer initialization failed:', error);
          alert('Failed to load the map viewer.');
        }
      }
    };
    
    initializeViewer();

    return () => {
      // Cleanup temporary handlers first
      cleanupHandlers(); 
      // Cleanup persistent mouse move handler
      console.log('[useEffect Cleanup] Destroying persistent MOUSE_MOVE handler.');
      mouseMoveHandlerRef.current?.destroy();
      mouseMoveHandlerRef.current = null;
      // Destroy viewer
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        // ... remove entities ...
        console.log('[useEffect Cleanup] Destroying Cesium Viewer...');
        viewerRef.current.destroy();
        viewerRef.current = null;
        setIsViewerReady(false);
      }
    };
  }, []); // Keep empty dependency array

  useEffect(() => {
    if (isViewerReady) {
      console.log(`[CesiumGlobe Effect] Viewer ready, setting initial imagery: ${initialImageryType}`);
      changeImageryType(initialImageryType); 
    }
  }, [isViewerReady, initialImageryType]);

  useEffect(() => {
    const setupViewer = () => {
      if (viewerRef.current && !isViewerReady) {
        console.log("[CesiumGlobe Effect] Viewer initialized, setting ready state.");
        setIsViewerReady(true);
      }
    };

    const timer = setTimeout(setupViewer, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => { cleanupHandlers(); };
  }, []);

  useEffect(() => {
    if (!drawingPolygon && !drawingRegion && !selectingPoint) { 
      cleanupHandlers(); 
    } else {
      // Log current mode for debugging
      console.log(`[CesiumGlobe Mode] drawingPolygon: ${drawingPolygon}, drawingRegion: ${drawingRegion}, selectingPoint: ${selectingPoint}`);
      
      // Make sure cursor is set for the active mode
      if (viewerRef.current?.container) {
        const container = viewerRef.current.container as HTMLElement;
        if (selectingPoint || drawingPolygon || drawingRegion) {
          console.log('[CesiumGlobe Mode] Setting cursor to crosshair');
          container.style.cursor = 'crosshair';
        } else {
          console.log('[CesiumGlobe Mode] Setting cursor to default');
          container.style.cursor = 'default';
        }
      }
    }
  }, [drawingPolygon, drawingRegion, selectingPoint]);

  // Expose methods via useImperativeHandle
  useImperativeHandle(ref, () => ({
    flyToDestination: (destination) => {
      if (viewerRef.current && destination && isViewerReady) { 
        console.log("[CesiumGlobe - flyToDestination] Viewer is ready, attempting to fly...");
        try {
            viewerRef.current.camera.flyTo({
              destination: destination,
              duration: 2.0
            });
            console.log("[CesiumGlobe - flyToDestination] flyTo command issued.");
        } catch (error) {
             console.error("[CesiumGlobe - flyToDestination] Error during camera.flyTo:", error);
        }
      } else {
        if (!isViewerReady) {
            console.warn("[CesiumGlobe - flyToDestination] Cannot fly, viewer is not ready yet.");
        } else if (!viewerRef.current) {
            console.warn("[CesiumGlobe - flyToDestination] Cannot fly, viewerRef is null.");
        } else {
             console.warn("[CesiumGlobe - flyToDestination] Cannot fly, destination not provided.");
        }
      }
    },
    setViewDestination: (destination, orientation) => {
       if (viewerRef.current && destination && isViewerReady) {
         console.log("[CesiumGlobe - setViewDestination] Viewer ready, attempting setView (with delay)...");
         setTimeout(() => {
            if (!viewerRef.current || viewerRef.current.isDestroyed()) {
                console.warn("[CesiumGlobe - setViewDestination] Viewer destroyed before timeout executed.");
                return;
            }
            try {
              const viewOptions: any = { destination };
              if (orientation) {
                viewOptions.orientation = orientation;
              }
              console.log("[CesiumGlobe - setViewDestination] (Delayed) Calling camera.setView with:", viewOptions);
              viewerRef.current.camera.setView(viewOptions);
              console.log("[CesiumGlobe - setViewDestination] (Delayed) setView called. Requesting render...");
              viewerRef.current.scene.requestRender(); 
              console.log("[CesiumGlobe - setViewDestination] (Delayed) Render requested.");
            } catch (error) {
               console.error("[CesiumGlobe - setViewDestination] (Delayed) Error during camera.setView:", error);
            }
         }, 100);
       } else {
         // Log specific reason for not setting view
         if (!isViewerReady) {
             console.warn("[CesiumGlobe - setViewDestination] Cannot setView, viewer is not ready yet.");
         } else if (!viewerRef.current) {
             console.warn("[CesiumGlobe - setViewDestination] Cannot setView, viewerRef is null.");
         } else {
              console.warn("[CesiumGlobe - setViewDestination] Cannot setView, destination not provided.");
         }
       }
    },
    getViewer: () => viewerRef.current,
    startPointSelection: startPointSelection,
    startRegionSelection: startRegionSelection,
    startPolygonDrawing: startPolygonDrawing,
  }));

  // Add a function to manage entity updates
  const updateEntities = useCallback(() => {
    // If viewer isn't ready or doesn't exist, don't try to update entities
    if (!viewerRef.current || !isViewerReady) return;
    
    console.log('[updateEntities] Updating entities in viewer');
    
    // Clear all existing entities first to avoid duplicates
    viewerRef.current.entities.removeAll();
    
    // Add selected point entity if it exists
    if (selectedPoint) {
      console.log('[updateEntities] Adding point entity');
      viewerRef.current.entities.add({
        name: "Selected Location",
        position: Cesium.Cartesian3.fromDegrees(selectedPoint.longitude, selectedPoint.latitude),
        point: { 
          pixelSize: 15,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: 'Selected Point',
          font: '14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
    }
    
    // Add selected region entity if it exists
    if (selectedRegion) {
      console.log('[updateEntities] Adding region entity');
      viewerRef.current.entities.add({
        name: regionName || 'Selected Area',
        rectangle: {
          coordinates: selectedRegion,
          material: Cesium.Color.CORNFLOWERBLUE.withAlpha(0.4),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          classificationType: Cesium.ClassificationType.BOTH,
          zIndex: 100 
        }
      });
    }
    
    // Add any other entities you need here...
    
    console.log('[updateEntities] Entities updated');
  }, [isViewerReady, selectedPoint, selectedRegion, regionName]);
  
  // Call updateEntities whenever relevant state changes
  useEffect(() => {
    updateEntities();
  }, [updateEntities, selectedPoint, selectedRegion]);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
      className="cesium-container"
    >
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%', margin: 0, padding: 0, overflow: 'hidden' }} 
      />
    </Box>
  );
});

export default CesiumGlobe;