import { NextRequest, NextResponse } from 'next/server';

import { captureFile, captureText } from '@/app/lib/capture';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const notes = String(formData.get('notes') ?? '');
    const text = String(formData.get('text') ?? '').trim();
    const results = [];

    if (text) {
      results.push(
        await captureText({
          text,
          sourceName: String(formData.get('sourceName') ?? 'manual-capture'),
          sourceType: 'text',
          notes
        })
      );
    }

    for (const value of formData.getAll('files')) {
      if (value instanceof File && value.size > 0) {
        results.push(await captureFile(value, notes));
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'Add text or at least one file to capture' }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
