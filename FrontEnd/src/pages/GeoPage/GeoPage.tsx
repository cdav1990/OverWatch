import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  Stack 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CesiumGlobe, { CesiumGlobeHandle } from '../../components/CesiumGlobe/CesiumGlobe';
import GeoToolbar from '../../components/GeoToolbar/GeoToolbar';
import DrawMissionPanel from '../../components/DrawMissionPanel/DrawMissionPanel';
import { useMission } from '../../context/MissionContext';
import { Region, LatLng } from '../../types/mission';
import * as Cesium from 'cesium';

const GeoPage: React.FC = () => {
  const { state, dispatch } = useMission();
  const navigate = useNavigate();
  const cesiumGlobeRef = useRef<CesiumGlobeHandle>(null);

  const [imageryType, setImageryType] = useState<string>('aerial');

  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [missionName, setMissionName] = useState<string>('');
  const [isNavigationPending, setIsNavigationPending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAreaSelect = (area: Region | LatLng | null) => {
    console.log("GeoPage: Area Selected:", area);
    
    let regionForModal: Region | null = null;
    let nameForModal = 'New Mission Area';

    if (area && 'bounds' in area) {
        regionForModal = area;
        nameForModal = area.name || 'Drawn Area';
    } else if (area && 'latitude' in area) {
        const buffer = 0.0001;
        regionForModal = {
            id: generateUUID(),
            name: 'Selected Point Area',
            center: area,
            bounds: {
                north: area.latitude + buffer,
                south: area.latitude - buffer,
                east: area.longitude + buffer,
                west: area.longitude - buffer,
            }
        };
        nameForModal = regionForModal.name;
    }

    setSelectedRegion(regionForModal);
    
    if (regionForModal) {
      setMissionName(nameForModal); 
      setIsModalOpen(true); 
    } else {
      setIsModalOpen(false);
      setMissionName('');
    }
  };

  useEffect(() => {
    if (isNavigationPending && state.currentMission) {
      console.log("[GeoPage Effect] Mission created, navigating to /mission");
      navigate('/mission');
      setIsNavigationPending(false);
    }
  }, [state.currentMission, isNavigationPending, navigate]);

  const handleCreateMission = () => {
    if (!selectedRegion || !missionName.trim()) {
      console.error("Please select a mission area on the map first and enter a name for the mission.");
      return;
    }

    const missionPayload = { 
      name: missionName.trim(), 
      region: selectedRegion 
    };

    console.log(`Creating mission: ${missionPayload.name}`, missionPayload.region);
    
    // Clear any existing selected point before creating new mission
    dispatch({ type: 'SET_SELECTED_POINT', payload: null });
    
    // Set the selected point from region center (for point-based selections)
    if (selectedRegion.center) {
      console.log("[GeoPage] Setting selected point from region center:", selectedRegion.center);
      dispatch({ type: 'SET_SELECTED_POINT', payload: selectedRegion.center });
    }
    
    // Create the mission with the region data
    dispatch({
      type: 'CREATE_MISSION',
      payload: missionPayload
    });

    setTimeout(() => {
      console.log('[GeoPage Timeout Check] State after dispatching CREATE_MISSION:', state);
    }, 10);

    setIsModalOpen(false); 
    setIsNavigationPending(true);
    console.log("[GeoPage] Dispatched CREATE_MISSION, navigation pending...");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMissionName(''); 
  };

  const handleImageryChange = (newType: string) => {
    console.log("GeoPage: Setting imagery type to:", newType);
    setImageryType(newType);
  };

  const handleSearch = (latitude: number, longitude: number) => {
    console.log(`GeoPage: Search result received: Lat=${latitude}, Lon=${longitude}`);
    if (cesiumGlobeRef.current?.setViewDestination) {
        // Convert lat/lon to Cesium Cartesian3
        const destination = Cesium.Cartesian3.fromDegrees(longitude, latitude, 5000); // 5km altitude
        const orientation = { // Optional: Look straight down
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-90.0),
            roll: 0.0
        };
        console.log("[GeoPage] Calling setViewDestination on CesiumGlobe ref...");
        cesiumGlobeRef.current.setViewDestination(destination, orientation);
    } else {
      console.warn("[GeoPage] Cannot setViewDestination, cesiumGlobeRef or setViewDestination method is not available.");
    }
  };

  const handleDrawBox = () => {
    cesiumGlobeRef.current?.startRegionSelection();
  };

  const handleSetPoint = () => {
    cesiumGlobeRef.current?.startPointSelection();
  };

  const handleDrawArea = () => {
    cesiumGlobeRef.current?.startPolygonDrawing();
  };

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        height: 'calc(100vh - 64px)',
        position: 'relative'
      }}
    >
      <GeoToolbar 
        imageryType={imageryType}
        onImageryChange={handleImageryChange}
        onSearch={handleSearch}
      />

      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        <CesiumGlobe 
          ref={cesiumGlobeRef}
          onAreaSelect={handleAreaSelect}
          initialImageryType={imageryType}
        />
        <DrawMissionPanel 
          onDrawBox={handleDrawBox}
          onSetPoint={handleSetPoint}
          onDrawArea={handleDrawArea}
        />
      </Box>

      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Mission Area</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {selectedRegion && (
              <Box sx={{ mb: 1, fontSize: '0.9rem', border: '1px solid lightgrey', p: 1.5, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Selected Area Bounds:</Typography>
                <Typography variant="body2">North: {selectedRegion.bounds.north.toFixed(5)}</Typography>
                <Typography variant="body2">South: {selectedRegion.bounds.south.toFixed(5)}</Typography>
                <Typography variant="body2">East: {selectedRegion.bounds.east.toFixed(5)}</Typography>
                <Typography variant="body2">West: {selectedRegion.bounds.west.toFixed(5)}</Typography>
              </Box>
            )}
            <TextField 
              autoFocus
              label="Mission Name"
              variant="outlined"
              size="small"
              fullWidth
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              sx={{ mt: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseModal} color="secondary">Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateMission} 
            disabled={!selectedRegion || !missionName.trim()} 
          >
            Create Mission & Plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const generateUUID = () => { 
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default GeoPage; 