import { MemoryClient } from '@xtraceai/memory';

import { APP_ID, USER_ID, optionalEnv, requireEnv } from './config';

export type MemoryHit = {
  id: string;
  type?: string;
  text: string;
  fullContent?: string;
  score?: number | null;
  metadata?: Record<string, unknown>;
};

let cachedClient: MemoryClient | undefined;

export function getMemoryClient(): MemoryClient {
  if (!cachedClient) {
    cachedClient = new MemoryClient({
      apiKey: requireEnv('XTRACE_API_KEY'),
      orgId: requireEnv('XTRACE_ORG_ID'),
      baseUrl: optionalEnv('XTRACE_BASE_URL')
    });
  }

  return cachedClient;
}

export async function ingestHomeMemory(input: {
  content: string;
  sourceName?: string;
  sourceType?: string;
  notes?: string;
  page?: number;
}) {
  const client = getMemoryClient();
  const sourceName = input.sourceName ?? 'manual-capture';
  const convId = `capture_${Date.now()}_${slugify(sourceName)}${input.page ? `_p${input.page}` : ''}`;
  const notes = input.notes ? `\n\nHomeowner note: ${input.notes}` : '';
  const page = input.page ? ` page ${input.page}` : '';

  const job = await client.memories.ingest(
    {
      user_id: USER_ID,
      conv_id: convId,
      app_id: APP_ID,
      messages: [
        {
          role: 'user',
          content: [
            `Capture this home document or repair memory from ${sourceName}${page}.`,
            input.content,
            notes
          ]
            .filter(Boolean)
            .join('\n\n')
        },
        {
          role: 'assistant',
          content:
            'Stored as home memory. Preserve exact model numbers, dates, names, symptoms, steps, warnings, and addresses.'
        }
      ],
      metadata: {
        app_id: APP_ID,
        source_name: sourceName,
        source_type: input.sourceType ?? 'text',
        page: input.page
      }
    },
    { wait: true }
  );

  if (job.status === 'failed') {
    throw new Error(job.error?.message ?? 'XTrace ingest failed');
  }

  if (job.status !== 'succeeded') {
    const done = await client.memories.jobs.pollUntilDone(job.id, { timeoutMs: 60_000 });
    if (done.status === 'failed') {
      throw new Error(done.error?.message ?? 'XTrace ingest failed');
    }
    return done.result?.memories_created ?? [];
  }

  return job.result?.memories_created ?? [];
}

export async function searchHomeMemory(query: string, limit = 8): Promise<MemoryHit[]> {
  const client = getMemoryClient();
  const minScore = Number(process.env.HOME_MEMORY_MIN_SCORE ?? '0.35');
  const results = await client.memories.search({
    query,
    filters: {
      user_id: USER_ID,
      app_id: APP_ID
    },
    limit,
    include: ['full_content']
  });

  return results.data
    .map((memory) => ({
      id: memory.id,
      type: memory.type,
      text: memory.text,
      fullContent: getFullContent(memory),
      score: 'score' in memory ? memory.score : undefined,
      metadata: memory.metadata as Record<string, unknown> | undefined
    }))
    .filter((memory) => typeof memory.score !== 'number' || memory.score >= minScore);
}

export async function listHomeMemories(limit = 20): Promise<MemoryHit[]> {
  const client = getMemoryClient();
  const page = await client.memories.listPage({
    user_id: USER_ID,
    app_id: APP_ID,
    limit,
    order: 'created_at_desc'
  });

  return page.data.map((memory) => ({
    id: memory.id,
    type: memory.type,
    text: memory.text,
    fullContent: getFullContent(memory),
    metadata: memory.metadata as Record<string, unknown> | undefined
  }));
}

function getFullContent(memory: unknown): string | undefined {
  const details = (memory as { details?: { full_content?: unknown } }).details;
  return typeof details?.full_content === 'string' ? details.full_content : undefined;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}
