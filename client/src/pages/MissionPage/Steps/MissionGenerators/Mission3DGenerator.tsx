import React from 'react';
import { 
    TextField, 
    Stack, 
    Button, 
    Typography
} from '@mui/material';
import { useMission } from '../../../../context/MissionContext';

interface Mission3DGeneratorProps {
    isEmbedded?: boolean;
}

const Mission3DGenerator: React.FC<Mission3DGeneratorProps> = ({ isEmbedded = false }) => {
    const { state } = useMission();
    const { currentMission } = state;

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                The 3D blah Mission generator creates paths to cover 3D structures from multiple angles and heights. Select a structure and define coverage parameters.
            </Typography>
            <Button 
                variant="outlined" 
                color="primary"
                disabled={!currentMission}
                fullWidth
            >
                Select 3D Structure
            </Button>
            <TextField 
                label="Min Altitude (AGL, m)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                defaultValue="10"
                InputProps={{ inputProps: { min: 5, step: 1 } }}
            />
            <TextField 
                label="Max Altitude (AGL, m)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                defaultValue="40"
                InputProps={{ inputProps: { min: 10, step: 1 } }}
            />
            <TextField 
                label="Altitude Layers" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                defaultValue="3"
                InputProps={{ inputProps: { min: 1, max: 10, step: 1 } }}
            />
            <TextField 
                label="Structure Distance (m)" 
                variant="outlined" 
                size="small" 
                type="number"
                fullWidth
                defaultValue="15"
                InputProps={{ inputProps: { min: 5, step: 1 } }}
            />
            <Button 
                variant="contained" 
                disabled={!currentMission}
            >
                Generate 3D Mission
            </Button>
        </Stack>
    );
};

export default Mission3DGenerator; 