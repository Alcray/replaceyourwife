import 'dotenv/config';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFParse } from 'pdf-parse';

import { captureText } from '../app/lib/capture';

const DEMO_PDF_URL =
  'https://www.aromaco.com/wp-content/uploads/2022/04/AWK-151B_A1_0019-SM.pdf?srsltid=AfmBOoo5E6gsnnJb59Co4gpXpACgVPu24zkzbbeCNtw1Inam7P_aKVbv&utm_source=chatgpt.com';
const DEMO_DIR = path.join(process.cwd(), 'public', 'demo');
const DEMO_PDF_PATH = path.join(DEMO_DIR, 'aroma-awk-151b-manual.pdf');
const DEMO_KETTLE_NOTES_PATH = path.join(DEMO_DIR, 'aroma-kettle-demo-notes.md');
const DEMO_MEDICAL_RECORD_PATH = path.join(DEMO_DIR, 'patient-medical-record.md');

async function main() {
  await mkdir(DEMO_DIR, { recursive: true });
  await ensureDemoPdf();

  const file = await readFile(DEMO_PDF_PATH);
  const parser = new PDFParse({ data: new Uint8Array(file) });
  const parsed = await parser.getText();
  await parser.destroy();
  const pages = splitIntoDemoPages(parsed.text);

  console.log(`Ingesting ${pages.length} page chunk(s) from ${DEMO_PDF_PATH}`);
  for (const [index, pageText] of pages.entries()) {
    const result = await captureText({
      text: pageText,
      sourceName: 'Aroma AWK-151B electric kettle manual',
      sourceType: 'pdf',
      page: index + 1,
      notes: 'Demo appliance manual for hackathon home memory retrieval.'
    });
    console.log(`Page ${index + 1}: ${result.memoriesCreated} memories`);
  }

  const kettleNotes = await readFile(DEMO_KETTLE_NOTES_PATH, 'utf8');
  const kettleNotesResult = await captureText({
    text: kettleNotes,
    sourceName: 'Aroma AWK-151B electric kettle demo notes',
    sourceType: 'markdown',
    notes: 'Curated demo notes from the manual for reliable hackathon retrieval.'
  });
  console.log(`Kettle demo notes: ${kettleNotesResult.memoriesCreated} memories`);

  const medicalRecord = await readFile(DEMO_MEDICAL_RECORD_PATH, 'utf8');
  const medicalResult = await captureText({
    text: medicalRecord,
    sourceName: 'ACME Hospital patient medical record',
    sourceType: 'markdown',
    notes: 'Demo medical record from supplied screenshots.'
  });
  console.log(`Medical record: ${medicalResult.memoriesCreated} memories`);

  console.log('Done. Try asking: "How do I clean or reset the Aroma kettle?"');
  console.log('Or ask: "What is Vernice Moorhouse not immune to?"');
}

async function ensureDemoPdf() {
  try {
    await readFile(DEMO_PDF_PATH);
    return;
  } catch {
    const response = await fetch(DEMO_PDF_URL);
    if (!response.ok) {
      throw new Error(`Failed to download demo PDF: ${response.status}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(DEMO_PDF_PATH, bytes);
  }
}

function splitIntoDemoPages(text: string): string[] {
  const clean = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

  const chunks = clean.split(/\n(?=\d+\s*$)/g).filter((chunk) => chunk.length > 400);
  if (chunks.length > 1) return chunks;

  const size = 4_000;
  const fallback = [];
  for (let index = 0; index < clean.length; index += size) {
    fallback.push(clean.slice(index, index + size));
  }
  return fallback.filter(Boolean);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
