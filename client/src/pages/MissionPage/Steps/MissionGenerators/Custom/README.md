# Custom Mission Generators

This directory is for custom mission generators that can be added to the MissionPlanningStep component.

## How to Create a Custom Generator

1. Create a new file for your generator component (e.g., `CustomPatternGenerator.tsx`)
2. Implement the generator component with props similar to the standard generators
3. Export your component in an `index.ts` file
4. Import and add your generator to the MissionPlanningStep component

## Template

```tsx
import React from 'react';
import { 
    TextField, 
    Stack, 
    Button, 
    Typography
} from '@mui/material';
import { useMission } from '../../../../../context/MissionContext';

interface CustomGeneratorProps {
    isEmbedded?: boolean;
}

const CustomGenerator: React.FC<CustomGeneratorProps> = ({ isEmbedded = false }) => {
    const { state, dispatch } = useMission();
    const { currentMission } = state;

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Custom generator description
            </Typography>
            {/* Your generator UI here */}
            <Button 
                variant="contained" 
                disabled={!currentMission}
            >
                Generate Custom Mission
            </Button>
        </Stack>
    );
};

export default CustomGenerator;
``` 