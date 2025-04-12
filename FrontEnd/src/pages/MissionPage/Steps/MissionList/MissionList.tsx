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
    Divider,
    FormControlLabel,
    Checkbox,
    Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMission } from '../../../../context/MissionContext';
import RouteIcon from '@mui/icons-material/Route';
import DeleteIcon from '@mui/icons-material/Delete';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import TimerIcon from '@mui/icons-material/Timer';
import StraightenIcon from '@mui/icons-material/Straighten';
import { calculateSegmentDistance, countPhotosInSegment, calculateSegmentTime, formatTimeMMSS } from '../../../../utils/pathUtils';
import { metersToFeet } from '../../../../utils/sensorCalculations';

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
    const { state, dispatch } = useMission();
    const { currentMission, selectedPathSegmentIds } = state;

    // Format date helper function
    const formatDate = (date: Date | string | undefined) => {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    // --- Handler for Path Segment Checkbox Change --- 
    const handleSegmentToggle = (segmentId: string) => {
        dispatch({ type: 'TOGGLE_PATH_SEGMENT_SELECTION', payload: segmentId });
    };
    // --- End Handler ---

    // --- Handler for Deleting Path Segment ---
    const handleDeleteSegment = (segmentId: string) => {
        // Optional: Add confirmation dialog here
        console.log(`Dispatching DELETE_PATH_SEGMENT for ID: ${segmentId}`);
        dispatch({ type: 'DELETE_PATH_SEGMENT', payload: segmentId });
    };
    // --- End Handler ---

    if (!currentMission) return null;
    
    const pathSegments = currentMission.pathSegments || [];
    
    return (
        <Paper 
            variant="outlined" 
            sx={{ 
                p: 1.5,
                mt: 2,
                mb: 2,
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
            <SectionSubtitle variant="subtitle1" sx={{ mb: 1.5 }}>
                Current Mission
            </SectionSubtitle>
            <Box 
                 sx={{
                    pl: 1,
                    mb: 2,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' 
                        ? 'rgba(30, 30, 30, 0.4)'
                        : 'rgba(240, 240, 240, 0.4)',
                    borderRadius: '4px',
                    pb: 0.5
                 }}
            >
                <ListItemText
                    primary={
                        <Typography variant="body1" sx={{
                            fontWeight: 500,
                            color: (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.95)'
                                : 'rgba(0, 0, 0, 0.9)',
                            pt: 1
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
                                fontSize: '0.7rem',
                                lineHeight: 1.3,
                                mt: 0.25
                            }}
                        >
                            ID: {currentMission.id} <br />
                            {currentMission.region && (
                                <>Region: {currentMission.region.name}<br /></>
                            )}
                            Created: {formatDate(currentMission.createdAt)}
                        </Typography>
                    }
                    sx={{ my: 0 }}
                />
            </Box>
            
            {pathSegments.length > 0 && (
                <>
                    <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                    <SectionSubtitle variant="subtitle1">Path Segments</SectionSubtitle>
                    <List sx={{ p: 0 }}>
                        {pathSegments.map((segment) => {
                            const distanceMeters = calculateSegmentDistance(segment.waypoints);
                            const distanceFeet = metersToFeet(distanceMeters);
                            const photoCount = countPhotosInSegment(segment.waypoints);
                            const timeSeconds = calculateSegmentTime(distanceMeters, segment.speed, currentMission.defaultSpeed);
                            const timeFormatted = formatTimeMMSS(timeSeconds);

                            return (
                                <StyledListItem 
                                    key={segment.id}
                                    sx={{ 
                                        mb: 1,
                                        pl: 1,
                                        backgroundColor: (theme) => theme.palette.mode === 'dark' 
                                            ? 'rgba(30, 30, 30, 0.6)'
                                            : 'rgba(240, 240, 240, 0.6)',
                                        '&:hover': {
                                            backgroundColor: (theme) => theme.palette.mode === 'dark'
                                                ? 'rgba(40, 40, 40, 0.8)'
                                                : 'rgba(230, 230, 230, 0.8)'
                                        }
                                    }}
                                    secondaryAction={ 
                                        <Tooltip title="Delete Path Segment">
                                            <IconButton 
                                                edge="end" 
                                                aria-label="delete segment"
                                                onClick={() => handleDeleteSegment(segment.id)}
                                                size="small"
                                                sx={{
                                                    color: 'rgba(255, 100, 100, 0.7)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 100, 100, 0.15)',
                                                        color: '#ff6464'
                                                    }
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                >
                                    <FormControlLabel
                                         sx={{ flexGrow: 1, mr: 4 }}
                                         control={
                                             <Checkbox 
                                                 checked={selectedPathSegmentIds.includes(segment.id)}
                                                 onChange={() => handleSegmentToggle(segment.id)}
                                                 size="small"
                                                 sx={{
                                                     color: 'rgba(255, 255, 255, 0.6)',
                                                     '&.Mui-checked': {
                                                         color: '#4fc3f7',
                                                     },
                                                     padding: '4px 8px 4px 4px'
                                                 }}
                                             />
                                         }
                                         label={
                                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                <Typography variant="body2" sx={{ 
                                                    color: (theme) => theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 255, 255, 0.9)'
                                                        : 'rgba(0, 0, 0, 0.9)',
                                                    lineHeight: 1.2
                                                }}>
                                                    {segment.type || 'Path'} ({segment.waypoints?.length || 0} waypoints)
                                                </Typography>
                                                <Stack 
                                                    direction="row" 
                                                    spacing={1.5} 
                                                    alignItems="center" 
                                                    sx={{ 
                                                        color: (theme) => theme.palette.mode === 'dark'
                                                            ? 'rgba(255, 255, 255, 0.6)'
                                                            : 'rgba(0, 0, 0, 0.6)',
                                                        mt: 0.5
                                                    }}
                                                >
                                                    <Tooltip title="Distance">
                                                        <Stack direction="row" alignItems="center" spacing={0.3}>
                                                            <StraightenIcon sx={{ fontSize: '0.8rem' }} />
                                                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                                                {distanceFeet.toFixed(0)} ft
                                                            </Typography>
                                                        </Stack>
                                                    </Tooltip>
                                                    <Tooltip title="Est. Time">
                                                        <Stack direction="row" alignItems="center" spacing={0.3}>
                                                            <TimerIcon sx={{ fontSize: '0.8rem' }} />
                                                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                                                {timeFormatted}
                                                            </Typography>
                                                        </Stack>
                                                    </Tooltip>
                                                    <Tooltip title="Photos">
                                                        <Stack direction="row" alignItems="center" spacing={0.3}>
                                                            <CameraAltIcon sx={{ fontSize: '0.8rem' }} />
                                                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                                                {photoCount}
                                                            </Typography>
                                                        </Stack>
                                                    </Tooltip>
                                                </Stack>
                                                <Typography 
                                                    variant="caption" 
                                                    sx={{ 
                                                        color: (theme) => theme.palette.mode === 'dark'
                                                            ? 'rgba(255, 255, 255, 0.5)'
                                                            : 'rgba(0, 0, 0, 0.5)',
                                                        fontSize: '0.65rem',
                                                        fontFamily: '"Roboto Mono", monospace',
                                                        lineHeight: 1.1,
                                                        mt: 0.5
                                                    }}
                                                >
                                                    ID: {segment.id ? segment.id.substring(0, 8) : 'N/A'}...
                                                </Typography>
                                            </Box>
                                         }
                                     />
                                </StyledListItem>
                            );
                        })}
                    </List>
                </>
            )}
        </Paper>
    );
};

export default MissionList; 