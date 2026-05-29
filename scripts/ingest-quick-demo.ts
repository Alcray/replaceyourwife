import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { captureText } from '../app/lib/capture';

const DEMO_DIR = path.join(process.cwd(), 'public', 'demo');

async function main() {
  const demos = [
    {
      path: path.join(DEMO_DIR, 'aroma-kettle-reset-card.md'),
      sourceName: 'Aroma AWK-151B reset card',
      notes: 'Exact reset steps for the Aroma AWK-151B dry-boil protection demo.'
    },
    {
      path: path.join(DEMO_DIR, 'aroma-kettle-demo-notes.md'),
      sourceName: 'Aroma AWK-151B electric kettle demo notes',
      notes: 'Curated appliance manual notes for reliable hackathon retrieval.'
    },
    {
      path: path.join(DEMO_DIR, 'patient-medical-record.md'),
      sourceName: 'ACME Hospital patient medical record',
      notes: 'Demo medical record from supplied screenshots.'
    },
    {
      path: path.join(DEMO_DIR, 'wifi-fix-may-28.md'),
      sourceName: 'Home Wi-Fi fix log (May 28)',
      notes: 'Personal repair log for how home Wi-Fi was fixed.'
    }
  ];

  for (const demo of demos) {
    const text = await readFile(demo.path, 'utf8');
    const result = await captureText({
      text,
      sourceName: demo.sourceName,
      sourceType: 'markdown',
      notes: demo.notes
    });
    console.log(`${demo.sourceName}: ${result.memoriesCreated} memories`);
  }

  console.log('Quick demo seed complete.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
