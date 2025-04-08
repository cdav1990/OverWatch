// Windows-specific script to set up the overwatch.local hostname
const { exec } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const os = require('os');

// Windows hosts file path
const hostsPath = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts');
const hostname = 'overwatch.local';
const hostsEntry = `127.0.0.1 ${hostname}`;

// Function to check if entry exists
function checkHostsFile() {
  try {
    const hostsContent = fs.readFileSync(hostsPath, 'utf8');
    const lines = hostsContent.split('\n');
    return lines.some(line => 
      line.trim() === hostsEntry || 
      line.match(new RegExp(`^127\\.0\\.0\\.1\\s+${hostname}\\s*$`))
    );
  } catch (err) {
    console.error(`Error reading hosts file: ${err.message}`);
    return false;
  }
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to add hosts entry
function addHostsEntry() {
  console.log('\nAttempting to add entry to hosts file...');
  
  // Check if we can write to the file directly (unlikely on Windows without admin rights)
  try {
    fs.appendFileSync(hostsPath, `\n${hostsEntry}`);
    console.log('✅ Successfully added entry to hosts file!');
    console.log(`👉 You can now access the application at http://${hostname}:5173\n`);
    return true;
  } catch (err) {
    // Need admin privileges
    console.log('Unable to write to hosts file directly. Admin privileges required.');
    return false;
  }
}

// Function to create a batch file for admin execution
function createBatchFile() {
  const batchContent = `@echo off
echo Adding ${hostname} to hosts file...
echo ${hostsEntry} >> "${hostsPath}"
echo Done! Press any key to exit.
pause > nul
`;

  const batchPath = path.join(os.tmpdir(), 'overwatch-hosts-setup.bat');
  
  try {
    fs.writeFileSync(batchPath, batchContent);
    console.log(`Created temporary batch file at: ${batchPath}`);
    console.log('\nPlease right-click this file and select "Run as administrator"');
    console.log(`After running, you can access the application at http://${hostname}:5173\n`);
    
    // Open the folder containing the batch file
    exec(`explorer ${path.dirname(batchPath)}`);
    
    return batchPath;
  } catch (err) {
    console.error(`Error creating batch file: ${err.message}`);
    return null;
  }
}

// Main function
async function setupHost() {
  console.log('\n--- OVERWATCH Local Development Host Setup (Windows) ---\n');
  
  const entryExists = checkHostsFile();
  
  if (entryExists) {
    console.log(`✅ The entry for ${hostname} already exists in your hosts file.`);
    console.log(`👉 You can access the application at http://${hostname}:5173\n`);
    rl.close();
    return;
  }
  
  console.log(`The entry for ${hostname} does not exist in your hosts file.`);
  
  rl.question('Would you like to attempt adding it now? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const success = addHostsEntry();
      
      if (!success) {
        console.log('\nCreating a batch file that you can run as administrator...');
        createBatchFile();
      }
    } else {
      console.log('\nSetup canceled.');
      console.log(`To add the entry manually, open ${hostsPath} as administrator`);
      console.log(`and add this line: ${hostsEntry}\n`);
    }
    
    rl.close();
  });
}

// Run the setup
setupHost(); 