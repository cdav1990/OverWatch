import React from 'react';
import { Modal, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HardwareForm from './HardwareForm';
import VisualizationTabs from './VisualizationTabs';
import DofControls from './DofControls';
import InfoPanel from './InfoPanel';

interface HardwareSelectionModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90vw', // Start with a wide view
    maxWidth: '1400px', // Limit max width
    height: '90vh', // Start with a tall view
    maxHeight: '1000px', // Limit max height
    bgcolor: 'background.paper',
    border: '1px solid #000',
    boxShadow: 24,
    p: 0, // No padding on the Box itself, handle inside
    display: 'flex',
    flexDirection: 'column',
    color: 'text.primary', // Ensure text color contrasts with background
};

const HardwareSelectionModal: React.FC<HardwareSelectionModalProps> = ({ open, onClose, onConfirm }) => {
    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="hardware-selection-modal-title"
            aria-describedby="hardware-selection-modal-description"
        >
            <Box sx={style}>
                {/* Header */}
                <Box sx={{ 
                    p: 2, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    flexShrink: 0 // Prevent header from shrinking
                }}>
                    <Typography id="hardware-selection-modal-title" variant="h6" component="h2">
                        Mission Hardware Configuration
                    </Typography>
                    <IconButton onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Main Content Area using Flexbox */}
                <Box sx={{ 
                    flexGrow: 1, 
                    overflow: 'hidden', // Prevent overall content overflow
                    p: 2, 
                    display: 'flex', // Use flex for the main content layout
                    gap: 2 // Add gap between flex items
                }}>
                    {/* Left Panel: Form */}
                    <Box sx={{ 
                        width: '35%', // Allocate width for the form panel
                        minWidth: '300px', // Ensure minimum width
                        height: '100%', 
                        overflowY: 'auto', // Allow form to scroll if needed
                        pr: 1 // Add some padding to the right
                    }}>
                        <HardwareForm onSaveSuccess={onConfirm} />
                    </Box>

                    {/* Right Panel: Visualization & Info */}
                    <Box sx={{ 
                        flexGrow: 1, // Allow this panel to take remaining space
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column' 
                    }}> 
                        {/* Visualization Area - Now using VisualizationTabs */}
                        <Box sx={{ 
                            flexGrow: 1, 
                            mb: 2, 
                            borderRadius: 1, 
                            overflow: 'hidden' // Hide overflow from tabs/content
                        }}>
                           <VisualizationTabs />
                        </Box>
                        {/* Info/Controls Area - Now using DofControls and InfoPanel */}
                        <Box sx={{ 
                            flexShrink: 0, // Prevent shrinking
                            height: '250px', // Fixed height
                            bgcolor: 'background.paper', // Use paper background like tabs
                            borderRadius: 1, 
                            p: 0, // Remove parent padding, handled by children
                            overflow: 'hidden', // Hide internal overflow
                            display: 'flex', // Use flex to split controls and info
                            flexDirection: 'column' // Stack controls on top of info
                        }}>
                           <DofControls />
                           <Box sx={{ flexGrow: 1, overflowY: 'auto', borderTop: 1, borderColor: 'divider' }}>
                               <InfoPanel />
                           </Box>
                        </Box>
                    </Box>
                </Box>
                
                 {/* Footer Removed - Save button is in the form */}
                 {/* 
                 <Box sx={{ ... }}>
                    <Typography variant="caption">Footer Actions (e.g., Save) can go here</Typography>
                 </Box>
                 */}
            </Box>
        </Modal>
    );
};

export default HardwareSelectionModal; 