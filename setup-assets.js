/**
 * setup-assets.js
 * 
 * This script handles setting up assets for the Paramata application.
 * It creates necessary directories and copies required assets if needed.
 */

import fs from 'fs';
import path from 'path';

// Define directories to create if they don't exist
const directories = [
  'public/assets',
  'public/uploads',
  'public/reports'
];

// Create directories if they don't exist
directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dirPath, { recursive: true });
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
});

console.log('Asset setup completed successfully.'); 