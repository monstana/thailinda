import { WORDS } from "./data/words.js";
import { bindSharedHeader, getProgress, getSummary, requireStudentSession } from "./core.js";

const context = requireStudentSession();
if (context) {
  const { user } = context;
  bindSharedHeader(user);
  const progress = getProgress(user.id);
  const summary = getSummary(progress);

  document.querySelector("#resultPassed").textContent = `${summary.passed}/${WORDS.length}`;
  document.querySelector("#resultAttempts").textContent = summary.attempts;
  document.querySelector("#resultPractice").textContent = summary.needsPractice;
  document.querySelector("#resultMessage").textContent = summary.passed === WORDS.length
    ? "ยอดเยี่ยม! ออกเสียงผ่านครบทุกคำแล้ว"
    : summary.practiced === 0
      ? "เริ่มบทเรียนแรก แล้วผลการฝึกจะมาอยู่ตรงนี้"
      : `ผ่านจริงแล้ว ${summary.passed} คำ ฝึกต่ออีกนิดนะ`;

  const list = document.querySelector("#resultList");
  list.innerHTML = WORDS.map((word) => {
    const state = progress.words[word.id];
    const labels = {
      passed: ["ผ่าน", "check_circle"],
      needsPractice: ["ควรฝึกเพิ่ม", "refresh"],
      demoCompleted: ["โหมดทดลอง", "science"],
      notStarted: ["ยังไม่ได้ฝึก", "radio_button_unchecked"]
    };
    const [label, icon] = labels[state.status];
    return `<article class="result-row status-${state.status}">
      <div class="result-row__word">${word.text}</div>
      <div class="result-row__details">
        <strong><span class="material-symbols-rounded" aria-hidden="true">${icon}</span>${label}</strong>
        <span>${state.status === "demoCompleted" ? "ไม่ได้ตรวจเสียงจริง" : state.attempts ? `ลองแล้ว ${state.attempts} ครั้ง` : "พร้อมเริ่มฝึก"}</span>
      </div>
      <a class="icon-button" href="012.html?word=${word.id}&return=results" aria-label="ฝึกคำว่า ${word.text} อีกครั้ง" title="ฝึกอีกครั้ง">
        <span class="material-symbols-rounded" aria-hidden="true">play_arrow</span>
      </a>
    </article>`;
  }).join("");
}
