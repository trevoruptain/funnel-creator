import { db } from '@/db';
import { metaExports } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { parseMetaExport } from '@/lib/parse-meta-export';
import { desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const [latest] = await db
      .select({ uploadedAt: metaExports.uploadedAt, parsedData: metaExports.parsedData })
      .from(metaExports)
      .orderBy(desc(metaExports.uploadedAt))
      .limit(1);

    if (!latest) {
      return NextResponse.json({ data: null, uploadedAt: null });
    }

    return NextResponse.json({
      data: latest.parsedData as Record<string, number>,
      uploadedAt: latest.uploadedAt,
    });
  } catch (error) {
    console.error('Meta export GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Upload an .xlsx file.' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'File must be an Excel (.xlsx or .xls) file.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = parseMetaExport(buffer);

    await db.insert(metaExports).values({
      parsedData: parsed as unknown as Record<string, unknown>,
    });

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse Meta export';
    console.error('Meta export POST error:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
