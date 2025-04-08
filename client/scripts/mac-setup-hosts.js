// Simple Node.js script to set up the overwatch.local hostname
import { exec } from 'child_process';
import fs from 'fs';
import readline from 'readline';

const hostname = 'overwatch.local';
const hostsPath = '/etc/hosts';
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

// Main function
async function setupHost() {
  console.log('\n--- OVERWATCH Local Development Host Setup ---\n');
  
  const entryExists = checkHostsFile();
  
  if (entryExists) {
    console.log(`✅ The entry for ${hostname} already exists in your hosts file.`);
    console.log(`👉 You can access the application at http://${hostname}:5173\n`);
    rl.close();
    return;
  }
  
  console.log(`The entry for ${hostname} does not exist in your hosts file.`);
  console.log(`To add it, you need to run the following command with sudo permissions:`);
  console.log(`\n  sudo sh -c 'echo "${hostsEntry}" >> ${hostsPath}'\n`);
  
  rl.question('Would you like to run this command now? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\nRunning command to update hosts file...');
      
      exec(`sudo sh -c 'echo "${hostsEntry}" >> ${hostsPath}'`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          console.log('\nAlternatively, you can run this command manually in your terminal:');
          console.log(`\n  sudo sh -c 'echo "${hostsEntry}" >> ${hostsPath}'\n`);
        } else {
          console.log('✅ Successfully added entry to hosts file!');
          console.log(`👉 You can now access the application at http://${hostname}:5173\n`);
        }
        rl.close();
      });
    } else {
      console.log('\nSetup canceled. You can add the entry manually or run:');
      console.log('\n  npm run setup-host\n');
      rl.close();
    }
  });
}

// Run the setup
setupHost(); 