import { mkdirSync, existsSync, renameSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { allLearningItems } from '../src/lib/data/learning.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const outputDir = join(projectRoot, 'static', 'audio', 'learning');
const voice = process.env.THAI_TTS_VOICE || 'th-TH-PremwadeeNeural';
const rate = process.env.THAI_TTS_RATE || '-10%';
const force = process.argv.includes('--force');
const category = process.argv.find((argument) => argument.startsWith('--category='))?.split('=')[1];
const itemIds = process.argv.find((argument) => argument.startsWith('--ids='))?.split('=')[1].split(',').filter(Boolean);
const items = allLearningItems.filter((item) => (!category || item.category === category) && (!itemIds?.length || itemIds.includes(item.id)));

mkdirSync(outputDir, { recursive: true });

for (const [index, item] of items.entries()) {
  const outputPath = join(outputDir, `${item.id}.mp3`);
  if (!force && existsSync(outputPath)) continue;

  process.stdout.write(`[${index + 1}/${items.length}] ${item.display} ${item.sound}\n`);
  const temporaryPath = `${outputPath}.tmp`;
  let result;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    rmSync(temporaryPath, { force: true });
    result = spawnSync('python', [
      '-m', 'edge_tts',
      '--voice', voice,
      `--rate=${rate}`,
      '--text', item.audioText || item.sound,
      '--write-media', temporaryPath
    ], { stdio: 'inherit', env: process.env });
    if (result.status === 0 && existsSync(temporaryPath)) break;
    if (attempt < 4) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 1500);
  }

  if (result.status !== 0 || !existsSync(temporaryPath)) {
    rmSync(temporaryPath, { force: true });
    throw new Error(`Unable to generate audio for ${item.id}`);
  }
  rmSync(outputPath, { force: true });
  renameSync(temporaryPath, outputPath);
}

process.stdout.write(`Generated ${items.length} Thai audio files in ${outputDir}\n`);
