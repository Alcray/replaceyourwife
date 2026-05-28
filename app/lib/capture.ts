import { extractWithGemini } from './gemini';
import { ingestHomeMemory } from './xtrace';

export type CaptureResult = {
  sourceName: string;
  extractedText: string;
  memoriesCreated: number;
};

const TEXT_MIME_TYPES = new Set(['text/plain', 'text/markdown', 'application/json']);

export async function captureText(input: {
  text: string;
  sourceName?: string;
  sourceType?: string;
  notes?: string;
  page?: number;
}): Promise<CaptureResult> {
  const extractedText = input.text.trim();
  if (!extractedText) {
    throw new Error('Nothing to capture');
  }

  const created = await ingestHomeMemory({
    content: extractedText,
    sourceName: input.sourceName,
    sourceType: input.sourceType ?? 'text',
    notes: input.notes,
    page: input.page
  });

  return {
    sourceName: input.sourceName ?? 'manual-capture',
    extractedText,
    memoriesCreated: created.length
  };
}

export async function captureFile(file: File, notes?: string): Promise<CaptureResult> {
  const mimeType = file.type || guessMimeType(file.name);
  const sourceName = file.name || 'uploaded-file';
  const buffer = Buffer.from(await file.arrayBuffer());
  const sourceType = mimeType.split('/')[0] || 'file';

  let extractedText: string;
  if (TEXT_MIME_TYPES.has(mimeType)) {
    extractedText = buffer.toString('utf8');
  } else {
    extractedText = await extractWithGemini({
      sourceName,
      mimeType,
      base64: buffer.toString('base64'),
      notes
    });
  }

  const created = await ingestHomeMemory({
    content: extractedText,
    sourceName,
    sourceType,
    notes
  });

  return {
    sourceName,
    extractedText,
    memoriesCreated: created.length
  };
}

function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.json')) return 'application/json';
  return 'text/plain';
}
