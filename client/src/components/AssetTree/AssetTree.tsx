import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { TreeView } from '@mui/x-tree-view/TreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import PlaceIcon from '@mui/icons-material/Place'; // Icon for GCPs
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive'; // Icon for Drone
import VisibilityIcon from '@mui/icons-material/Visibility'; // Eye icon
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'; // Eye off icon
import CameraAltIcon from '@mui/icons-material/CameraAlt'; // Icon for Camera Frustum

import { useMission } from '../../context/MissionContext';

const AssetTree: React.FC = () => {
  const { state, dispatch } = useMission();
  const { currentMission, isDroneVisible, isCameraFrustumVisible, hiddenGcpIds } = state;

  if (!currentMission) {
    return <Typography variant="body2" color="textSecondary">No mission loaded.</Typography>;
  }

  const handleToggleDroneVisibility = (event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch({ type: 'TOGGLE_DRONE_VISIBILITY' });
  };

  const handleToggleCameraVisibility = (event: React.MouseEvent) => {
    event.stopPropagation(); 
    dispatch({ type: 'TOGGLE_CAMERA_FRUSTUM_VISIBILITY' });
  };

  const handleToggleGcpVisibility = (event: React.MouseEvent, gcpId: string) => {
    event.stopPropagation(); 
    dispatch({ type: 'TOGGLE_GCP_VISIBILITY', payload: gcpId });
  };

  // Check if any drone should be visible (based on takeoff, live, or sim state)
  const showDroneRelatedItems = !!(currentMission?.takeoffPoint || state.isLive || state.isSimulating);

  // Helper function to render the label with toggle
  const renderItemLabel = (label: string, isVisible: boolean, onToggle: (event: React.MouseEvent) => void) => (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <Typography variant="body2" sx={{ flexGrow: 1 }}>{label}</Typography>
        <IconButton 
            onClick={onToggle} 
            size="small" 
            aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
            title={isVisible ? `Hide ${label}` : `Show ${label}`}
            sx={{ ml: 1 }} // Add margin for spacing
        >
            {isVisible ? <VisibilityIcon fontSize="inherit" /> : <VisibilityOffIcon fontSize="inherit" />}
        </IconButton>
    </Box>
  );

  return (
    <Box>
      <TreeView
        aria-label="mission-asset-tree"
        slots={{ 
          collapseIcon: ExpandMoreIcon,
          expandIcon: ChevronRightIcon 
        }}
        sx={{ flexGrow: 1, overflowY: 'auto' }}
      >
        {/* Ground Control Points */}
        <TreeItem 
          itemId="gcps-folder"
          label="Ground Control Points" 
          slots={{ icon: FolderIcon }}
        >
          {currentMission.gcps && currentMission.gcps.length > 0 ? (
            currentMission.gcps.map((gcp) => {
              const isVisible = !hiddenGcpIds.includes(gcp.id);
              return (
                  <TreeItem 
                    key={gcp.id} 
                    itemId={`gcp-${gcp.id}`}
                    slots={{ icon: PlaceIcon }}
                    label={renderItemLabel(gcp.name, isVisible, (e) => handleToggleGcpVisibility(e, gcp.id))}
                  />
              );
            })
          ) : (
            <TreeItem itemId="no-gcps" label="No GCPs defined" disabled />
          )}
        </TreeItem>

        {/* Placeholder for Path Segments */}
        <TreeItem 
          itemId="paths-folder"
          label="Path Segments" 
          slots={{ icon: FolderIcon }}
          disabled
        >
           <TreeItem itemId="no-paths" label="(Not implemented yet)" disabled />
        </TreeItem>
        
        {/* Placeholder for 3D Models */}
         <TreeItem 
          itemId="models-folder"
          label="3D Models" 
          slots={{ icon: FolderIcon }}
          disabled
        >
           <TreeItem itemId="no-models" label="(Not implemented yet)" disabled />
        </TreeItem>

        {/* Vehicles */}
        <TreeItem 
          itemId="vehicles-folder"
          label="Vehicles" 
          slots={{ icon: FolderIcon }}
        >
          {/* Drone Item with Toggle */}
          {showDroneRelatedItems && (
            <TreeItem 
              itemId="drone-01" 
              slots={{ icon: AirplanemodeActiveIcon }}
              label={renderItemLabel("Drone", isDroneVisible, handleToggleDroneVisibility)}
            />
          )}
          {!showDroneRelatedItems && (
             <TreeItem itemId="no-drone" label="(No active drone)" disabled />
          )}
        </TreeItem>
        
        {/* Sensors Folder - Conditionally render if drone is active */} 
        {showDroneRelatedItems && (
            <TreeItem 
              itemId="sensors-folder"
              label="Sensors" 
              slots={{ icon: FolderIcon }}
            >
              {/* Camera Frustum Item with Toggle */} 
              <TreeItem 
                itemId="camera-frustum-01" 
                slots={{ icon: CameraAltIcon }}
                label={renderItemLabel("Camera Frustum", isCameraFrustumVisible, handleToggleCameraVisibility)}
              />
            </TreeItem>
        )}

      </TreeView>
    </Box>
  );
};

export default AssetTree; 