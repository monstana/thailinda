import { env } from '$env/dynamic/public';
import { saveApiAccounts } from '$lib/data/users.js';
import { hydrateAssignments, hydrateClassrooms, hydrateLearningProgress } from '$lib/storage.js';
import { savePlacementAssessment } from '$lib/placement-assessment.js';

const API_BASE_URL = (env.PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

export function isApiEnabled() {
  return Boolean(API_BASE_URL);
}

function apiToken() {
  return typeof localStorage === 'undefined' ? '' : localStorage.getItem('thailinda.apiToken') || '';
}

async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) throw new Error('ยังไม่ได้ตั้งค่า Rails API');
  const headers = new Headers(options.headers || {});
  const token = apiToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'เชื่อมต่อ Rails API ไม่สำเร็จ');
  return payload;
}

export async function fetchApiAccounts(role = '') {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  const payload = await apiRequest(`/accounts${query}`);
  return payload.accounts || [];
}

export async function refreshApiAccounts() {
  const accounts = await fetchApiAccounts();
  saveApiAccounts(accounts);
  return accounts;
}

export function createApiSession(accountId, pin) {
  return apiRequest('/session', { method: 'POST', body: JSON.stringify({ accountId, pin }) });
}

export function registerApiAccount(values) {
  return apiRequest('/registrations', { method: 'POST', body: JSON.stringify(values) });
}

export function fetchPlacementAssessment(studentId) {
  return apiRequest(`/students/${encodeURIComponent(studentId)}/placement_assessment`);
}

export function submitPlacementAssessment(studentId, results) {
  return apiRequest(`/students/${encodeURIComponent(studentId)}/placement_assessment`, {
    method: 'PATCH',
    body: JSON.stringify({ results })
  });
}

export function createApiClassroom(values) {
  return apiRequest('/classrooms', { method: 'POST', body: JSON.stringify(values) });
}

export function createApiAssignment(values) {
  return apiRequest('/assignments', { method: 'POST', body: JSON.stringify(values) });
}

export async function evaluateSpeechWithApi(targetId, audioBlob) {
  const form = new FormData();
  form.append('targetId', targetId);
  form.append('audio', audioBlob, `${targetId}.wav`);
  return apiRequest('/speech/evaluate', { method: 'POST', body: form });
}

export async function syncApiData(user) {
  if (!isApiEnabled()) return;
  const [classroomPayload, assignmentPayload] = await Promise.all([
    apiRequest('/classrooms'),
    apiRequest('/assignments')
  ]);
  const classroomDetails = await Promise.all((classroomPayload.classrooms || []).map(async (classroom) => {
    const detail = await apiRequest(`/classrooms/${encodeURIComponent(classroom.id)}`);
    const students = detail.classroom?.students || [];
    return { ...classroom, studentIds: students.map((student) => student.id) };
  }));

  hydrateClassrooms(classroomDetails);
  hydrateAssignments(assignmentPayload.assignments || []);

  const studentIds = new Set(user.role === 'student' ? [user.id] : classroomDetails.flatMap((classroom) => classroom.studentIds || []));
  await Promise.all([...studentIds].map(async (studentId) => {
    const progress = await apiRequest(`/students/${encodeURIComponent(studentId)}/progress`);
    hydrateLearningProgress(studentId, progress);
    if (progress.placementAssessment) savePlacementAssessment(progress.placementAssessment);
  }));
}
