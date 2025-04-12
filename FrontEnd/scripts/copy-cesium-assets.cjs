const fs = require('fs-extra');
const path = require('path');

// Destination directory for Cesium assets
const destDir = path.resolve(__dirname, '../public/cesium');
// Source directory from node_modules
const sourceDir = path.resolve(__dirname, '../node_modules/cesium/Build/Cesium');

// Check if destination directory exists and contains Cesium assets
function cesiumAssetsExist() {
  try {
    if (!fs.existsSync(destDir)) {
      return false;
    }
    
    // Check for key files to verify assets are complete
    const keyCesiumFiles = ['Cesium.js', 'index.js', 'index.cjs'];
    const keyDirectories = ['Assets', 'Widgets', 'Workers', 'ThirdParty'];
    
    for (const file of keyCesiumFiles) {
      if (!fs.existsSync(path.join(destDir, file))) {
        return false;
      }
    }
    
    for (const dir of keyDirectories) {
      if (!fs.existsSync(path.join(destDir, dir))) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking Cesium assets:', error);
    return false;
  }
}

// Only copy assets if they don't exist
if (!cesiumAssetsExist()) {
  console.log('Copying Cesium assets from:', sourceDir);
  console.log('To:', destDir);
  
  // Ensure the destination directory exists
  fs.ensureDirSync(destDir);
  
  // Copy all files from Cesium Build directory to public folder
  fs.copySync(sourceDir, destDir, { overwrite: true });
  
  console.log('Cesium assets copied successfully!');
} else {
  console.log('Cesium assets already exist, skipping copy operation.');
} 