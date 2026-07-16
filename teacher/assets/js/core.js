import { getAllUsers } from "../../../assets/js/data/users.js";
import { WORDS } from "../../../student/assets/js/data/words.js";
import { CLASSROOMS, DEFAULT_CLASSROOM_ID } from "./data/teacher-data.js";

const SESSION_KEY = "thailinda.session";
const PROGRESS_KEY = "thailinda.studentProgress.v1";
const ASSIGNMENTS_KEY = "thailinda.teacherAssignments.v1";

function redirectToLogin() {
  window.location.replace(new URL("../../index.html", window.location.href));
}

export function requireTeacherSession() {
  let session;
  try {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    session = null;
  }

  if (!session?.userId || session.role !== "teacher") {
    redirectToLogin();
    return null;
  }

  const user = getAllUsers().find((item) => item.id === session.userId && item.role === "teacher");
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    redirectToLogin();
    return null;
  }

  return { session, user };
}

export function bindTeacherShell(user) {
  document.querySelectorAll("[data-teacher-name]").forEach((node) => {
    node.textContent = user.firstName;
  });
  document.querySelectorAll("[data-school-name]").forEach((node) => {
    node.textContent = user.school;
  });
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", logout);
  });
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  redirectToLogin();
}

export function getClassroom(classroomId = DEFAULT_CLASSROOM_ID) {
  return CLASSROOMS.find((item) => item.id === classroomId) || CLASSROOMS[0];
}

export function getClassroomStudents(teacher) {
  return getAllUsers().filter((item) => item.role === "student" && item.school === teacher.school);
}

function readProgressRoot() {
  try {
    const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    return value?.version === 1 && value.users ? value : { version: 1, users: {} };
  } catch {
    return { version: 1, users: {} };
  }
}

export function getStudentProgress(userId) {
  const saved = readProgressRoot().users[userId] || {};
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

function readAssignmentRoot() {
  try {
    const value = JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY) || "null");
    return value?.version === 1 && Array.isArray(value.assignments) ? value : { version: 1, assignments: [] };
  } catch {
    return { version: 1, assignments: [] };
  }
}

function writeAssignmentRoot(root) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(root));
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getAssignments(teacherId) {
  const root = readAssignmentRoot();
  if (!root.assignments.some((item) => item.teacherId === teacherId)) {
    root.assignments.push({
      id: `assignment-starter-${teacherId}`,
      teacherId,
      title: "ฝึกออกเสียงคำพื้นฐาน 10 คำ",
      classroomId: DEFAULT_CLASSROOM_ID,
      wordIds: WORDS.map((word) => word.id),
      dueDate: futureDate(7),
      status: "active",
      createdAt: new Date().toISOString()
    });
    writeAssignmentRoot(root);
  }
  return root.assignments
    .filter((item) => item.teacherId === teacherId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function addAssignment(teacherId, values) {
  const root = readAssignmentRoot();
  const assignment = {
    id: globalThis.crypto?.randomUUID?.() || `assignment-${Date.now()}`,
    teacherId,
    title: values.title.trim(),
    classroomId: values.classroomId || DEFAULT_CLASSROOM_ID,
    wordIds: [...new Set(values.wordIds)].filter((id) => WORDS.some((word) => word.id === id)),
    dueDate: values.dueDate,
    status: "active",
    createdAt: new Date().toISOString()
  };
  root.assignments.push(assignment);
  writeAssignmentRoot(root);
  return assignment;
}

export function toggleAssignmentStatus(teacherId, assignmentId) {
  const root = readAssignmentRoot();
  const assignment = root.assignments.find((item) => item.id === assignmentId && item.teacherId === teacherId);
  if (!assignment) return null;
  assignment.status = assignment.status === "active" ? "completed" : "active";
  writeAssignmentRoot(root);
  return assignment;
}

export function getWordPracticeCounts(students) {
  return WORDS.map((word) => ({
    ...word,
    needsPractice: students.reduce((count, student) => {
      return count + (getStudentProgress(student.id).words[word.id].status === "needsPractice" ? 1 : 0);
    }, 0),
    attempted: students.reduce((count, student) => {
      return count + (getStudentProgress(student.id).words[word.id].status !== "notStarted" ? 1 : 0);
    }, 0)
  })).sort((a, b) => b.needsPractice - a.needsPractice || b.attempted - a.attempted || a.order - b.order);
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
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

export function statusLabel(status) {
  return {
    passed: "ผ่านจากเสียงจริง",
    needsPractice: "ควรฝึกเพิ่ม",
    demoCompleted: "โหมดทดลอง",
    notStarted: "ยังไม่เริ่ม"
  }[status] || "ยังไม่เริ่ม";
}

export function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = String(value ?? "");
  return node.innerHTML;
}

export { WORDS };
