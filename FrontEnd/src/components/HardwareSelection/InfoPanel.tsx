import React, { useMemo } from 'react';
import { Box, Typography, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useMission } from '../../context/MissionContext';
import { 
    calculateFieldOfView, 
    calculateFootprint, 
    getDOFCalculations, 
    calculateGSD, 
    calculateDistanceForGSD,
    metersToFeet,
    getEffectiveFocalLength
} from '../../utils/sensorCalculations';

// Helper component for displaying info items
interface InfoItemProps {
    label: string;
    value: string | number;
}
const InfoItem: React.FC<InfoItemProps> = ({ label, value }) => (
    <Grid item xs={6} sm={4} md={3}> {/* Responsive grid item */} 
        <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
        <Typography variant="body2" component="div">{value}</Typography>
    </Grid>
);

const InfoPanel: React.FC = () => {
    const { state: missionState } = useMission();
    const { hardware } = missionState;
    const camera = hardware?.cameraDetails;
    const lens = hardware?.lensDetails;
    const aperture = hardware?.fStop;
    const focusDistanceM = hardware?.focusDistance;

    // Calculate values using useMemo for efficiency
    const calculatedValues = useMemo(() => {
        if (!camera || !lens || aperture === undefined || focusDistanceM === undefined) {
            return null; // Return null if data is incomplete
        }
        
        const focalLength = getEffectiveFocalLength(lens);
        const hFOV = calculateFieldOfView(focalLength, camera.sensorWidth);
        const vFOV = calculateFieldOfView(focalLength, camera.sensorHeight);
        const footprint = calculateFootprint(focusDistanceM, camera, lens);
        const dof = getDOFCalculations(focusDistanceM, camera, lens, aperture);
        const currentGSD = calculateGSD(focusDistanceM, camera, lens) * 10; // Convert cm/pix to mm/pix
        
        // Calculate distances for target GSDs
        const targetGSDs = [0.25, 0.50, 0.75, 1.00, 1.50, 2.00, 3.00, 5.00];
        const gsdTableData = targetGSDs.map(targetGSDmm => ({
            targetGSD: targetGSDmm.toFixed(2),
            distanceFt: metersToFeet(calculateDistanceForGSD(targetGSDmm, camera, lens)).toFixed(1)
        }));

        return {
            hFOV: hFOV.toFixed(1) + '°',
            vFOV: vFOV.toFixed(1) + '°',
            footprintWidthFt: metersToFeet(footprint.width).toFixed(1) + ' ft',
            footprintHeightFt: metersToFeet(footprint.height).toFixed(1) + ' ft',
            footprintAreaSqFt: metersToFeet(footprint.width * footprint.height).toFixed(1) + ' ft²',
            hyperfocalFt: dof.hyperfocal === Infinity ? '∞' : metersToFeet(dof.hyperfocal).toFixed(1) + ' ft',
            nearLimitFt: metersToFeet(dof.nearLimit).toFixed(1) + ' ft',
            farLimitFt: dof.farLimit === Infinity ? '∞' : metersToFeet(dof.farLimit).toFixed(1) + ' ft',
            totalDOFFt: dof.totalDOF === Infinity ? '∞' : metersToFeet(dof.totalDOF).toFixed(1) + ' ft',
            inFocusRangeText: dof.inFocusRangeText,
            cocMM: dof.circleOfConfusion.toFixed(3) + ' mm',
            focalLengthMM: focalLength.toFixed(0) + ' mm',
            currentGSDmm: currentGSD.toFixed(2) + ' mm/pix',
            gsdTableData
        };
    }, [camera, lens, aperture, focusDistanceM]);

    if (!calculatedValues) {
        return (
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="caption" color="text.secondary">
                    Select Camera, Lens, Aperture, and Focus Distance to see calculations.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.secondary' }}>
                Calculated Information
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 2 }}> {/* Main info grid */} 
                <InfoItem label="Horiz. FOV" value={calculatedValues.hFOV} />
                <InfoItem label="Vert. FOV" value={calculatedValues.vFOV} />
                <InfoItem label="Coverage Width" value={calculatedValues.footprintWidthFt} />
                <InfoItem label="Coverage Height" value={calculatedValues.footprintHeightFt} />
                <InfoItem label="Coverage Area" value={calculatedValues.footprintAreaSqFt} />
                <InfoItem label="Focal Length Used" value={calculatedValues.focalLengthMM} />
                <InfoItem label="Hyperfocal Dist." value={calculatedValues.hyperfocalFt} />
                <InfoItem label="Near Limit" value={calculatedValues.nearLimitFt} />
                <InfoItem label="Far Limit" value={calculatedValues.farLimitFt} />
                <InfoItem label="Total DOF" value={calculatedValues.totalDOFFt} />
                <InfoItem label="In Focus Range" value={calculatedValues.inFocusRangeText} />
                <InfoItem label="Circle of Confusion" value={calculatedValues.cocMM} />
                 <InfoItem 
                    label={`GSD @ ${metersToFeet(focusDistanceM || 0).toFixed(0)} ft`} 
                    value={calculatedValues.currentGSDmm} 
                />
            </Grid>
            
            {/* GSD Reference Table */} 
            <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.secondary', mt: 1 }}>
                Target GSD Reference
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '150px' }}> {/* Limit height */} 
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Target GSD (mm/pix)</TableCell>
                            <TableCell align="right">Distance (ft)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {calculatedValues.gsdTableData.map((row) => (
                            <TableRow key={row.targetGSD}>
                                <TableCell component="th" scope="row">
                                    {row.targetGSD}
                                </TableCell>
                                <TableCell align="right">{row.distanceFt}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default InfoPanel; 