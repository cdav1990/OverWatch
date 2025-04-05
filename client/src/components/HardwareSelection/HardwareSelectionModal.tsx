import React from 'react';
import { Modal, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HardwareForm from './HardwareForm';
import VisualizationTabs from './VisualizationTabs';
import DofControls from './DofControls';

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
    width: '95vw', // Increase from 90vw to 95vw
    maxWidth: '1800px', // Increase from 1400px to 1800px
    height: '95vh', // Increase from 90vh to 95vh
    maxHeight: '1200px', // Increase from 1000px to 1200px
    bgcolor: '#111111', // Darker background
    border: '1px solid #222222', // Darker border
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.5)', // Deeper shadow
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
                    borderBottom: '1px solid #222222', // Darker border
                    bgcolor: '#0a0a0a', // Even darker header
                    flexShrink: 0 // Prevent header from shrinking
                }}>
                    <Typography id="hardware-selection-modal-title" variant="h6" component="h2" sx={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                        Mission Hardware Configuration
                    </Typography>
                    <IconButton onClick={onClose} aria-label="close" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Main Content Area using Flexbox */}
                <Box sx={{ 
                    flexGrow: 1, 
                    overflow: 'hidden', // Prevent overall content overflow
                    p: 2, 
                    display: 'flex', // Use flex for the main content layout
                    gap: 3, // Increase gap from 2 to 3 for more space between panels
                    bgcolor: '#111111' // Darker main area
                }}>
                    {/* Left Panel: Form - Increase width */}
                    <Box sx={{ 
                        width: '38%', // Increase width from 35% to 38%
                        minWidth: '380px', // Increase from 300px to 380px
                        height: '100%', 
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'auto', // Allow scrolling only if needed
                        pr: 1, // Add some padding to the right
                        bgcolor: '#0e0e0e', // Darker form background
                        borderRadius: 1,
                        border: '1px solid #222222' // Subtle border
                    }}>
                        <HardwareForm onSaveSuccess={onClose} />
                    </Box>

                    {/* Right Panel: Visualization & Controls */}
                    <Box sx={{ 
                        flexGrow: 1, // Allow this panel to take remaining space
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        bgcolor: '#0e0e0e', // Darker right panel
                        borderRadius: 1,
                        border: '1px solid #222222' // Subtle border
                    }}> 
                        {/* Visualization Area - Now using VisualizationTabs */}
                        <Box sx={{ 
                            flexGrow: 1, 
                            borderRadius: 1, 
                            overflow: 'hidden' // Hide overflow from tabs/content
                        }}>
                           <VisualizationTabs />
                        </Box>
                        
                        {/* User Controls Area - Only aperture and object distance */}
                        <Box sx={{ 
                            flexShrink: 0,
                            mt: 2,
                            p: 2,
                            bgcolor: '#0a0a0a', // Darker control area
                            borderRadius: 1,
                            borderTop: '1px solid #222222' // Darker border
                        }}>
                            <DofControls simplified={true} />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Modal>
    );
};

export default HardwareSelectionModal; 