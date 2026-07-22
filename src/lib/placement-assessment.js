import { consonants, itemById, vowels, words } from '$lib/data/learning.js';

const STORAGE_KEY = 'thailinda.placementAssessments.v1';

function readRoot() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writeRoot(root) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
}

function randomItems(items, count) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const random = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
      : Math.random();
    const swapIndex = Math.floor(random * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

export function createPlacementAssessment(userId) {
  const existing = getPlacementAssessment(userId);
  if (existing) return existing;
  const selected = [
    ...randomItems(consonants, 3),
    ...randomItems(vowels, 2),
    ...randomItems(words, 1)
  ];
  const assessment = {
    id: `placement-${userId}`,
    userId,
    status: 'pending',
    itemIds: selected.map((item) => item.id),
    results: {},
    score: null,
    level: '',
    recommendation: '',
    categoryScores: {},
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  savePlacementAssessment(assessment);
  return assessment;
}

export function getPlacementAssessment(userId) {
  return readRoot()[userId] || null;
}

export function savePlacementAssessment(assessment) {
  if (!assessment?.userId) return null;
  const root = readRoot();
  root[assessment.userId] = assessment;
  writeRoot(root);
  return assessment;
}

export function savePlacementAttempt(userId, result) {
  const assessment = getPlacementAssessment(userId);
  if (!assessment || assessment.status === 'completed' || !assessment.itemIds.includes(result?.itemId)) return assessment;
  if (assessment.results?.[result.itemId]) return assessment;
  assessment.results = {
    ...(assessment.results || {}),
    [result.itemId]: { ...result, assessedAt: new Date().toISOString() }
  };
  savePlacementAssessment(assessment);
  return assessment;
}

function audioScore(result) {
  if (Number.isFinite(result?.matchConfidence)) {
    const confidenceScore = Math.round(Math.max(0, Math.min(1, result.matchConfidence)) * 100);
    return result.passed ? Math.max(75, confidenceScore) : Math.min(69, confidenceScore);
  }
  return result?.passed ? 100 : 0;
}

function scoredResult(itemId, result) {
  const item = itemById[itemId];
  const speech = audioScore(result);
  const hasVisualScore = item?.category !== 'words' && Number.isFinite(result?.mouthScore);
  const score = hasVisualScore ? Math.round(speech * 0.85 + result.mouthScore * 0.15) : speech;
  return { ...result, itemId, score, audioScore: speech, visualScore: hasVisualScore ? result.mouthScore : null };
}

export function levelForScore(score) {
  if (score >= 85) return { level: 'ระดับคล่องแคล่ว', code: 'advanced', icon: 'workspace_premium' };
  if (score >= 70) return { level: 'ระดับกำลังพัฒนา', code: 'developing', icon: 'trending_up' };
  if (score >= 50) return { level: 'ระดับพื้นฐาน', code: 'foundation', icon: 'school' };
  return { level: 'ระดับเริ่มต้น', code: 'beginner', icon: 'flag' };
}

function recommendationFor(categoryScores, mouthAverage) {
  const labels = { consonants: 'พยัญชนะ', vowels: 'สระ', words: 'คำศัพท์' };
  const entries = Object.entries(categoryScores).sort((left, right) => left[1] - right[1]);
  const weakest = entries[0];
  const focus = weakest ? `ควรเน้นฝึก${labels[weakest[0]]} โดยฟังเสียงต้นแบบแล้วพูดช้า ๆ ให้ครบเสียง` : 'ควรฝึกออกเสียงอย่างสม่ำเสมอ';
  return Number.isFinite(mouthAverage) && mouthAverage < 70
    ? `${focus} และฝึกจัดรูปปากหน้ากระจกให้ใกล้เคียงตัวอย่าง`
    : `${focus} พร้อมทบทวนวันละ 5–10 นาที`;
}

export function finalizePlacementAssessment(userId) {
  const assessment = getPlacementAssessment(userId);
  if (!assessment) return null;
  const scored = assessment.itemIds
    .map((itemId) => assessment.results?.[itemId] ? scoredResult(itemId, assessment.results[itemId]) : null)
    .filter(Boolean);
  if (scored.length !== assessment.itemIds.length) return assessment;

  const categoryScores = {};
  for (const category of ['consonants', 'vowels', 'words']) {
    const values = scored.filter((result) => itemById[result.itemId]?.category === category).map((result) => result.score);
    categoryScores[category] = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  }
  const score = Math.round(scored.reduce((sum, result) => sum + result.score, 0) / scored.length);
  const visualValues = scored.map((result) => result.visualScore).filter(Number.isFinite);
  const mouthAverage = visualValues.length ? Math.round(visualValues.reduce((sum, value) => sum + value, 0) / visualValues.length) : null;
  const level = levelForScore(score);
  const completed = {
    ...assessment,
    status: 'completed',
    results: Object.fromEntries(scored.map((result) => [result.itemId, result])),
    score,
    level: level.level,
    levelCode: level.code,
    levelIcon: level.icon,
    categoryScores,
    mouthAverage,
    recommendation: recommendationFor(categoryScores, mouthAverage),
    completedAt: new Date().toISOString()
  };
  savePlacementAssessment(completed);
  return completed;
}

export function placementIsReady(assessment) {
  return Boolean(assessment?.itemIds?.length === 6 && assessment.itemIds.every((itemId) => assessment.results?.[itemId]));
}
