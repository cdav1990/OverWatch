import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    ToggleButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMission } from '../../../context/MissionContext';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RuleFolderIcon from '@mui/icons-material/RuleFolder';

// Import mission generators
import { 
    ManualGridGenerator, 
    Mission2DGenerator, 
    Mission3DGenerator 
} from './MissionGenerators';

// Import MissionList
import { MissionList } from './MissionList';

// Styled components
const SectionTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 500,
    fontSize: '0.95rem',
    letterSpacing: '0.5px',
    marginBottom: theme.spacing(2),
    color: '#4fc3f7',
    textTransform: 'uppercase',
}));

// Props interface including the new optional prop
interface MissionPlanningStepProps {
    isEmbedded?: boolean;
}

// Apply the props interface
const MissionPlanningStep: React.FC<MissionPlanningStepProps> = ({ isEmbedded = false }) => {
    const { state, dispatch } = useMission();
    const { currentMission, isFaceSelectionModeActive } = state;
    const [expanded, setExpanded] = useState<string | false>(false);

    const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    // --- Handler for Face Selection Toggle --- 
    const handleToggleFaceSelection = () => {
        dispatch({ type: 'TOGGLE_FACE_SELECTION_MODE', payload: !isFaceSelectionModeActive });
    };
    // --- End Handler --- 

    // If embedded, just return the first generator. Otherwise, wrap in Box/Paper with accordions.
    if (isEmbedded) {
        return <ManualGridGenerator isEmbedded={true} />;
    } else {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Mission Generator Tools</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Accordion 
                    expanded={expanded === 'manualGrid'} 
                    onChange={handleAccordionChange('manualGrid')}
                    sx={{ mb: 1 }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="manual-grid-content"
                        id="manual-grid-header"
                    >
                        <Typography variant="subtitle1">Manual Grid</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <ManualGridGenerator />
                    </AccordionDetails>
                </Accordion>
                
                <Accordion 
                    expanded={expanded === '2dMission'} 
                    onChange={handleAccordionChange('2dMission')}
                    sx={{ mb: 1 }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="2d-mission-content"
                        id="2d-mission-header"
                    >
                        <Typography variant="subtitle1">2D Mission</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <ToggleButton
                            value="face-select"
                            selected={isFaceSelectionModeActive}
                            onChange={handleToggleFaceSelection}
                            size="small"
                            sx={{ 
                                mb: 2,
                                textTransform: 'none',
                                color: isFaceSelectionModeActive ? '#4fc3f7' : 'inherit',
                                borderColor: isFaceSelectionModeActive ? '#4fc3f7' : 'inherit',
                                '&.Mui-selected': {
                                    backgroundColor: 'rgba(79, 195, 247, 0.1)',
                                }
                            }}
                        >
                            <RuleFolderIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
                            Select Area Face
                        </ToggleButton>
                        <Mission2DGenerator />
                    </AccordionDetails>
                </Accordion>
                
                <Accordion 
                    expanded={expanded === '3dMission'} 
                    onChange={handleAccordionChange('3dMission')}
                    sx={{ mb: 1 }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="3d-mission-content"
                        id="3d-mission-header"
                    >
                        <Typography variant="subtitle1">3D Mission</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <ToggleButton
                            value="face-select"
                            selected={isFaceSelectionModeActive}
                            onChange={handleToggleFaceSelection}
                            size="small"
                            sx={{ 
                                mb: 2,
                                textTransform: 'none',
                                color: isFaceSelectionModeActive ? '#4fc3f7' : 'inherit',
                                borderColor: isFaceSelectionModeActive ? '#4fc3f7' : 'inherit',
                                '&.Mui-selected': {
                                    backgroundColor: 'rgba(79, 195, 247, 0.1)',
                                }
                            }}
                        >
                            <RuleFolderIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
                            Select Area Face
                        </ToggleButton>
                        <Mission3DGenerator />
                    </AccordionDetails>
                </Accordion>
                
                {/* Add Mission List component */}
                {currentMission && <MissionList />}
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Additional mission generators will be added in future updates.
                </Typography>
            </Box>
        );
    }
};

export default MissionPlanningStep; 