import { WORDS } from "./data/words.js";
import { bindSharedHeader, getNextWordId, getProgress, getSummary, requireStudentSession } from "./core.js";

const context = requireStudentSession();
if (context) {
  const { user } = context;
  bindSharedHeader(user);
  const progress = getProgress(user.id);
  const summary = getSummary(progress);
  const percent = Math.round((summary.practiced / WORDS.length) * 100);
  const nextWordId = getNextWordId(progress);
  const nextWord = WORDS.find((word) => word.id === nextWordId) || WORDS[0];

  document.querySelector("#welcomeName").textContent = user.firstName;
  document.querySelector("#progressText").textContent = `${summary.practiced}/${WORDS.length} คำ`;
  document.querySelector("#progressBar").style.width = `${percent}%`;
  document.querySelector("#progressBar").setAttribute("aria-valuenow", String(percent));
  document.querySelector("#passedCount").textContent = summary.passed;
  document.querySelector("#practiceCount").textContent = summary.needsPractice;
  document.querySelector("#nextWord").textContent = nextWord.text;

  const cta = document.querySelector("#lessonCta");
  cta.href = `012.html?word=${encodeURIComponent(nextWord.id)}`;
  cta.querySelector("span:first-child").textContent = summary.practiced === 0 ? "เริ่มบทเรียน" : summary.practiced < WORDS.length ? "เรียนต่อ" : "ทบทวนอีกครั้ง";

  const grid = document.querySelector("#wordPreview");
  grid.innerHTML = WORDS.map((word) => {
    const state = progress.words[word.id];
    const icon = state.status === "passed" ? "check_circle" : state.status === "needsPractice" ? "refresh" : state.status === "demoCompleted" ? "science" : "lock_open";
    return `<a class="word-chip status-${state.status}" href="012.html?word=${word.id}&return=dashboard" aria-label="ฝึกคำว่า ${word.text}">
      <span class="word-chip__text">${word.text}</span>
      <span class="material-symbols-rounded" aria-hidden="true">${icon}</span>
    </a>`;
  }).join("");
}

