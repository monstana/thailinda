import { WORDS } from "./data/words.js";
import { getAllUsers } from "../../../assets/js/data/users.js";

const PROGRESS_KEY = "thailinda.studentProgress.v1";
const SESSION_KEY = "thailinda.session";
const VALID_STATUSES = new Set(["notStarted", "passed", "needsPractice", "demoCompleted"]);

function redirectToLogin() {
  window.location.replace(new URL("../../index.html", window.location.href));
}

export function requireStudentSession() {
  let session;
  try {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    session = null;
  }

  if (!session?.userId || session.role !== "student") {
    redirectToLogin();
    return null;
  }

  const user = getAllUsers().find((item) => item.id === session.userId && item.role === "student");
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    redirectToLogin();
    return null;
  }

  return { session, user };
}

function emptyWordState() {
  return {
    status: "notStarted",
    attempts: 0,
    lastRecognizedText: "",
    lastAttemptAt: null,
    assessmentMode: null
  };
}

function emptyUserProgress() {
  return {
    words: Object.fromEntries(WORDS.map((word) => [word.id, emptyWordState()])),
    currentWordId: WORDS[0].id,
    startedAt: null,
    updatedAt: null,
    completedAt: null,
    settings: { volume: 80 }
  };
}

function loadRoot() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    if (parsed?.version === 1 && parsed.users && typeof parsed.users === "object") return parsed;
  } catch {
    // Invalid local prototype data is replaced with a clean schema.
  }
  return { version: 1, users: {} };
}

function normalizeUserProgress(value) {
  const base = emptyUserProgress();
  if (!value || typeof value !== "object") return base;

  for (const word of WORDS) {
    const saved = value.words?.[word.id];
    if (!saved) continue;
    base.words[word.id] = {
      ...base.words[word.id],
      ...saved,
      status: VALID_STATUSES.has(saved.status) ? saved.status : "notStarted",
      attempts: Math.max(0, Number(saved.attempts) || 0)
    };
  }

  base.currentWordId = WORDS.some((word) => word.id === value.currentWordId) ? value.currentWordId : WORDS[0].id;
  base.startedAt = value.startedAt || null;
  base.updatedAt = value.updatedAt || null;
  base.completedAt = value.completedAt || null;
  base.settings.volume = Math.min(100, Math.max(0, Number(value.settings?.volume) || 80));
  return base;
}

function saveRoot(root) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(root));
}

export function getProgress(userId) {
  const root = loadRoot();
  const progress = normalizeUserProgress(root.users[userId]);
  root.users[userId] = progress;
  saveRoot(root);
  return progress;
}

function mutateProgress(userId, mutation) {
  const root = loadRoot();
  const progress = normalizeUserProgress(root.users[userId]);
  mutation(progress);
  progress.updatedAt = new Date().toISOString();
  root.users[userId] = progress;
  saveRoot(root);
  return progress;
}

export function setCurrentWord(userId, wordId) {
  return mutateProgress(userId, (progress) => {
    progress.currentWordId = wordId;
    progress.startedAt ||= new Date().toISOString();
  });
}

export function recordRecognition(userId, wordId, recognizedTexts, passed) {
  return mutateProgress(userId, (progress) => {
    const state = progress.words[wordId];
    state.attempts += 1;
    state.lastRecognizedText = recognizedTexts.filter(Boolean).join(" / ");
    state.lastAttemptAt = new Date().toISOString();
    state.assessmentMode = "speech";
    state.status = passed ? "passed" : state.status === "passed" ? "passed" : "notStarted";
    progress.startedAt ||= state.lastAttemptAt;
  });
}

export function recordNoSpeech(userId, wordId) {
  return mutateProgress(userId, (progress) => {
    const state = progress.words[wordId];
    state.attempts += 1;
    state.lastRecognizedText = "ไม่ได้ยินเสียง";
    state.lastAttemptAt = new Date().toISOString();
    state.assessmentMode = "speech";
    progress.startedAt ||= state.lastAttemptAt;
  });
}

export function markNeedsPractice(userId, wordId) {
  return mutateProgress(userId, (progress) => {
    const state = progress.words[wordId];
    if (state.status !== "passed") state.status = "needsPractice";
    state.lastAttemptAt ||= new Date().toISOString();
  });
}

export function markDemoCompleted(userId, wordId) {
  return mutateProgress(userId, (progress) => {
    const state = progress.words[wordId];
    if (state.status !== "passed") state.status = "demoCompleted";
    state.assessmentMode = "demo";
    state.lastAttemptAt = new Date().toISOString();
    progress.startedAt ||= state.lastAttemptAt;
  });
}

export function setVolume(userId, volume) {
  return mutateProgress(userId, (progress) => {
    progress.settings.volume = Math.min(100, Math.max(0, Number(volume) || 0));
  });
}

export function markLessonComplete(userId) {
  return mutateProgress(userId, (progress) => {
    progress.completedAt = new Date().toISOString();
    progress.currentWordId = WORDS.find((word) => progress.words[word.id].status === "needsPractice")?.id || WORDS[0].id;
  });
}

export function clearProgress(userId) {
  const root = loadRoot();
  root.users[userId] = emptyUserProgress();
  saveRoot(root);
  return root.users[userId];
}

export function getSummary(progress) {
  const states = WORDS.map((word) => progress.words[word.id]);
  return {
    passed: states.filter((state) => state.status === "passed").length,
    demo: states.filter((state) => state.status === "demoCompleted").length,
    needsPractice: states.filter((state) => state.status === "needsPractice").length,
    practiced: states.filter((state) => state.status !== "notStarted").length,
    attempts: states.reduce((total, state) => total + state.attempts, 0)
  };
}

export function getNextWordId(progress) {
  return WORDS.find((word) => progress.words[word.id].status === "notStarted")?.id
    || WORDS.find((word) => progress.words[word.id].status === "needsPractice")?.id
    || progress.currentWordId
    || WORDS[0].id;
}

export function normalizeThai(value) {
  return String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/[\s.,!?;:'\"“”‘’()\[\]{}…。、，！？-]/g, "");
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  redirectToLogin();
}

export function bindSharedHeader(user) {
  document.querySelectorAll("[data-student-name]").forEach((node) => {
    node.textContent = user.firstName;
  });
}

