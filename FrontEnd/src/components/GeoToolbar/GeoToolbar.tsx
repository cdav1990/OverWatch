import React, { useState } from 'react';
import {
  Box,
  Paper,
  Toolbar,
  Typography,
  TextField,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

// Define props for the component
interface GeoToolbarProps {
  imageryType: string;
  onImageryChange: (newType: string) => void;
  onSearch: (latitude: number, longitude: number) => void;
}

const GeoToolbar: React.FC<GeoToolbarProps> = ({ 
  imageryType, 
  onImageryChange, 
  onSearch 
}) => {
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearchSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!searchText.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    console.log(`[GeoToolbar] Searching Nominatim for: ${searchText.trim()}`);

    const query = encodeURIComponent(searchText.trim());
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

    try {
      const response = await fetch(nominatimUrl, {
        method: 'GET',
        headers: {
          // Consider adding a specific User-Agent for your app if making many requests
          // 'User-Agent': 'OverwatchApp/1.0 (your-contact-email@example.com)'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[GeoToolbar] Nominatim Response:", data);

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        if (!isNaN(lat) && !isNaN(lon)) {
          console.log(`[GeoToolbar] Found location: Lat=${lat}, Lon=${lon}`);
          onSearch(lat, lon);
          setSearchText('');
        } else {
           throw new Error('Invalid coordinates received from Nominatim.');
        }
      } else {
        setSearchError('Location not found.');
        console.warn("[GeoToolbar] Location not found in Nominatim response.");
      }
    } catch (error) {
      console.error("[GeoToolbar] Nominatim search error:", error);
      setSearchError('Search failed. Please try again.');
      if (error instanceof Error) {
        setSearchError(`Search failed: ${error.message}`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageryToggle = (
    event: React.MouseEvent<HTMLElement>,
    newType: string | null, // Can be null if nothing is selected
  ) => {
    if (newType !== null) {
      onImageryChange(newType);
    }
  };

  return (
    <Paper 
      elevation={1} 
      square 
      sx={{ 
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: 'background.paper',
      }}
    >
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
        {/* Search Input */}
        <Box sx={{ display: 'flex', alignItems: 'center' }} component="form" onSubmit={handleSearchSubmit}>
          <TextField 
            variant="outlined"
            size="small"
            placeholder="Search Location..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            error={!!searchError}
            helperText={searchError}
            disabled={isSearching}
            sx={{ 
              mr: 1, 
              width: '250px',
              '& .MuiOutlinedInput-root': {
              },
              '& .MuiFormHelperText-root': {
                mx: '2px',
                fontSize: '0.7rem'
              }
             }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    type="submit" 
                    size="small" 
                    edge="end" 
                    aria-label="search location"
                    disabled={isSearching}
                  >
                    {isSearching ? <CircularProgress size={20} /> : <SearchIcon />} 
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* Map Style Switcher */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ mr: 1, color: 'text.secondary' }}>
            Map Style:
          </Typography>
          <ToggleButtonGroup 
            size="small" 
            value={imageryType} // Use prop value
            exclusive
            onChange={handleImageryToggle} // Use handler
            aria-label="map style"
          >
            <ToggleButton value="aerial">Satellite</ToggleButton>
            <ToggleButton value="streets">Streets</ToggleButton>
            <ToggleButton value="hybrid">Hybrid</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Toolbar>
    </Paper>
  );
};

export default GeoToolbar; 