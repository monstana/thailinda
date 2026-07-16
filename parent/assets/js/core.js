import { getAllUsers } from "../../../assets/js/data/users.js";
import { WORDS } from "../../../student/assets/js/data/words.js";

const SESSION_KEY = "thailinda.session";
const PROGRESS_KEY = "thailinda.studentProgress.v1";
const ASSIGNMENTS_KEY = "thailinda.teacherAssignments.v1";
const SETTINGS_KEY = "thailinda.parentSettings.v1";
const SELECTED_CHILD_KEY = "thailinda.parentSelectedChild.v1";

function redirectToLogin() {
  window.location.replace(new URL("../../index.html", window.location.href));
}

export function requireParentSession() {
  let session;
  try {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    session = null;
  }

  if (!session?.userId || session.role !== "parent") {
    redirectToLogin();
    return null;
  }

  const user = getAllUsers().find((item) => item.id === session.userId && item.role === "parent");
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    redirectToLogin();
    return null;
  }

  return { session, user };
}

export function bindParentShell(user) {
  document.querySelectorAll("[data-parent-name]").forEach((node) => {
    node.textContent = user.firstName;
  });
  document.querySelectorAll("[data-school-name]").forEach((node) => {
    node.textContent = user.school;
  });
  document.querySelectorAll("[data-logout]").forEach((button) => button.addEventListener("click", logout));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  redirectToLogin();
}

export function getLinkedChildren(parent) {
  return getAllUsers().filter((item) => item.role === "student" && item.school === parent.school);
}

export function getSelectedChild(parent, children = getLinkedChildren(parent)) {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SELECTED_CHILD_KEY) || "{}");
  } catch {
    saved = {};
  }
  return children.find((child) => child.id === saved[parent.id]) || children[0] || null;
}

export function setSelectedChild(parentId, childId) {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SELECTED_CHILD_KEY) || "{}");
  } catch {
    saved = {};
  }
  saved[parentId] = childId;
  localStorage.setItem(SELECTED_CHILD_KEY, JSON.stringify(saved));
}

function readProgressRoot() {
  try {
    const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    return value?.version === 1 && value.users ? value : { version: 1, users: {} };
  } catch {
    return { version: 1, users: {} };
  }
}

export function getChildProgress(childId) {
  const saved = readProgressRoot().users[childId] || {};
  return {
    words: Object.fromEntries(WORDS.map((word) => {
      const state = saved.words?.[word.id] || {};
      return [word.id, {
        status: ["passed", "needsPractice", "demoCompleted"].includes(state.status) ? state.status : "notStarted",
        attempts: Math.max(0, Number(state.attempts) || 0),
        lastRecognizedText: String(state.lastRecognizedText || ""),
        lastAttemptAt: state.lastAttemptAt || null,
        assessmentMode: state.assessmentMode || null
      }];
    })),
    startedAt: saved.startedAt || null,
    updatedAt: saved.updatedAt || null
  };
}

export function summarizeProgress(progress) {
  const states = WORDS.map((word) => progress.words[word.id]);
  return {
    passed: states.filter((state) => state.status === "passed").length,
    demo: states.filter((state) => state.status === "demoCompleted").length,
    needsPractice: states.filter((state) => state.status === "needsPractice").length,
    practiced: states.filter((state) => state.status !== "notStarted").length,
    attempts: states.reduce((sum, state) => sum + state.attempts, 0)
  };
}

export function getRecommendedWords(progress, limit = 4) {
  return WORDS.map((word) => ({ ...word, state: progress.words[word.id] }))
    .filter((item) => item.state.status !== "passed")
    .sort((a, b) => {
      const priority = { needsPractice: 0, notStarted: 1, demoCompleted: 2 };
      return (priority[a.state.status] ?? 3) - (priority[b.state.status] ?? 3) || a.order - b.order;
    })
    .slice(0, limit);
}

function readAssignments() {
  try {
    const value = JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY) || "null");
    return value?.version === 1 && Array.isArray(value.assignments) ? value.assignments : [];
  } catch {
    return [];
  }
}

export function getChildAssignments(parent, progress) {
  const teacherIds = new Set(getAllUsers()
    .filter((item) => item.role === "teacher" && item.school === parent.school)
    .map((item) => item.id));
  return readAssignments()
    .filter((item) => teacherIds.has(item.teacherId))
    .map((item) => {
      const completedWords = item.wordIds.filter((id) => ["passed", "demoCompleted"].includes(progress.words[id]?.status)).length;
      const practicedWords = item.wordIds.filter((id) => progress.words[id]?.status && progress.words[id].status !== "notStarted").length;
      return { ...item, completedWords, practicedWords, childCompleted: completedWords === item.wordIds.length };
    })
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
}

export function getParentSettings(parentId) {
  let root = {};
  try {
    root = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    root = {};
  }
  return { weeklyReport: true, practiceReminder: true, ...(root[parentId] || {}) };
}

export function saveParentSettings(parentId, settings) {
  let root = {};
  try {
    root = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    root = {};
  }
  root[parentId] = settings;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(root));
}

export function getAudioUrl(word) {
  const filename = word.audioPath.split("/").pop();
  return new URL(`../../../student/assets/audio/words/${filename}`, import.meta.url).href;
}

export function formatThaiDate(value) {
  if (!value) return "ยังไม่กำหนด";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ยังไม่มีข้อมูล";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function statusLabel(status) {
  return {
    passed: "ผ่านจากเสียงจริง",
    needsPractice: "ควรฝึกเพิ่ม",
    demoCompleted: "ฝึกในโหมดทดลอง",
    notStarted: "ยังไม่เริ่ม"
  }[status] || "ยังไม่เริ่ม";
}

export function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = String(value ?? "");
  return node.innerHTML;
}

export { WORDS };
