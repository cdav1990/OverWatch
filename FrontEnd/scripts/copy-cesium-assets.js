const fs = require('fs-extra');
const path = require('path');

// Destination directory for Cesium assets
const destDir = path.resolve(__dirname, '../public/cesium');
// Source directory from node_modules
const sourceDir = path.resolve(__dirname, '../node_modules/cesium/Build/Cesium');

console.log('Copying Cesium assets from:', sourceDir);
console.log('To:', destDir);

// Ensure the destination directory exists
fs.ensureDirSync(destDir);

// Copy all files from Cesium Build directory to public folder
fs.copySync(sourceDir, destDir, { overwrite: true });

console.log('Cesium assets copied successfully!'); 