import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { allLearningItems } from '../src/lib/data/learning.js';

const outputPath = resolve('backend', 'db', 'learning_items.json');
const payload = allLearningItems.map((item) => ({
  id: item.id,
  category: item.category,
  position: item.order,
  display: item.display,
  name: item.name,
  sound: item.sound,
  audio_text: item.audioText || item.sound,
  example: item.example || null,
  mouth_cue: item.mouthCue || null,
  audio_path: item.audioPath || null
}));

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
process.stdout.write(`Exported ${payload.length} learning items to ${outputPath}\n`);

