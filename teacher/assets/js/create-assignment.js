import { WORDS, addAssignment, bindTeacherShell, escapeHtml, requireTeacherSession } from "./core.js";

const auth = requireTeacherSession();

if (auth) {
  bindTeacherShell(auth.user);
  renderWords();
  setDefaultDate();
  bindForm();
}

function renderWords() {
  document.querySelector("#wordChoices").innerHTML = WORDS.map((word) => `
    <label class="word-choice">
      <input type="checkbox" name="wordIds" value="${escapeHtml(word.id)}" checked>
      <span>${escapeHtml(word.text)}</span>
    </label>`).join("");
  updateSelectedCount();
}

function setDefaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  document.querySelector("#dueDate").value = date.toISOString().slice(0, 10);
  document.querySelector("#dueDate").min = new Date().toISOString().slice(0, 10);
}

function bindForm() {
  const form = document.querySelector("#assignmentForm");
  form.addEventListener("change", updateSelectedCount);
  document.querySelector("#selectAllWords").addEventListener("click", () => setAllWords(true));
  document.querySelector("#clearWords").addEventListener("click", () => setAllWords(false));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const wordIds = formData.getAll("wordIds");
    const dueDate = String(formData.get("dueDate") || "");
    const message = document.querySelector("#formMessage");

    if (!title) return showError(message, "กรุณาระบุชื่อการสั่งงาน", form.elements.title);
    if (!wordIds.length) return showError(message, "เลือกคำศัพท์อย่างน้อย 1 คำ", document.querySelector("#wordChoices input"));
    if (!dueDate) return showError(message, "กรุณาเลือกกำหนดส่ง", form.elements.dueDate);

    addAssignment(auth.user.id, { title, wordIds, dueDate, classroomId: formData.get("classroomId") });
    window.location.href = "t_002.html?created=1";
  });
}

function setAllWords(checked) {
  document.querySelectorAll("#wordChoices input").forEach((input) => { input.checked = checked; });
  updateSelectedCount();
}

function updateSelectedCount() {
  const count = document.querySelectorAll("#wordChoices input:checked").length;
  document.querySelector("#selectedCount").textContent = `เลือกแล้ว ${count} จาก ${WORDS.length} คำ`;
}

function showError(node, text, target) {
  node.textContent = text;
  target?.focus();
}
