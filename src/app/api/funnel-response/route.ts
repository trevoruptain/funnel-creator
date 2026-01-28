import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// For production, you'd use a real database like:
// - Supabase
// - Firebase
// - Postgres
// - MongoDB
// etc.

// This is a simple file-based storage for development/demo purposes
const RESPONSES_DIR = path.join(process.cwd(), 'data', 'responses');

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.type) {
      return NextResponse.json(
        { error: 'Missing event type' },
        { status: 400 }
      );
    }

    // Add server timestamp and IP (for geo-targeting analysis)
    const enrichedData = {
      ...data,
      serverTimestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Ensure responses directory exists
    await fs.mkdir(RESPONSES_DIR, { recursive: true });

    // Generate filename based on event type and timestamp
    const filename = `${data.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.json`;
    const filepath = path.join(RESPONSES_DIR, filename);

    // Write to file
    await fs.writeFile(filepath, JSON.stringify(enrichedData, null, 2));

    console.log(`[Funnel Event] ${data.type}:`, {
      funnel_id: data.funnel_id,
      session_id: data.session_id,
      step_id: data.step_id,
      email: data.email ? '***@***.***' : undefined,
    });

    // For 'complete' events, also write a summary file
    if (data.type === 'complete' && data.email) {
      const summaryFilename = `lead_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
      const summaryPath = path.join(RESPONSES_DIR, summaryFilename);
      await fs.writeFile(summaryPath, JSON.stringify(enrichedData, null, 2));
    }

    return NextResponse.json({ success: true, eventId: filename });
  } catch (error) {
    console.error('Error storing funnel response:', error);
    return NextResponse.json(
      { error: 'Failed to store response' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve responses (for admin dashboard)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Filter by event type
    const limit = parseInt(searchParams.get('limit') || '100');

    // Ensure directory exists
    await fs.mkdir(RESPONSES_DIR, { recursive: true });

    // Read all response files
    const files = await fs.readdir(RESPONSES_DIR);
    const jsonFiles = files
      .filter((f) => f.endsWith('.json'))
      .filter((f) => !type || f.startsWith(`${type}_`))
      .sort()
      .reverse()
      .slice(0, limit);

    const responses = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(path.join(RESPONSES_DIR, file), 'utf-8');
        return JSON.parse(content);
      })
    );

    return NextResponse.json({
      count: responses.length,
      responses,
    });
  } catch (error) {
    console.error('Error reading funnel responses:', error);
    return NextResponse.json(
      { error: 'Failed to read responses' },
      { status: 500 }
    );
  }
}
