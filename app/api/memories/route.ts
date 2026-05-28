import { NextResponse } from 'next/server';

import { listHomeMemories } from '@/app/lib/xtrace';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const memories = await listHomeMemories();
    return NextResponse.json({ memories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
