import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  dtwDistance,
  evaluateMouthSequence,
  mouthReferenceKey,
  mouthVisualWeight
} from '../src/lib/mouth-evaluation.js';

const stretched = dtwDistance([[0], [1], [2]], [[0], [0], [1], [1], [2]], [1]);
assert.ok(stretched < 0.01, `DTW should align a time-stretched sequence, got ${stretched}`);
assert.equal(mouthReferenceKey({ category: 'consonants', order: 1 }), 'consonants:1');
assert.equal(mouthReferenceKey({ category: 'words', order: 1 }), '');
assert.ok(mouthVisualWeight({ category: 'vowels', order: 1 }) > mouthVisualWeight({ category: 'consonants', order: 1 }));

const data = JSON.parse(await readFile(new URL('../static/mouth/references.json', import.meta.url), 'utf8'));
let passed = 0;
let total = 0;

for (const [key, reference] of Object.entries(data.references)) {
  const [category, orderText] = key.split(':');
  const item = { category, order: Number(orderText) };
  for (let index = 0; index < reference.sequences.length; index += 1) {
    const leaveOneOutData = {
      ...data,
      references: {
        [key]: {
          ...reference,
          sequences: reference.sequences.filter((_, candidateIndex) => candidateIndex !== index)
        }
      }
    };
    const result = evaluateMouthSequence(item, reference.sequences[index], leaveOneOutData);
    passed += Number(result.status === 'matched');
    total += 1;
  }
}

const passRate = passed / total;
assert.ok(passRate >= 0.85, `Reference leave-one-out pass rate is too low: ${(passRate * 100).toFixed(1)}%`);
console.log(`mouth evaluation tests passed; leave-one-out=${passed}/${total} (${(passRate * 100).toFixed(1)}%)`);
