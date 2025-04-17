/**
 * This script standardizes API routes across the application
 * It ensures all routes use consistent imports, error handling, and response formatting
 * 
 * Common changes:
 * 1. Change imports from { db } to { prisma }
 * 2. Add proper error handling to return empty arrays/objects instead of error messages
 * 3. Convert IDs to strings in responses
 * 4. Add request types to parameters
 * 5. Use enum types from Prisma instead of local redefinitions
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Root directories to process
const API_DIRS = [
  'src/app/api/admin',
  'src/app/api/user'
];

// Patterns to fix
const FIX_PATTERNS = [
  // Fix imports
  { from: /import (\{[^}]*\}) from ['"]next\/server['"];/, to: 'import { NextRequest, NextResponse } from \'next/server\';' },
  { from: /import .* from ['"]@\/lib\/db['"];/, to: 'import { prisma } from \'@/lib/prisma\';' },
  
  // Fix function signatures
  { from: /export async function (GET|POST|PUT|PATCH|DELETE)\(request: Request\)/, to: 'export async function $1(req: NextRequest)' },
  { from: /const \{ searchParams \} = new URL\(request\.url\);/, to: 'const { searchParams } = new URL(req.url);' },
  { from: /const body = await request\.json\(\);/, to: 'const body = await req.json();' },
  
  // Fix DB calls
  { from: /await db\./g, to: 'await prisma.' },
  
  // Fix error responses
  { from: /return NextResponse\.json\(\s*\{\s*error:([^}]*)\}\s*,\s*\{\s*status: 500\s*\}\s*\);/, to: 'console.error(error);\n    // Return empty array to prevent UI crash\n    return NextResponse.json([], { status: 500 });' },
];

/**
 * Check if the file is a route.ts file
 */
function isRouteFile(filePath) {
  return filePath.endsWith('route.ts');
}

/**
 * Process a file to standardize API routes
 */
async function processFile(filePath) {
  try {
    console.log(`Processing ${filePath}...`);
    let content = await readFile(filePath, 'utf8');
    let modified = false;
    
    // Apply fix patterns
    for (const pattern of FIX_PATTERNS) {
      const newContent = content.replace(pattern.from, pattern.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      await writeFile(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath}`);
    } else {
      console.log(`✓ No changes needed for ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

/**
 * Recursively process all files in a directory
 */
async function processDirectory(directory) {
  try {
    const entries = await readdir(directory);
    
    for (const entry of entries) {
      const entryPath = path.join(directory, entry);
      const entryStat = await stat(entryPath);
      
      if (entryStat.isDirectory()) {
        await processDirectory(entryPath);
      } else if (isRouteFile(entryPath)) {
        await processFile(entryPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}:`, error);
  }
}

/**
 * Main function to run the script
 */
async function main() {
  console.log('Starting API routes standardization...');
  
  for (const apiDir of API_DIRS) {
    if (fs.existsSync(apiDir)) {
      await processDirectory(apiDir);
    } else {
      console.warn(`Directory ${apiDir} does not exist.`);
    }
  }
  
  console.log('API routes standardization completed!');
}

// Run the script
main().catch(console.error); 