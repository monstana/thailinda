import {
  WORDS, bindTeacherShell, escapeHtml, formatThaiDate, getAssignments, getClassroom,
  getClassroomStudents, getStudentProgress, getWordPracticeCounts, requireTeacherSession, summarizeProgress
} from "./core.js";

const auth = requireTeacherSession();
if (auth) {
  bindTeacherShell(auth.user);
  renderDashboard(auth.user);
}

function renderDashboard(teacher) {
  const students = getClassroomStudents(teacher);
  const assignments = getAssignments(teacher.id);
  const summaries = students.map((student) => summarizeProgress(getStudentProgress(student.id)));
  const totalPassed = summaries.reduce((sum, item) => sum + item.passed, 0);
  const totalNeedsPractice = summaries.reduce((sum, item) => sum + item.needsPractice, 0);
  const activeAssignments = assignments.filter((item) => item.status === "active");

  document.querySelector("#studentCount").textContent = students.length;
  document.querySelector("#activeAssignmentCount").textContent = activeAssignments.length;
  document.querySelector("#passedCount").textContent = totalPassed;
  document.querySelector("#practiceCount").textContent = totalNeedsPractice;
  document.querySelector("#classroomName").textContent = getClassroom().name;
  document.querySelector("#assignmentRows").innerHTML = renderAssignments(activeAssignments.slice(0, 3));
  document.querySelector("#practiceWords").innerHTML = renderPracticeWords(getWordPracticeCounts(students).slice(0, 5), students.length);
  document.querySelector("#classProgress").textContent = students.length
    ? `${totalPassed} จาก ${students.length * WORDS.length} คำ`
    : "ยังไม่มีนักเรียน";
}

function renderAssignments(assignments) {
  if (!assignments.length) return `<div class="empty-state">ยังไม่มีงานที่กำลังดำเนินการ</div>`;
  return assignments.map((item) => `
    <a class="data-row data-row--link" href="t_002.html">
      <span class="row-icon row-icon--blue material-symbols-rounded" aria-hidden="true">campaign</span>
      <span class="row-main"><strong>${escapeHtml(item.title)}</strong><small>${item.wordIds.length} คำ · ${getClassroom(item.classroomId).name}</small></span>
      <span class="row-meta">ส่ง ${formatThaiDate(item.dueDate)}</span>
      <span class="material-symbols-rounded row-chevron" aria-hidden="true">chevron_right</span>
    </a>`).join("");
}

function renderPracticeWords(words, studentCount) {
  if (!studentCount) return `<div class="empty-state">ยังไม่มีนักเรียนที่เชื่อมกับห้องนี้</div>`;
  return words.map((word) => `
    <div class="word-row">
      <span class="word-chip">${escapeHtml(word.text)}</span>
      <span class="row-main"><strong>${word.needsPractice ? `${word.needsPractice} คนควรฝึกเพิ่ม` : "ยังไม่พบคำที่ติดขัด"}</strong><small>มีผู้ฝึกแล้ว ${word.attempted} จาก ${studentCount} คน</small></span>
      <span class="status-dot ${word.needsPractice ? "status-dot--orange" : "status-dot--green"}" aria-hidden="true"></span>
    </div>`).join("");
}
