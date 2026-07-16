import { bindSharedHeader, clearProgress, getProgress, getSummary, logout, requireStudentSession, setVolume } from "./core.js";

const context = requireStudentSession();
if (context) {
  const { user } = context;
  bindSharedHeader(user);
  let progress = getProgress(user.id);
  let summary = getSummary(progress);

  document.querySelector("#profileName").textContent = `${user.firstName} ${user.lastName}`;
  document.querySelector("#profileSchool").textContent = user.school;
  document.querySelector("#profileEmail").textContent = user.email;
  document.querySelector("#profilePassed").textContent = summary.passed;
  document.querySelector("#profilePracticed").textContent = summary.practiced;

  const volume = document.querySelector("#volumeControl");
  const volumeValue = document.querySelector("#volumeValue");
  volume.value = progress.settings.volume;
  volumeValue.textContent = `${progress.settings.volume}%`;
  volume.addEventListener("input", () => {
    volumeValue.textContent = `${volume.value}%`;
    setVolume(user.id, volume.value);
  });

  document.querySelector("#logoutButton").addEventListener("click", logout);

  const dialog = document.querySelector("#resetDialog");
  document.querySelector("#openResetDialog").addEventListener("click", () => dialog.showModal());
  document.querySelector("#cancelReset").addEventListener("click", () => dialog.close());
  document.querySelector("#confirmReset").addEventListener("click", () => {
    clearProgress(user.id);
    dialog.close();
    window.location.href = "007.html";
  });
}

