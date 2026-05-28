import {
  createPartFromBase64,
  createPartFromText,
  createUserContent,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
  type Part
} from '@google/genai';

import { optionalEnv, requireEnv } from './config';
import type { MemoryHit } from './xtrace';

const DEFAULT_AGENT_MODEL = 'gemini-3.5-flash';
const DEFAULT_EXTRACT_MODEL = 'gemini-3.1-flash-lite';

let cachedGenAI: GoogleGenAI | undefined;

export async function extractWithGemini(input: {
  sourceName: string;
  mimeType: string;
  base64?: string;
  text?: string;
  notes?: string;
}): Promise<string> {
  const prompt = [
    'You are digitizing a home memory archive.',
    'Extract every useful detail from this document/media for future Q&A.',
    'Preserve exact model numbers, serial numbers, dates, names, addresses, warnings, troubleshooting steps, and settings.',
    'Return clean markdown. If it is a manual, organize by task: startup, shutdown, reset, maintenance, troubleshooting, safety.',
    input.notes ? `Homeowner note: ${input.notes}` : undefined
  ]
    .filter(Boolean)
    .join('\n');

  const parts: Part[] = [createPartFromText(prompt)];
  if (input.text) {
    parts.push(createPartFromText(`Source text from ${input.sourceName}:\n\n${input.text}`));
  }
  if (input.base64) {
    parts.push(createPartFromBase64(input.base64, input.mimeType));
  }

  return generateText(process.env.GEMINI_EXTRACT_MODEL ?? DEFAULT_EXTRACT_MODEL, parts);
}

export async function answerWithGemini(question: string, memories: MemoryHit[]): Promise<string> {
  if (memories.length === 0) {
    return "I don't know yet. Capture the relevant document, photo, note, or repair steps first, then ask again.";
  }

  const context = memories
    .map((memory, index) => {
      const source = memory.metadata?.source_name ? `Source: ${String(memory.metadata.source_name)}` : 'Source: home memory';
      return `Memory ${index + 1}\n${source}\n${memory.fullContent ?? memory.text}`;
    })
    .join('\n\n---\n\n');

  const prompt = `You are Home Memory, a strict household document assistant.

Rules:
- Answer only from the retrieved home memories below.
- If the answer is not present, say "I don't know yet" and ask the user to capture the missing document.
- Be concise, but include exact steps, model names, dates, and warnings when present.
- Mention the source names that supported the answer.

Retrieved memories:
${context}

Question:
${question}`;

  try {
    return await generateText(process.env.GEMINI_AGENT_MODEL ?? DEFAULT_AGENT_MODEL, [
      createPartFromText(prompt)
    ]);
  } catch {
    const evidence = memories
      .slice(0, 3)
      .map((memory) => {
        const source = memory.metadata?.source_name ? String(memory.metadata.source_name) : 'home memory';
        return `From ${source}: ${memory.fullContent ?? memory.text}`;
      })
      .join('\n\n');

    return `Here is what your home memory says:\n\n${evidence}`;
  }
}

async function generateText(model: string, parts: Part[]): Promise<string> {
  const response = await getGenAI().models.generateContent({
    model,
    contents: [createUserContent(parts)],
    config: {
      temperature: 0.2,
      topP: 0.95,
      seed: 0,
      maxOutputTokens: 8192,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.OFF },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF }
      ],
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MEDIUM
      }
    }
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  return text;
}

function getGenAI(): GoogleGenAI {
  if (!cachedGenAI) {
    const apiKey = optionalEnv('GOOGLE_CLOUD_API_KEY') ?? requireEnv('GEMINI_API_KEY');
    cachedGenAI = new GoogleGenAI({
      vertexai: true,
      apiKey
    });
  }

  return cachedGenAI;
}
