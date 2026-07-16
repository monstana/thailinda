import {
  bindParentShell, escapeHtml, formatThaiDate, getAudioUrl, getChildAssignments,
  getChildProgress, getLinkedChildren, getRecommendedWords, getSelectedChild,
  requireParentSession, setSelectedChild, statusLabel, summarizeProgress
} from "./core.js";

const auth = requireParentSession();
let audio = null;

if (auth) {
  bindParentShell(auth.user);
  renderChildSelector(auth.user);
  renderDashboard(auth.user);
  bindAudioButtons();
}

function renderChildSelector(parent) {
  const children = getLinkedChildren(parent);
  const selected = getSelectedChild(parent, children);
  const select = document.querySelector("#childSelector");
  select.innerHTML = children.map((child) => `<option value="${escapeHtml(child.id)}" ${child.id === selected?.id ? "selected" : ""}>${escapeHtml(child.firstName)} ${escapeHtml(child.lastName)}</option>`).join("");
  select.hidden = children.length < 2;
  select.addEventListener("change", () => {
    setSelectedChild(parent.id, select.value);
    renderDashboard(parent);
    bindAudioButtons();
  });
}

function renderDashboard(parent) {
  const child = getSelectedChild(parent);
  const noChild = document.querySelector("#noChild");
  const content = document.querySelector("#dashboardContent");
  if (!child) {
    noChild.hidden = false;
    content.hidden = true;
    return;
  }
  noChild.hidden = true;
  content.hidden = false;

  const progress = getChildProgress(child.id);
  const summary = summarizeProgress(progress);
  const assignments = getChildAssignments(parent, progress);
  document.querySelectorAll("[data-child-name]").forEach((node) => { node.textContent = child.firstName; });
  document.querySelector("#passedCount").textContent = summary.passed;
  document.querySelector("#practicedCount").textContent = summary.practiced;
  document.querySelector("#practiceCount").textContent = summary.needsPractice;
  document.querySelector("#attemptCount").textContent = summary.attempts;
  document.querySelector("#progressFill").style.width = `${summary.practiced * 10}%`;
  document.querySelector("#progressText").textContent = `${summary.practiced} จาก 10 คำ`;
  document.querySelector("#assignmentList").innerHTML = renderAssignments(assignments.slice(0, 4));
  document.querySelector("#recommendationList").innerHTML = renderRecommendations(getRecommendedWords(progress));
}

function renderAssignments(assignments) {
  if (!assignments.length) return `<div class="empty-state">ยังไม่มีงานที่คุณครูมอบหมาย</div>`;
  return assignments.map((item) => `
    <article class="assignment-row">
      <span class="row-icon ${item.childCompleted ? "row-icon--green" : "row-icon--blue"} material-symbols-rounded" aria-hidden="true">${item.childCompleted ? "task_alt" : "pending_actions"}</span>
      <div class="row-main"><strong>${escapeHtml(item.title)}</strong><small>กำหนดส่ง ${formatThaiDate(item.dueDate)} · ฝึกแล้ว ${item.practicedWords}/${item.wordIds.length} คำ</small><div class="mini-progress"><span style="width:${Math.round(item.practicedWords / item.wordIds.length * 100)}%"></span></div></div>
      <span class="badge badge--${item.childCompleted ? "done" : "active"}">${item.childCompleted ? "ครบแล้ว" : item.status === "completed" ? "คุณครูปิดงานแล้ว" : "กำลังฝึก"}</span>
    </article>`).join("");
}

function renderRecommendations(items) {
  if (!items.length) return `<div class="empty-state"><strong>ผ่านครบทุกคำแล้ว</strong><span>ยอดเยี่ยมมาก</span></div>`;
  return items.map((item) => `
    <article class="practice-row">
      <span class="word-chip">${escapeHtml(item.text)}</span>
      <div class="row-main"><strong>${statusLabel(item.state.status)}</strong><small>${item.hint}</small></div>
      <button class="icon-button icon-button--audio" type="button" data-audio-word="${escapeHtml(item.id)}" title="ฟังคำว่า ${escapeHtml(item.text)}" aria-label="ฟังคำว่า ${escapeHtml(item.text)}"><span class="material-symbols-rounded" aria-hidden="true">volume_up</span></button>
    </article>`).join("");
}

function bindAudioButtons() {
  document.querySelectorAll("[data-audio-word]").forEach((button) => {
    button.addEventListener("click", async () => {
      const word = getRecommendedWords(getChildProgress(getSelectedChild(auth.user).id), 10).find((item) => item.id === button.dataset.audioWord);
      if (!word) return;
      audio?.pause();
      audio = new Audio(getAudioUrl(word));
      button.classList.add("is-playing");
      try { await audio.play(); } catch { /* The browser may block audio until another gesture. */ }
      audio.addEventListener("ended", () => button.classList.remove("is-playing"), { once: true });
    });
  });
}
