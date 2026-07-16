import {
  bindParentShell, escapeHtml, getChildProgress, getLinkedChildren, getParentSettings,
  requireParentSession, saveParentSettings, summarizeProgress
} from "./core.js";

const auth = requireParentSession();

if (auth) {
  bindParentShell(auth.user);
  renderProfile(auth.user);
  bindSettings(auth.user);
}

function renderProfile(parent) {
  document.querySelector("#parentFullName").textContent = `${parent.firstName} ${parent.lastName}`;
  document.querySelector("#parentEmail").textContent = parent.email;
  document.querySelector("#parentSchool").textContent = parent.school;
  const children = getLinkedChildren(parent);
  document.querySelector("#linkedChildCount").textContent = children.length;
  document.querySelector("#childList").innerHTML = children.length ? children.map((child) => {
    const summary = summarizeProgress(getChildProgress(child.id));
    return `<article class="child-row"><span class="avatar avatar--child material-symbols-rounded" aria-hidden="true">face</span><div class="row-main"><strong>${escapeHtml(child.firstName)} ${escapeHtml(child.lastName)}</strong><small>ฝึกแล้ว ${summary.practiced}/10 คำ · ผ่านจริง ${summary.passed} คำ</small><div class="mini-progress"><span style="width:${summary.practiced * 10}%"></span></div></div><a class="icon-button" href="p_002.html" title="ดูพัฒนาการ" aria-label="ดูพัฒนาการของ ${escapeHtml(child.firstName)}"><span class="material-symbols-rounded" aria-hidden="true">chevron_right</span></a></article>`;
  }).join("") : `<div class="empty-state">ยังไม่มีบัญชีนักเรียนในโรงเรียนเดียวกัน</div>`;
}

function bindSettings(parent) {
  const settings = getParentSettings(parent.id);
  const weekly = document.querySelector("#weeklyReport");
  const reminder = document.querySelector("#practiceReminder");
  weekly.checked = settings.weeklyReport;
  reminder.checked = settings.practiceReminder;
  [weekly, reminder].forEach((input) => input.addEventListener("change", () => {
    saveParentSettings(parent.id, { weeklyReport: weekly.checked, practiceReminder: reminder.checked });
    const message = document.querySelector("#settingsMessage");
    message.textContent = "บันทึกการตั้งค่าแล้ว";
    window.setTimeout(() => { message.textContent = ""; }, 1800);
  }));
}
