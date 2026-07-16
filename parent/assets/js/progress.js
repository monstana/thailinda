import {
  WORDS, bindParentShell, escapeHtml, formatDateTime, getChildProgress,
  getLinkedChildren, getSelectedChild, requireParentSession, setSelectedChild,
  statusLabel, summarizeProgress
} from "./core.js";

const auth = requireParentSession();

if (auth) {
  bindParentShell(auth.user);
  setupChildSelector(auth.user);
  renderProgress(auth.user);
}

function setupChildSelector(parent) {
  const children = getLinkedChildren(parent);
  const selected = getSelectedChild(parent, children);
  const select = document.querySelector("#childSelector");
  select.innerHTML = children.map((child) => `<option value="${escapeHtml(child.id)}" ${child.id === selected?.id ? "selected" : ""}>${escapeHtml(child.firstName)} ${escapeHtml(child.lastName)}</option>`).join("");
  select.hidden = children.length < 2;
  select.addEventListener("change", () => {
    setSelectedChild(parent.id, select.value);
    renderProgress(parent);
  });
}

function renderProgress(parent) {
  const child = getSelectedChild(parent);
  const panel = document.querySelector("#progressContent");
  if (!child) {
    panel.innerHTML = `<div class="empty-state empty-state--large"><span class="material-symbols-rounded" aria-hidden="true">person_off</span><strong>ยังไม่มีบัญชีนักเรียนที่เชื่อมต่อ</strong></div>`;
    return;
  }
  const progress = getChildProgress(child.id);
  const summary = summarizeProgress(progress);
  document.querySelectorAll("[data-child-name]").forEach((node) => { node.textContent = child.firstName; });
  panel.innerHTML = `
    <section class="progress-overview">
      <div class="progress-ring" style="--value:${summary.practiced * 10}"><span><strong>${summary.practiced}</strong><small>/ 10 คำ</small></span></div>
      <div class="progress-copy"><p class="eyebrow">ภาพรวมการฝึก</p><h2>${escapeHtml(child.firstName)} ${escapeHtml(child.lastName)}</h2><p>อัปเดตล่าสุด ${formatDateTime(progress.updatedAt)}</p></div>
      <div class="summary-strip"><div><strong>${summary.passed}</strong><span>ผ่านจริง</span></div><div><strong>${summary.demo}</strong><span>โหมดทดลอง</span></div><div><strong>${summary.needsPractice}</strong><span>ควรฝึกเพิ่ม</span></div><div><strong>${summary.attempts}</strong><span>ครั้งที่ลอง</span></div></div>
    </section>
    <section class="panel word-report"><div class="panel-head"><div><h2>ผลรายคำ</h2><p>ผลผ่านจริงอ้างอิงจากการรู้จำเสียงตรงกับคำเป้าหมาย</p></div></div><div class="word-report-grid">${WORDS.map((word) => renderWord(word, progress.words[word.id])).join("")}</div></section>`;
}

function renderWord(word, state) {
  return `<article class="word-result">
    <span class="word-chip">${escapeHtml(word.text)}</span>
    <div class="word-result__main"><strong>${statusLabel(state.status)}</strong><small>${state.lastRecognizedText ? `ระบบได้ยิน “${escapeHtml(state.lastRecognizedText)}”` : word.hint}</small></div>
    <div class="word-result__meta"><strong>${state.attempts}</strong><span>ครั้ง</span></div>
    <span class="status-dot status-dot--${state.status}" aria-hidden="true"></span>
  </article>`;
}
