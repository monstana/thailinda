import {
  bindTeacherShell, escapeHtml, formatThaiDate, getAssignments, getClassroom,
  requireTeacherSession, toggleAssignmentStatus, WORDS
} from "./core.js";

const auth = requireTeacherSession();
let currentFilter = "all";

if (auth) {
  bindTeacherShell(auth.user);
  bindEvents();
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });
  document.querySelector("#assignmentList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-toggle-assignment]");
    if (!button) return;
    toggleAssignmentStatus(auth.user.id, button.dataset.toggleAssignment);
    render();
  });
}

function render() {
  const assignments = getAssignments(auth.user.id);
  const visible = currentFilter === "all" ? assignments : assignments.filter((item) => item.status === currentFilter);
  document.querySelector("#allCount").textContent = assignments.length;
  document.querySelector("#activeCount").textContent = assignments.filter((item) => item.status === "active").length;
  document.querySelector("#completedCount").textContent = assignments.filter((item) => item.status === "completed").length;
  document.querySelector("#assignmentList").innerHTML = visible.length ? visible.map(renderAssignment).join("") : `
    <div class="empty-state empty-state--large">
      <span class="material-symbols-rounded" aria-hidden="true">assignment</span>
      <strong>ไม่พบงานในสถานะนี้</strong>
    </div>`;
}

function renderAssignment(item) {
  const selectedWords = item.wordIds.map((id) => WORDS.find((word) => word.id === id)?.text).filter(Boolean);
  const isActive = item.status === "active";
  return `
    <article class="assignment-row">
      <span class="row-icon ${isActive ? "row-icon--blue" : "row-icon--gray"} material-symbols-rounded" aria-hidden="true">${isActive ? "pending_actions" : "task_alt"}</span>
      <div class="assignment-main">
        <div class="assignment-title-line"><h3>${escapeHtml(item.title)}</h3><span class="badge badge--${isActive ? "active" : "completed"}">${isActive ? "กำลังดำเนินการ" : "เสร็จสิ้น"}</span></div>
        <p>${getClassroom(item.classroomId).name} · ${item.wordIds.length} คำ · กำหนดส่ง ${formatThaiDate(item.dueDate)}</p>
        <div class="inline-words">${selectedWords.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}</div>
      </div>
      <button class="button button--quiet button--small" type="button" data-toggle-assignment="${escapeHtml(item.id)}">
        <span class="material-symbols-rounded" aria-hidden="true">${isActive ? "check_circle" : "replay"}</span>
        ${isActive ? "ปิดงาน" : "เปิดอีกครั้ง"}
      </button>
    </article>`;
}
