# Mission Planning User Guide

This guide provides step-by-step instructions for creating drone missions using the point selection feature in Overwatch.

## Setting a Point and Creating a Mission

### Step 1: Navigate to the GeoPage

1. Open the Overwatch application
2. Navigate to the GeoPage from the main navigation menu

### Step 2: Select a Point on the Map

1. In the Drawing Tools panel on the right side of the GeoPage, click the **"Set Point"** button
2. Your cursor will change to indicate you're in point selection mode
3. Click on any location on the map to select it as your mission point
4. A confirmation dialog will appear showing:
   - The selected area's coordinates
   - A name field for your mission

### Step 3: Create Your Mission

1. Enter a descriptive name for your mission (e.g., "Downtown Survey 1")
2. Click the **"Create Mission & Plan"** button
3. The system will automatically:
   - Create a new mission
   - Initialize the takeoff point at your selected location
   - Place the first GCP (Ground Control Point) at the same location
   - Navigate you to the Mission Planning page

## Mission Planning with Your Selected Point

### Step 4: Verify Your Takeoff Location

When the Mission Planning page loads:

1. You'll see the 3D view with your drone positioned at the takeoff point (your selected location)
2. The first GCP (GCP-A) will be visible at the same position
3. Additional GCPs (GCP-B and GCP-C) will be placed nearby as reference points

### Step 5: Adjust the Takeoff Position (If Needed)

If you need to fine-tune the takeoff position:

1. Double-click on the drone model in the 3D view
2. The Drone Position Control panel will open
3. Use the coordinate inputs to adjust the position
4. Enable "Camera Follow" if you want the view to follow the drone
5. Click "Close" when finished

### Step 6: Create Your Flight Path

Now that your takeoff point is set:

1. Navigate to the "Flight" tab in the mission workflow
2. Add waypoints by clicking on the terrain
3. Connect waypoints to create flight paths
4. Adjust waypoint properties as needed
5. Use your GCPs as reference points for important locations

### Step 7: Simulate Your Mission

Before finalizing your mission:

1. Click the "Simulate" button in the mission controls
2. Watch as the drone follows your planned flight path
3. Verify that the mission covers all intended areas
4. Make any necessary adjustments to waypoints or paths

## Tips for Effective Point Selection

- **Use Landmarks**: Select points at easily identifiable landmarks for better real-world correlation
- **Consider Takeoff Requirements**: Choose points with sufficient clearance for safe drone takeoff
- **Plan for Visibility**: Select locations where the drone will remain in visual line-of-sight
- **Account for Obstacles**: Be aware of trees, buildings, or other obstacles near your selected point
- **Check Coordinates**: Verify the latitude and longitude match your intended location

## Troubleshooting

### Drone Not Appearing at Expected Location

If the drone doesn't appear where expected in the 3D view:

1. Verify you completed the point selection process in GeoPage
2. Check that the confirmation dialog showed the correct coordinates
3. Try selecting a new point with the "Set Point" tool and creating a new mission

### GCPs Not Visible

If the GCPs aren't visible in the 3D view:

1. Make sure the drone model is visible (it should be at the same location as GCP-A)
2. Check if GCPs are hidden in the visibility settings
3. Zoom out to see if they're placed far from your current view

### Unable to Select a Point

If you can't select a point on the map:

1. Make sure you've clicked the "Set Point" button first
2. Try zooming in for more precise selection
3. Refresh the page and try again
4. Try using the search function to navigate to your desired location first 