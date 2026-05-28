import { NextRequest, NextResponse } from 'next/server';

import { askHomeMemory } from '@/app/lib/agent';
import { captureText } from '@/app/lib/capture';

export const runtime = 'nodejs';

type ChatBody = {
  mode?: 'capture' | 'retrieve';
  message?: string;
  sourceName?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatBody;
    const mode = body.mode ?? 'retrieve';
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (mode === 'capture') {
      const result = await captureText({
        text: message,
        sourceName: body.sourceName ?? 'chat-capture',
        sourceType: 'chat'
      });

      return NextResponse.json({
        answer: `Captured ${result.memoriesCreated} memories from ${result.sourceName}.`,
        memories: []
      });
    }

    const result = await askHomeMemory(message);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
