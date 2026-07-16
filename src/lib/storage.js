import { allLearningItems, itemById } from '$lib/data/learning.js';
import { getAllUsers } from '$lib/data/users.js';

const SESSION_KEY = 'thailinda.session';
const PROGRESS_KEY = 'thailinda.learningProgress.v2';
const ASSIGNMENTS_KEY = 'thailinda.assignments.v2';
const CLASSROOMS_KEY = 'thailinda.classrooms.v1';

export function getSessionUser(requiredRole) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!session?.userId || (requiredRole && session.role !== requiredRole)) return null;
    if (session.user?.id === session.userId && session.user.role === session.role) return session.user;
    return getAllUsers().find((user) => user.id === session.userId && user.role === session.role) || null;
  } catch {
    return null;
  }
}

export function saveSession(user, apiToken = '') {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, role: user.role, user }));
  localStorage.setItem('thailinda.lastUserId', user.id);
  if (apiToken) localStorage.setItem('thailinda.apiToken', apiToken);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('thailinda.apiToken');
}

function emptyItemState() {
  return { status: 'notStarted', attempts: 0, correct: 0, incorrect: 0, lastResult: null, lastAttemptAt: null, mode: 'notEvaluated' };
}

function emptyProgress() {
  return { items: Object.fromEntries(allLearningItems.map((item) => [item.id, emptyItemState()])), updatedAt: null };
}

function readProgressRoot() {
  try {
    const root = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
    return root?.version === 2 && root.users ? root : { version: 2, users: {} };
  } catch {
    return { version: 2, users: {} };
  }
}

export function getLearningProgress(userId) {
  const root = readProgressRoot();
  const progress = emptyProgress();
  const saved = root.users[userId];
  if (saved?.items) {
    for (const item of allLearningItems) {
      const state = saved.items[item.id];
      if (!state) continue;
      progress.items[item.id] = { ...progress.items[item.id], ...state };
    }
    progress.updatedAt = saved.updatedAt || null;
  }
  return progress;
}

export function hydrateLearningProgress(userId, payload) {
  if (!payload?.items) return;
  const root = readProgressRoot();
  root.users[userId] = { items: payload.items, updatedAt: payload.updatedAt || null };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(root));
}

export function recordAssessment(userId, itemId, isCorrect, details = {}) {
  const root = readProgressRoot();
  const progress = getLearningProgress(userId);
  const state = progress.items[itemId] || emptyItemState();
  state.attempts += 1;
  state.correct += isCorrect ? 1 : 0;
  state.incorrect += isCorrect ? 0 : 1;
  state.lastResult = isCorrect ? 'correct' : 'incorrect';
  state.status = isCorrect ? 'passed' : state.status === 'passed' ? 'passed' : 'needsPractice';
  state.lastAttemptAt = new Date().toISOString();
  state.mode = details.mode || 'speech';
  state.lastRecognizedText = details.transcript || '';
  progress.items[itemId] = state;
  progress.updatedAt = state.lastAttemptAt;
  root.users[userId] = progress;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(root));
  return progress;
}

export function summarizeLearning(progress, itemIds = allLearningItems.map((item) => item.id)) {
  const states = itemIds.map((id) => progress.items[id] || emptyItemState());
  return {
    total: states.length,
    practiced: states.filter((state) => state.status !== 'notStarted').length,
    passed: states.filter((state) => state.status === 'passed').length,
    needsPractice: states.filter((state) => state.status === 'needsPractice').length,
    attempts: states.reduce((sum, state) => sum + state.attempts, 0)
  };
}

function readAssignmentRoot() {
  try {
    const root = JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY) || 'null');
    return root?.version === 2 && Array.isArray(root.assignments) ? root : { version: 2, assignments: [] };
  } catch {
    return { version: 2, assignments: [] };
  }
}

export function getAssignments() {
  return readAssignmentRoot().assignments.filter((assignment) => assignment.itemIds.some((id) => itemById[id]));
}

export function hydrateAssignments(assignments) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify({ version: 2, assignments: Array.isArray(assignments) ? assignments : [] }));
}

export function getClassroomAssignments(classroom, teacherId = classroom?.teacherId) {
  if (!classroom) return [];
  const teacherClassrooms = getClassrooms().filter((item) => item.teacherId === teacherId);
  const normalizeName = (value) => String(value || '').replace(/^ห้อง\s*/, '').trim();
  return getAssignments().filter((assignment) => assignment.teacherId === teacherId && (
    teacherClassrooms.length === 1 ||
    assignment.classroomId === classroom.id ||
    normalizeName(assignment.classroomName) === normalizeName(classroom.name)
  ));
}

export function saveAssignment(values) {
  const root = readAssignmentRoot();
  const assignment = {
    id: globalThis.crypto?.randomUUID?.() || `assignment-${Date.now()}`,
    teacherId: values.teacherId,
    classroomId: values.classroomId || null,
    classroomName: values.classroomName || 'ป.1/2',
    title: values.title.trim(),
    itemIds: [...new Set(values.itemIds)].filter((id) => itemById[id]),
    dueDate: values.dueDate,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  root.assignments.unshift(assignment);
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(root));
  return assignment;
}

function readClassroomRoot() {
  try {
    const root = JSON.parse(localStorage.getItem(CLASSROOMS_KEY) || 'null');
    return root?.version === 1 && Array.isArray(root.classrooms) ? root : { version: 1, classrooms: [] };
  } catch {
    return { version: 1, classrooms: [] };
  }
}

export function getClassrooms() {
  return readClassroomRoot().classrooms.filter((classroom) => classroom?.id && classroom?.teacherId && classroom?.name);
}

export function hydrateClassrooms(classrooms) {
  localStorage.setItem(CLASSROOMS_KEY, JSON.stringify({ version: 1, classrooms: Array.isArray(classrooms) ? classrooms : [] }));
}

export function getClassroomById(classroomId) {
  return getClassrooms().find((classroom) => classroom.id === classroomId) || null;
}

export function getClassroomStudents(classroom) {
  if (!classroom) return [];
  const students = getAllUsers().filter((account) => account.role === 'student');
  if (Array.isArray(classroom.studentIds)) {
    return students.filter((student) => classroom.studentIds.includes(student.id));
  }
  return students.filter((student) => student.school === classroom.school);
}

export function saveClassroom(values) {
  const root = readClassroomRoot();
  const classroom = {
    id: globalThis.crypto?.randomUUID?.() || `classroom-${Date.now()}`,
    teacherId: values.teacherId,
    name: values.name.trim(),
    level: values.level,
    group: values.group.trim(),
    academicYear: values.academicYear,
    school: values.school,
    studentCount: Number(values.studentCount) || 0,
    ...(Array.isArray(values.studentIds) ? { studentIds: [...new Set(values.studentIds)] } : {}),
    status: 'active',
    createdAt: new Date().toISOString()
  };
  root.classrooms.unshift(classroom);
  localStorage.setItem(CLASSROOMS_KEY, JSON.stringify(root));
  return classroom;
}

export function ensureTeacherClassrooms(teacher) {
  const classrooms = getClassrooms().filter((classroom) => classroom.teacherId === teacher.id);
  if (classrooms.length) return classrooms;
  saveClassroom({
    teacherId: teacher.id,
    name: 'ห้อง ป.1/2',
    level: 'ประถมศึกษาปีที่ 1',
    group: 'กลุ่มสายรุ้ง',
    academicYear: '2569',
    school: teacher.school,
    studentCount: 24,
    studentIds: getAllUsers().filter((account) => account.role === 'student' && account.school === teacher.school).map((account) => account.id)
  });
  return getClassrooms().filter((classroom) => classroom.teacherId === teacher.id);
}
