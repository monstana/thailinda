import { demoUsers, getAllUsers, resolveUserForPin, roleMeta, saveRegisteredUser } from "./data/users.js";

const splash = document.querySelector("#splash");
const authShell = document.querySelector("#authShell");
const loginView = document.querySelector("#loginView");
const registerView = document.querySelector("#registerView");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const loginMessage = document.querySelector("#loginMessage");
const registerMessage = document.querySelector("#registerMessage");
const userPicker = document.querySelector("#userPicker");
const userList = document.querySelector("#userList");
const toast = document.querySelector("#toast");

let currentUser = resolveInitialUser();
let lastFocusedElement = null;

const splashDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 1350;
window.setTimeout(() => {
  authShell.classList.remove("is-hidden");
  splash.classList.add("is-leaving");
  window.setTimeout(() => splash.remove(), 350);
  focusFirstPin("#loginPin");
}, splashDelay);

setupPinGroups();
renderCurrentUser();
renderUserList();

document.querySelector("#switchUserButton").addEventListener("click", openUserPicker);
document.querySelector("#switchUserText").addEventListener("click", openUserPicker);
document.querySelectorAll("[data-close-picker]").forEach((button) => button.addEventListener("click", closeUserPicker));

document.querySelector("#showRegister").addEventListener("click", showRegister);
document.querySelector("#backToLogin").addEventListener("click", showLogin);

document.querySelectorAll("[data-demo-user]").forEach((button) => {
  button.addEventListener("click", () => {
    const user = demoUsers.find((item) => item.role === button.dataset.demoUser);
    if (!user) return;
    selectUser(user);
    fillPin(document.querySelector("#loginPin"), user.pin);
  });
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const group = document.querySelector("#loginPin");
  const pin = getPin(group);
  clearPinState(group);

  if (pin.length !== 4) {
    setPinError(group, "กรุณาใส่รหัส PIN ให้ครบ 4 หลัก");
    return;
  }

  const pinResult = resolveUserForPin(currentUser, pin);
  const authenticatedUser = pinResult.user;

  if (!authenticatedUser) {
    const message = pinResult.ambiguous
      ? "PIN นี้ตรงกับหลายบัญชี กรุณาเลือกผู้ใช้งานก่อน"
      : "PIN ไม่ถูกต้อง ลองอีกครั้งนะ";
    setPinError(group, message);
    window.setTimeout(() => clearPin(group, true), 480);
    return;
  }

  if (authenticatedUser.id !== currentUser.id) {
    currentUser = authenticatedUser;
    renderCurrentUser();
  }

  group.classList.add("has-success");
  loginMessage.textContent = `ถูกต้อง กำลังเข้าสู่ระบบ${roleMeta[currentUser.role].label}`;
  loginMessage.style.color = "var(--success)";
  const button = document.querySelector("#loginButton");
  button.disabled = true;
  button.querySelector("span:first-child").textContent = "เข้าสู่ระบบสำเร็จ";
  localStorage.setItem("thailinda.lastUserId", currentUser.id);
  localStorage.setItem("thailinda.session", JSON.stringify({ userId: currentUser.id, role: currentUser.role }));

  window.setTimeout(() => {
    window.location.href = roleMeta[currentUser.role].route;
  }, 700);
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  registerMessage.textContent = "";
  registerForm.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));

  const formData = new FormData(registerForm);
  const requiredFields = [...registerForm.querySelectorAll("input[required]:not([type='checkbox'])")];
  const emptyField = requiredFields.find((field) => !field.value.trim());
  const emailField = registerForm.elements.email;
  const pinGroup = document.querySelector("#registerPin");
  const pin = getPin(pinGroup);

  if (emptyField) {
    emptyField.classList.add("is-invalid");
    emptyField.focus();
    registerMessage.textContent = "กรุณากรอกข้อมูลให้ครบทุกช่อง";
    return;
  }

  if (!emailField.validity.valid) {
    emailField.classList.add("is-invalid");
    emailField.focus();
    registerMessage.textContent = "กรุณาตรวจสอบรูปแบบอีเมล";
    return;
  }

  if (getAllUsers().some((user) => user.email.toLowerCase() === emailField.value.trim().toLowerCase())) {
    emailField.classList.add("is-invalid");
    emailField.focus();
    registerMessage.textContent = "อีเมลนี้มีบัญชีอยู่แล้ว";
    return;
  }

  if (pin.length !== 4) {
    setPinError(pinGroup, "กรุณาตั้งรหัส PIN ให้ครบ 4 หลัก", registerMessage);
    return;
  }

  if (!registerForm.elements.terms.checked) {
    registerForm.elements.terms.focus();
    registerMessage.textContent = "กรุณายอมรับข้อกำหนดก่อนสร้างบัญชี";
    return;
  }

  const user = {
    id: `user-${Date.now()}`,
    role: formData.get("role"),
    firstName: formData.get("firstName").trim(),
    lastName: formData.get("lastName").trim(),
    school: formData.get("school").trim(),
    email: formData.get("email").trim(),
    pin
  };

  saveRegisteredUser(user);
  currentUser = user;
  localStorage.setItem("thailinda.lastUserId", user.id);
  renderCurrentUser();
  renderUserList();
  registerForm.reset();
  clearPin(pinGroup);
  showLogin();
  showToast(`สร้างบัญชีของ ${user.firstName} เรียบร้อยแล้ว`);
});

userList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-user-id]");
  if (!button) return;
  const user = getAllUsers().find((item) => item.id === button.dataset.userId);
  if (user) selectUser(user);
});

userPicker.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeUserPicker();
});

function resolveInitialUser() {
  const users = getAllUsers();
  const lastUserId = localStorage.getItem("thailinda.lastUserId");
  return users.find((user) => user.id === lastUserId) || users[0];
}

function renderCurrentUser() {
  const meta = roleMeta[currentUser.role];
  const avatar = document.querySelector("#profileAvatar");
  document.querySelector("#profileName").textContent = currentUser.firstName;
  document.querySelector("#roleGreeting").textContent = meta.greeting;
  document.querySelector("#profileIcon").textContent = meta.icon;
  avatar.className = `profile-avatar profile-avatar--${currentUser.role}`;
  clearPin(document.querySelector("#loginPin"));
}

function renderUserList() {
  userList.innerHTML = getAllUsers().map((user) => {
    const meta = roleMeta[user.role];
    return `
      <button class="user-list__item" type="button" data-user-id="${escapeHtml(user.id)}">
        <span class="user-list__avatar profile-avatar--${user.role}">
          <span class="material-symbols-rounded" aria-hidden="true">${meta.icon}</span>
        </span>
        <span class="user-list__copy">
          <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong>
          <span>${meta.label} · ${escapeHtml(user.school)}</span>
        </span>
        <span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>
      </button>`;
  }).join("");
}

function selectUser(user) {
  currentUser = user;
  localStorage.setItem("thailinda.lastUserId", user.id);
  renderCurrentUser();
  closeUserPicker();
  focusFirstPin("#loginPin");
}

function showRegister() {
  loginView.classList.add("is-hidden");
  registerView.classList.remove("is-hidden");
  registerForm.elements.firstName.focus();
}

function showLogin() {
  registerView.classList.add("is-hidden");
  loginView.classList.remove("is-hidden");
  registerMessage.textContent = "";
  focusFirstPin("#loginPin");
}

function openUserPicker() {
  lastFocusedElement = document.activeElement;
  renderUserList();
  userPicker.classList.remove("is-hidden");
  document.body.style.overflow = "hidden";
  userList.querySelector("button")?.focus();
}

function closeUserPicker() {
  userPicker.classList.add("is-hidden");
  document.body.style.overflow = "";
  lastFocusedElement?.focus();
}

function setupPinGroups() {
  document.querySelectorAll("[data-pin-group]").forEach((group) => {
    const inputs = [...group.querySelectorAll("[data-pin-input]")];
    inputs.forEach((input, index) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(-1);
        clearPinState(group);
        if (input.value && inputs[index + 1]) inputs[index + 1].focus();
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && inputs[index - 1]) inputs[index - 1].focus();
        if (event.key === "ArrowLeft" && inputs[index - 1]) inputs[index - 1].focus();
        if (event.key === "ArrowRight" && inputs[index + 1]) inputs[index + 1].focus();
      });

      input.addEventListener("paste", (event) => {
        const value = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
        if (!value) return;
        event.preventDefault();
        fillPin(group, value);
      });
    });
  });
}

function fillPin(group, value) {
  const inputs = [...group.querySelectorAll("[data-pin-input]")];
  inputs.forEach((input, index) => { input.value = value[index] || ""; });
  inputs[Math.min(value.length, inputs.length) - 1]?.focus();
  clearPinState(group);
}

function getPin(group) {
  return [...group.querySelectorAll("[data-pin-input]")].map((input) => input.value).join("");
}

function clearPin(group, refocus = false) {
  group.querySelectorAll("[data-pin-input]").forEach((input) => { input.value = ""; });
  clearPinState(group);
  if (refocus) group.querySelector("[data-pin-input]")?.focus();
}

function clearPinState(group) {
  group.classList.remove("has-error", "has-success");
  if (group.id === "loginPin") {
    loginMessage.textContent = "";
    loginMessage.removeAttribute("style");
  }
}

function setPinError(group, message, target = loginMessage) {
  group.classList.remove("has-success");
  group.classList.add("has-error");
  target.textContent = message;
  group.querySelector("[data-pin-input]")?.focus();
}

function focusFirstPin(selector) {
  window.setTimeout(() => document.querySelector(`${selector} [data-pin-input]`)?.focus(), 50);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
