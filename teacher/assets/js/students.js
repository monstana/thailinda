import {
  WORDS, bindTeacherShell, escapeHtml, formatDateTime, getClassroomStudents,
  getStudentProgress, requireTeacherSession, statusLabel, summarizeProgress
} from "./core.js";

const auth = requireTeacherSession();
let selectedStudentId = new URLSearchParams(location.search).get("student");

if (auth) {
  bindTeacherShell(auth.user);
  const students = getClassroomStudents(auth.user);
  if (!students.some((student) => student.id === selectedStudentId)) selectedStudentId = students[0]?.id || null;
  render(students);
}

function render(students) {
  document.querySelector("#studentTotal").textContent = students.length;
  document.querySelector("#studentList").innerHTML = students.length ? students.map(renderStudentButton).join("") : `
    <div class="empty-state">ยังไม่มีบัญชีนักเรียนในโรงเรียนนี้</div>`;
  document.querySelectorAll("[data-student-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedStudentId = button.dataset.studentId;
      render(students);
    });
  });
  renderReport(students.find((student) => student.id === selectedStudentId));
}

function renderStudentButton(student) {
  const summary = summarizeProgress(getStudentProgress(student.id));
  const isSelected = student.id === selectedStudentId;
  return `
    <button class="student-row ${isSelected ? "is-selected" : ""}" type="button" data-student-id="${escapeHtml(student.id)}">
      <span class="avatar avatar--student material-symbols-rounded" aria-hidden="true">face</span>
      <span class="row-main"><strong>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</strong><small>ฝึกแล้ว ${summary.practiced}/10 คำ · ลอง ${summary.attempts} ครั้ง</small></span>
      <span class="score-cell"><strong>${summary.passed}/10</strong><small>ผ่านจริง</small></span>
      <span class="material-symbols-rounded row-chevron" aria-hidden="true">chevron_right</span>
    </button>`;
}

function renderReport(student) {
  const panel = document.querySelector("#studentReport");
  if (!student) {
    panel.innerHTML = `<div class="empty-state empty-state--large"><span class="material-symbols-rounded" aria-hidden="true">group_off</span><strong>ยังไม่มีข้อมูลนักเรียน</strong></div>`;
    return;
  }

  const progress = getStudentProgress(student.id);
  const summary = summarizeProgress(progress);
  panel.innerHTML = `
    <div class="report-head">
      <div><p class="eyebrow">รายงานรายคำ</p><h2>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</h2><p>อัปเดตล่าสุด ${formatDateTime(progress.updatedAt)}</p></div>
      <div class="report-score"><strong>${summary.passed}</strong><span>ผ่านจากเสียงจริง / 10</span></div>
    </div>
    <div class="mini-metrics">
      <div><strong>${summary.practiced}</strong><span>ฝึกแล้ว</span></div>
      <div><strong>${summary.demo}</strong><span>โหมดทดลอง</span></div>
      <div><strong>${summary.needsPractice}</strong><span>ควรฝึกเพิ่ม</span></div>
      <div><strong>${summary.attempts}</strong><span>ครั้งที่ลอง</span></div>
    </div>
    <div class="table-wrap">
      <table class="report-table">
        <thead><tr><th>คำ</th><th>สถานะ</th><th>จำนวนครั้ง</th><th>ระบบได้ยินล่าสุด</th><th>เวลาล่าสุด</th></tr></thead>
        <tbody>${WORDS.map((word) => renderWordRow(word, progress.words[word.id])).join("")}</tbody>
      </table>
    </div>`;
}

function renderWordRow(word, state) {
  return `<tr>
    <td><span class="word-chip word-chip--small">${escapeHtml(word.text)}</span></td>
    <td><span class="status status--${state.status}">${statusLabel(state.status)}</span></td>
    <td>${state.attempts}</td>
    <td>${state.lastRecognizedText ? escapeHtml(state.lastRecognizedText) : "-"}</td>
    <td>${formatDateTime(state.lastAttemptAt)}</td>
  </tr>`;
}
