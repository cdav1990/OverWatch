import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Avatar,
    Tooltip,
    Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMission } from '../../../../context/MissionContext';
import RouteIcon from '@mui/icons-material/Route';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Styled components
const SectionSubtitle = styled(Typography)(({ theme }) => ({
    fontWeight: 500,
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing(1),
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderRadius: '4px',
    marginBottom: theme.spacing(1),
    '&:hover': {
        backgroundColor: 'rgba(40, 40, 40, 0.8)',
    },
}));

interface MissionListProps {
    onCopyId?: () => void;
}

const MissionList: React.FC<MissionListProps> = () => {
    const { state } = useMission();
    const { currentMission } = state;
    const [copiedMissionId, setCopiedMissionId] = useState<boolean>(false);

    // Format date helper function
    const formatDate = (date: Date | string | undefined) => {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    // Function to handle copying mission ID
    const handleCopyMissionId = () => {
        if (currentMission && currentMission.id) {
            navigator.clipboard.writeText(currentMission.id)
                .then(() => {
                    setCopiedMissionId(true);
                    setTimeout(() => setCopiedMissionId(false), 2000);
                })
                .catch(err => {
                    console.error('Failed to copy mission ID:', err);
                });
        }
    };

    if (!currentMission) return null;
    
    // Get path segments safely with fallback
    const pathSegments = currentMission.pathSegments || [];
    
    return (
        <Paper 
            variant="outlined" 
            sx={{ 
                p: 2, 
                mt: 3, 
                mb: 3,
                bgcolor: (theme) => theme.palette.mode === 'dark' 
                    ? 'rgba(30, 30, 30, 0.5)'
                    : 'rgba(245, 245, 245, 0.7)',
                borderColor: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.1)',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                    ? '0px 2px 6px rgba(0, 0, 0, 0.2)'
                    : '0px 2px 6px rgba(0, 0, 0, 0.05)'
            }}
        >
            <SectionSubtitle variant="subtitle1">Mission List</SectionSubtitle>
            <List sx={{ p: 0 }}>
                <StyledListItem 
                    sx={{
                        backgroundColor: (theme) => theme.palette.mode === 'dark' 
                            ? 'rgba(30, 30, 30, 0.6)'
                            : 'rgba(240, 240, 240, 0.6)',
                        '&:hover': {
                            backgroundColor: (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(40, 40, 40, 0.8)'
                                : 'rgba(230, 230, 230, 0.8)'
                        }
                    }}
                >
                    <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#4fc3f7', width: 30, height: 30 }}>
                            <RouteIcon fontSize="small" />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                        primary={
                            <Typography variant="body2" sx={{ 
                                color: (theme) => theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.9)'
                                    : 'rgba(0, 0, 0, 0.9)'
                            }}>
                                {currentMission.name || 'Unnamed Mission'}
                            </Typography>
                        }
                        secondary={
                            <Typography 
                                variant="caption" 
                                component="div"
                                sx={{ 
                                    color: (theme) => theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.6)'
                                        : 'rgba(0, 0, 0, 0.6)', 
                                    fontFamily: '"Roboto Mono", monospace',
                                }}
                            >
                                <strong>UUID:</strong> {currentMission.id}
                                <br />
                                {currentMission.region && (
                                    <>
                                        <strong>Region:</strong> {currentMission.region.name}
                                        <br />
                                    </>
                                )}
                                <strong>Default Alt:</strong> {currentMission.defaultAltitude || 0}m | <strong>Speed:</strong> {currentMission.defaultSpeed || 0}m/s
                                <br />
                                <strong>Created:</strong> {formatDate(currentMission.createdAt)}
                            </Typography>
                        }
                    />
                    <ListItemSecondaryAction sx={{ position: 'relative' }}>
                        {copiedMissionId && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: '100%',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    marginRight: 1,
                                    backgroundColor: (theme) => theme.palette.mode === 'dark'
                                        ? 'rgba(76, 175, 80, 0.9)'
                                        : 'rgba(76, 175, 80, 0.8)',
                                    color: '#fff',
                                    borderRadius: 0.5,
                                    fontSize: '0.7rem',
                                    padding: '2px 6px',
                                    whiteSpace: 'nowrap',
                                    animation: 'fadeIn 0.3s ease-in-out',
                                    '@keyframes fadeIn': {
                                        '0%': { opacity: 0, transform: 'translateY(-50%) translateX(5px)' },
                                        '100%': { opacity: 1, transform: 'translateY(-50%) translateX(0)' },
                                    }
                                }}
                            >
                                Copied!
                            </Box>
                        )}
                        <Tooltip title="Copy Mission UUID">
                            <IconButton
                                edge="end"
                                aria-label="copy-id"
                                onClick={handleCopyMissionId}
                                size="small"
                                sx={{
                                    color: 'rgba(79, 195, 247, 0.7)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(79, 195, 247, 0.15)',
                                        color: '#4fc3f7'
                                    }
                                }}
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </ListItemSecondaryAction>
                </StyledListItem>
            </List>
            
            {pathSegments.length > 0 && (
                <>
                    <Typography 
                        variant="caption" 
                        sx={{ 
                            display: 'block', 
                            color: (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.7)'
                                : 'rgba(0, 0, 0, 0.7)', 
                            mt: 2, 
                            mb: 1,
                            fontWeight: 500
                        }}
                    >
                        Path Segments: {pathSegments.length}
                    </Typography>
                    <Box 
                        sx={{ 
                            backgroundColor: (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(79, 195, 247, 0.1)' 
                                : 'rgba(79, 195, 247, 0.08)',
                            borderRadius: 1, 
                            p: 1, 
                            fontFamily: '"Roboto Mono", monospace',
                            fontSize: '0.75rem',
                            color: (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.7)'
                                : 'rgba(0, 0, 0, 0.7)',
                        }}
                    >
                        {pathSegments.map((segment, idx) => (
                            <Box key={segment.id} sx={{ mb: idx < pathSegments.length - 1 ? 1 : 0 }}>
                                <Typography variant="caption" sx={{ 
                                    color: (theme) => theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.9)'
                                        : 'rgba(0, 0, 0, 0.9)'
                                }}>
                                    {segment.type} ({segment.waypoints?.length || 0} waypoints)
                                </Typography>
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        display: 'block',
                                        color: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.5)'
                                            : 'rgba(0, 0, 0, 0.5)',
                                        fontSize: '0.65rem',
                                        mt: 0.5
                                    }}
                                >
                                    ID: {segment.id ? segment.id.substring(0, 8) : 'N/A'}...
                                </Typography>
                                {idx < pathSegments.length - 1 && (
                                    <Divider sx={{ 
                                        my: 1, 
                                        borderColor: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(0, 0, 0, 0.05)' 
                                    }} />
                                )}
                            </Box>
                        ))}
                    </Box>
                </>
            )}
        </Paper>
    );
};

export default MissionList; 