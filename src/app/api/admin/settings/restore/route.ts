import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Fungsi helper untuk mencatat aktivitas ke history
async function logActivity(userId: string, action: string, details: string) {
  try {
    await prisma.activityLog.create({
      data: {
        type: 'USER_UPDATED', // Menggunakan type yang ada
        action: action,
        details: details,
        userId: userId,
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting database restore process...');
    
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      console.log('❌ Unauthorized restore attempt');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    console.log(`✅ Admin ${user.email} authorized for restore`);

    // Parse form data
    const formData = await request.formData();
    const sqlFile = formData.get('sqlFile') as File;

    if (!sqlFile) {
      return NextResponse.json({ 
        success: false, 
        error: 'No SQL file provided' 
      }, { status: 400 });
    }

    // Validate file
    if (!sqlFile.name.endsWith('.sql')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only .sql files are allowed' 
      }, { status: 400 });
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (sqlFile.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File size too large. Maximum 100MB allowed' 
      }, { status: 400 });
    }

    console.log(`📁 Processing SQL file: ${sqlFile.name} (${(sqlFile.size / 1024 / 1024).toFixed(2)} MB)`);

    // Create temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save uploaded file to temporary location
    const tempFileName = `restore_${uuidv4()}.sql`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    const arrayBuffer = await sqlFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);

    console.log(`💾 SQL file saved to: ${tempFilePath}`);

    // Database connection details from environment
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'paramata_db';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'ganteng';

    // Construct psql command for restore
    const psqlCommand = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${tempFilePath}"`;
    
    console.log(`🔧 Executing psql restore command...`);
    console.log(`📋 Command: psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f [file]`);

    try {
      // Set PGPASSWORD environment variable for authentication
      const env = { ...process.env };
      if (dbPassword) {
        env.PGPASSWORD = dbPassword;
      }

      // Execute psql restore command
      const { stdout, stderr } = await execAsync(psqlCommand, {
        env,
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      console.log('✅ Restore command executed successfully');
      
      if (stdout) {
        console.log('📤 STDOUT:', stdout);
      }
      
      if (stderr) {
        console.log('⚠️ STDERR:', stderr);
        // Note: psql often outputs informational messages to stderr, so we don't treat this as an error
      }

      // Clean up temporary file
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🗑️ Temporary file cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temporary file:', cleanupError);
      }

      // Log aktivitas restore berhasil
      await logActivity(
        user.id,
        'Database Restore',
        `Admin ${user.name} berhasil melakukan restore database dari file ${sqlFile.name} (${(sqlFile.size / 1024 / 1024).toFixed(2)} MB)`
      );

      return NextResponse.json({
        success: true,
        message: 'Database restore completed successfully',
        details: {
          fileName: sqlFile.name,
          fileSize: `${(sqlFile.size / 1024 / 1024).toFixed(2)} MB`,
          restoredAt: new Date().toISOString(),
          stdout: stdout || 'No output',
          stderr: stderr || 'No errors'
        }
      });

    } catch (execError: any) {
      console.error('❌ Restore execution failed:', execError);
      
      // Clean up temporary file even on error
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temporary file after error:', cleanupError);
      }

      // Parse error message
      let errorMessage = 'Database restore failed';
      if (execError.message) {
        if (execError.message.includes('password authentication failed')) {
          errorMessage = 'Database authentication failed. Check database credentials.';
        } else if (execError.message.includes('could not connect')) {
          errorMessage = 'Could not connect to database. Check database connection.';
        } else if (execError.message.includes('does not exist')) {
          errorMessage = 'Database or table does not exist.';
        } else if (execError.message.includes('permission denied')) {
          errorMessage = 'Permission denied. Check database user permissions.';
        } else {
          errorMessage = `Restore failed: ${execError.message}`;
        }
      }

      // Log aktivitas restore gagal
      await logActivity(
        user.id,
        'Database Restore',
        `Admin ${user.name} gagal melakukan restore database dari file ${sqlFile.name}. Error: ${errorMessage}`
      );

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: {
          fileName: sqlFile.name,
          error: execError.message,
          stdout: execError.stdout || '',
          stderr: execError.stderr || ''
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Restore process error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error during restore',
      details: {
        timestamp: new Date().toISOString(),
        error: error.toString()
      }
    }, { status: 500 });
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed. Use POST to restore database.' 
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ 
    error: 'Method not allowed. Use POST to restore database.' 
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ 
    error: 'Method not allowed. Use POST to restore database.' 
  }, { status: 405 });
}