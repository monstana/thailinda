export function normalizeThaiSpeech(value) {
  return String(value || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{Script=Thai}\p{Letter}\p{Number}]/gu, '');
}

function withoutWordPrefix(value) {
  return value.startsWith('คำว่า') ? value.slice('คำว่า'.length) : value;
}

export function editDistance(left, right) {
  const a = Array.from(left);
  const b = Array.from(right);
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
      );
    }
    previous = current;
  }

  return previous[b.length];
}

export function acceptedSpeechAnswers(item) {
  const values = item.category === 'words'
    ? [item.display, `คำว่า${item.display}`]
    : item.category === 'vowels'
      ? [item.sound, item.audioText, item.name, item.example]
      : [item.sound, item.name];

  return [...new Set(values.map(normalizeThaiSpeech).filter(Boolean))];
}

export function matchThaiSpeech(item, transcript) {
  const normalizedTranscript = normalizeThaiSpeech(transcript);
  const answers = acceptedSpeechAnswers(item);
  if (!normalizedTranscript) {
    return { passed: false, matchType: 'empty', confidence: 0, distance: null, matchedAnswer: '' };
  }

  const exactAnswer = answers.find((answer) => answer === normalizedTranscript);
  if (exactAnswer) {
    return { passed: true, matchType: 'exact', confidence: 1, distance: 0, matchedAnswer: exactAnswer };
  }

  if (item.category === 'words') {
    const spokenWord = withoutWordPrefix(normalizedTranscript);
    const wordAnswer = answers.find((answer) => withoutWordPrefix(answer) === spokenWord);
    if (wordAnswer) {
      return { passed: true, matchType: 'word-prefix', confidence: 1, distance: 0, matchedAnswer: wordAnswer };
    }
  }

  const ranked = answers
    .map((answer) => {
      const distance = editDistance(normalizedTranscript, answer);
      const longestLength = Math.max(Array.from(normalizedTranscript).length, Array.from(answer).length, 1);
      return { answer, distance, confidence: 1 - distance / longestLength };
    })
    .sort((left, right) => left.distance - right.distance || right.confidence - left.confidence);
  const closest = ranked[0];

  // คำไทยสั้นผิดเพียงหนึ่งตัวอาจกลายเป็นอีกคำหนึ่ง จึงผ่อนปรนเฉพาะคำตั้งแต่ 4 ตัว
  // และต้องรักษาพยัญชนะ/เสียงต้นไว้ เพื่อไม่ให้เสียง เช่น "พอควาย" ผ่านแทน "คอควาย"
  const longEnough = Array.from(closest.answer).length >= 4;
  const sameLeadingSound = Array.from(normalizedTranscript)[0] === Array.from(closest.answer)[0];
  const normalizedName = normalizeThaiSpeech(item.name);
  const bareExample = item.category === 'consonants'
    && normalizedName
    && normalizedTranscript === Array.from(normalizedName).slice(1).join('');
  const nearMatch = item.category !== 'words'
    && longEnough
    && sameLeadingSound
    && !bareExample
    && closest.distance === 1
    && closest.confidence >= 0.75;

  if (nearMatch) {
    return {
      passed: true,
      matchType: 'near',
      confidence: Number(closest.confidence.toFixed(3)),
      distance: closest.distance,
      matchedAnswer: closest.answer
    };
  }

  if (item.category === 'consonants') {
    const soundPrefix = normalizeThaiSpeech(String(item.sound || '').trim().split(/\s+/u)[0]);
    if (Array.from(soundPrefix).length >= 2 && normalizedTranscript.startsWith(soundPrefix)) {
      const confidence = normalizedTranscript === soundPrefix ? 0.9 : 0.82;
      return {
        passed: true,
        matchType: 'sound-prefix',
        confidence,
        distance: null,
        matchedAnswer: soundPrefix
      };
    }
  }

  return {
    passed: false,
    matchType: 'different',
    confidence: Number(closest.confidence.toFixed(3)),
    distance: closest.distance,
    matchedAnswer: closest.answer
  };
}
