const fs = require('fs');
const path = require('path');

// Create directories if they don't exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create a placeholder logo file if it doesn't exist
const createPlaceholderLogo = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`Creating placeholder logo: ${filePath}`);
    
    // Create a simple SVG logo as a placeholder
    const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
      <rect width="200" height="100" fill="#ffffff" />
      <text x="50%" y="50%" font-family="Arial" font-size="16" text-anchor="middle" dominant-baseline="middle" fill="#000000">
        Paramata Logo
      </text>
    </svg>`;
    
    fs.writeFileSync(filePath, svgContent);
  }
};

// Main function
const setupAssets = () => {
  const publicDir = path.join(process.cwd(), 'public');
  const uploadsDir = path.join(publicDir, 'uploads');
  
  // Ensure directories exist
  ensureDirectoryExists(publicDir);
  ensureDirectoryExists(uploadsDir);
  
  // Create placeholder logos if they don't exist
  createPlaceholderLogo(path.join(publicDir, 'logo1.png'));
  createPlaceholderLogo(path.join(publicDir, 'Honeywell-RAE.png'));
  
  console.log('Asset setup completed successfully!');
};

// Run the setup
setupAssets(); 