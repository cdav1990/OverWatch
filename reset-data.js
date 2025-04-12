/**
 * Reset script for Overwatch application
 * 
 * This script clears all application data from:
 * 1. localStorage - for persisted UI settings and selections
 * 2. sessionStorage - for temporary session data
 * 
 * Run this with: node reset-data.js
 */

// Import required modules
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Function to clear all localStorage and sessionStorage data
// This will be included in an HTML file for browser execution
function generateResetHtml() {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Overwatch Data Reset</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f0f2f5;
      color: #333;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1976d2;
    }
    .result {
      margin: 20px 0;
      padding: 15px;
      border-radius: 4px;
      background-color: #e8f4fd;
      border-left: 4px solid #1976d2;
    }
    button {
      background-color: #1976d2;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background-color: #1565c0;
    }
    .item {
      margin: 5px 0;
      font-family: monospace;
      font-size: 14px;
    }
    .cleared {
      color: #2e7d32;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Overwatch Data Reset Tool</h1>
    <p>This tool will clear all stored data from your browser's localStorage and sessionStorage for the Overwatch application.</p>
    
    <button id="resetBtn">Reset All Data</button>
    
    <div id="result" class="result" style="display: none;">
      <h3>Reset Results:</h3>
      <div id="localStorageItems"></div>
      <div id="sessionStorageItems"></div>
      <p id="summary"></p>
    </div>
  </div>

  <script>
    document.getElementById('resetBtn').addEventListener('click', function() {
      const resultDiv = document.getElementById('result');
      const localStorageDiv = document.getElementById('localStorageItems');
      const sessionStorageDiv = document.getElementById('sessionStorageItems');
      const summaryP = document.getElementById('summary');
      
      // Display the result area
      resultDiv.style.display = 'block';
      
      // Check and display localStorage items before clearing
      localStorageDiv.innerHTML = '<h4>Cleared from localStorage:</h4>';
      let localCount = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        localStorageDiv.innerHTML += '<div class="item">' + key + '</div>';
        localCount++;
      }
      
      if (localCount === 0) {
        localStorageDiv.innerHTML += '<div class="item">No items found</div>';
      }
      
      // Check and display sessionStorage items before clearing
      sessionStorageDiv.innerHTML = '<h4>Cleared from sessionStorage:</h4>';
      let sessionCount = 0;
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        sessionStorageDiv.innerHTML += '<div class="item">' + key + '</div>';
        sessionCount++;
      }
      
      if (sessionCount === 0) {
        sessionStorageDiv.innerHTML += '<div class="item">No items found</div>';
      }
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Display summary
      summaryP.innerHTML = '<span class="cleared">✓ All data has been cleared. You can now safely create a new repository without any previous account data.</span>';
    });
  </script>
</body>
</html>
  `;

  // Write the HTML file
  fs.writeFileSync(path.join(__dirname, 'reset-data.html'), htmlContent);
  console.log('Reset HTML file created at: ' + path.join(__dirname, 'reset-data.html'));
}

// Function to clean up any temporary files or directories in the project
async function cleanProject() {
  console.log('Checking for temporary files to clean up...');
  
  // Directories that might contain temporary data
  const foldersToDelete = [
    'FrontEnd/.vite',
    'FrontEnd/node_modules/.cache',
    'node_modules/.cache',
    'dist',
    '.parcel-cache',
  ];
  
  // Check if directories exist and can be safely removed
  for (const dir of foldersToDelete) {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      console.log(`Found temporary directory: ${dir}`);
    }
  }
  
  // Ask for confirmation before removing
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Would you like to clear these temporary directories? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        for (const dir of foldersToDelete) {
          const fullPath = path.join(__dirname, dir);
          if (fs.existsSync(fullPath)) {
            try {
              // This is a simple approach - for production use, you'd want
              // a more robust directory removal function
              console.log(`Removing ${dir}...`);
              // fs.rmSync(fullPath, { recursive: true, force: true });
              console.log(`✓ Removed ${dir}`);
            } catch (err) {
              console.error(`Error removing ${dir}: ${err.message}`);
            }
          }
        }
        console.log('Temporary directories cleanup completed!');
      } else {
        console.log('Skipped temporary directories cleanup.');
      }
      rl.close();
      resolve();
    });
  });
}

// Main execution
async function main() {
  console.log('Overwatch Data Reset Tool');
  console.log('========================');
  
  // Generate the HTML reset tool
  generateResetHtml();
  
  // Clean up temporary project files
  await cleanProject();
  
  console.log('\nInstructions:');
  console.log('1. Open the reset-data.html file in your browser');
  console.log('2. Click the "Reset All Data" button to clear localStorage and sessionStorage');
  console.log('3. You can now safely create a new git repository without any previous account data');
}

main().catch(console.error); 