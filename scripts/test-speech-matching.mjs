import assert from 'node:assert/strict';
import { matchThaiSpeech } from '../src/lib/speech-matching.js';

const consonant = { category: 'consonants', display: 'จ', sound: 'จอ จาน', name: 'จ จาน' };
const khwai = { category: 'consonants', display: 'ค', sound: 'คอ ควาย', name: 'ค ควาย' };
const word = { category: 'words', display: 'กา', sound: 'กา', name: 'คำว่า กา' };
const vowel = { category: 'vowels', display: 'อะ', sound: 'สระ อะ', audioText: 'สะ หระ อะ', name: 'สระอะ', example: 'อะ' };

assert.equal(matchThaiSpeech(consonant, 'จอจาน').matchType, 'exact');
assert.equal(matchThaiSpeech(consonant, 'จอจา').matchType, 'near');
assert.equal(matchThaiSpeech(consonant, 'จอ').matchType, 'sound-prefix');
assert.equal(matchThaiSpeech(consonant, 'จอจ้ะ').matchType, 'sound-prefix');
assert.equal(matchThaiSpeech(consonant, 'จาน').passed, false);
assert.equal(matchThaiSpeech(consonant, 'รอจาน').passed, false);
assert.equal(matchThaiSpeech(consonant, 'จบ').passed, false);
assert.equal(matchThaiSpeech(khwai, 'คอความ').matchType, 'near');
assert.equal(matchThaiSpeech(khwai, 'พอควาย').passed, false);
assert.equal(matchThaiSpeech(word, 'คำว่า กา').passed, true);
assert.equal(matchThaiSpeech(word, 'ขา').passed, false);
assert.equal(matchThaiSpeech(vowel, 'อะ').passed, true);
assert.equal(matchThaiSpeech(vowel, 'อา').passed, false);

console.log('speech matching tests passed');
