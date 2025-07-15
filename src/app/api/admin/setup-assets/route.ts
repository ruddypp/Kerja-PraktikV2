import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Create directories if they don't exist
const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create a placeholder logo file if it doesn't exist
const createPlaceholderLogo = (filePath: string) => {
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

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const uploadsDir = path.join(publicDir, 'uploads');
    
    // Ensure directories exist
    ensureDirectoryExists(publicDir);
    ensureDirectoryExists(uploadsDir);
    
    // Create placeholder logos if they don't exist
    createPlaceholderLogo(path.join(publicDir, 'logo1.png'));
    createPlaceholderLogo(path.join(publicDir, 'Honeywell-RAE.png'));
    
    return NextResponse.json({ success: true, message: 'Asset setup completed successfully!' });
  } catch (error) {
    console.error('Error setting up assets:', error);
    return NextResponse.json({ success: false, error: 'Failed to set up assets' }, { status: 500 });
  }
} ``