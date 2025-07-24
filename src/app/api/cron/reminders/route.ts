import { NextResponse } from 'next/server';
import { checkDueReminders } from '@/lib/reminder-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // console.log('Cron job for checking reminders triggered');
    
    // Check for API key in header for security
    const apiKey = request.headers.get('x-api-key');
    const configApiKey = process.env.CRON_API_KEY;
    
    // Get the force parameter to bypass time restrictions if needed
    const { searchParams } = new URL(request.url);
    const forceCheck = searchParams.get('force') === 'true';
    
    // In development mode, allow without API key
    const isDev = process.env.NODE_ENV === 'development';
    
    // If API key is configured and we're not in dev mode, validate it
    if (configApiKey && !isDev && apiKey !== configApiKey) {
      // console.log('Unauthorized access to cron job - invalid API key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Process due reminders - always run without time restrictions
    // console.log(`Processing due reminders...`);
    
    const results = await checkDueReminders({ forceAll: forceCheck });
    // console.log(`Processed ${results.length} due reminders`);
    
    // Count actual created notifications vs skipped ones
    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    // Group results by reminder type for better reporting
    const resultsByType = results.reduce((acc: Record<string, any[]>, result) => {
      const type = result.reminderType || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(result);
      return acc;
    }, {});
    
    // Group by skip reason if any
    const skipReasons = results
      .filter(r => r.status === 'skipped' && r.reason)
      .reduce((acc: Record<string, number>, result) => {
        const reason = result.reason || 'unknown';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      created,
      skipped,
      errors,
      skipReasons,
      timestamp: new Date().toISOString(),
      forceCheck,
      resultsByType,
      results,
    });
  } catch (error) {
    console.error('Error processing reminders cron:', error);
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json({ 
      error: 'Failed to process reminders',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 