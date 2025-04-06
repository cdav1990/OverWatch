import React from 'react';
import { 
    TextField, 
    Stack, 
    Button, 
    Typography
} from '@mui/material';
import { useMission } from '../../../../context/MissionContext';

interface Mission2DGeneratorProps {
    isEmbedded?: boolean;
}

const Mission2DGenerator: React.FC<Mission2DGeneratorProps> = ({ isEmbedded = false }) => {
    const { state } = useMission();
    const { currentMission } = state;

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                The 2D Mission generator creates paths based on a selected 2D area. Select an area and configure coverage parameters.
            </Typography>
            <Button 
                variant="outlined" 
                color="primary"
                disabled={!currentMission}
                fullWidth
            >
                Select Area on Map
            </Button>
            <TextField 
                label="Altitude (AGL, m)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                defaultValue="20"
                InputProps={{ inputProps: { min: 0, step: 1 } }}
            />
            <TextField 
                label="Coverage Overlap (%)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                defaultValue="70"
                InputProps={{ inputProps: { min: 0, max: 95, step: 5 } }}
            />
            <Button 
                variant="contained" 
                disabled={!currentMission}
            >
                Generate 2D Mission
            </Button>
        </Stack>
    );
};

export default Mission2DGenerator; 