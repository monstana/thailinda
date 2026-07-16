import { WORDS, WORD_BY_ID } from "./data/words.js";
import {
  bindSharedHeader,
  getProgress,
  markDemoCompleted,
  markLessonComplete,
  markNeedsPractice,
  normalizeThai,
  recordNoSpeech,
  recordRecognition,
  requireStudentSession,
  setCurrentWord
} from "./core.js";

const context = requireStudentSession();
if (context) {
  const { user } = context;
  bindSharedHeader(user);

  const params = new URLSearchParams(window.location.search);
  const returnPage = params.get("return");
  let progress = getProgress(user.id);
  let currentId = WORD_BY_ID[params.get("word")] ? params.get("word") : progress.currentWordId;
  let currentIndex = Math.max(0, WORDS.findIndex((word) => word.id === currentId));
  let demoMode = false;
  let recognition = null;
  let recognitionHandled = false;
  let listening = false;
  let audio = new Audio();

  const visual = document.querySelector("#wordVisual");
  const wordText = document.querySelector("#wordText");
  const wordHint = document.querySelector("#wordHint");
  const stepText = document.querySelector("#stepText");
  const progressBar = document.querySelector("#lessonProgressBar");
  const listenButton = document.querySelector("#listenButton");
  const micButton = document.querySelector("#micButton");
  const micLabel = document.querySelector("#micLabel");
  const feedback = document.querySelector("#feedback");
  const feedbackIcon = document.querySelector("#feedbackIcon");
  const feedbackTitle = document.querySelector("#feedbackTitle");
  const feedbackDetail = document.querySelector("#feedbackDetail");
  const nextButton = document.querySelector("#nextButton");
  const skipButton = document.querySelector("#skipButton");
  const fallback = document.querySelector("#speechFallback");
  const fallbackText = document.querySelector("#fallbackText");
  const demoButton = document.querySelector("#demoButton");

  function currentWord() {
    return WORDS[currentIndex];
  }

  function stateForCurrent() {
    return getProgress(user.id).words[currentWord().id];
  }

  function setFeedback(type, title, detail) {
    const icons = { neutral: "tips_and_updates", listening: "graphic_eq", success: "check_circle", retry: "refresh", warning: "info" };
    feedback.className = `feedback feedback--${type}`;
    feedbackIcon.textContent = icons[type] || icons.neutral;
    feedbackTitle.textContent = title;
    feedbackDetail.textContent = detail;
  }

  function renderWord() {
    const word = currentWord();
    progress = setCurrentWord(user.id, word.id);
    const state = progress.words[word.id];
    stepText.textContent = `คำที่ ${word.order} จาก ${WORDS.length}`;
    progressBar.style.width = `${word.order * 10}%`;
    progressBar.setAttribute("aria-valuenow", String(word.order * 10));
    wordText.textContent = word.text;
    wordHint.textContent = word.hint;
    visual.className = `word-visual word-visual--${word.visualType}`;
    visual.innerHTML = word.visualType === "image"
      ? `<img src="${word.imagePath}" alt="${word.imageAlt}">`
      : `<div class="typographic-card" aria-label="${word.imageAlt}"><span>${word.text}</span><i aria-hidden="true">ก ข ค</i></div>`;

    audio.pause();
    audio = new Audio(word.audioPath);
    audio.volume = progress.settings.volume / 100;
    audio.addEventListener("ended", () => listenButton.classList.remove("is-playing"));
    nextButton.hidden = true;
    skipButton.hidden = state.attempts < 2 || state.status === "passed";
    micButton.disabled = false;
    micButton.classList.remove("is-listening", "is-success");
    micLabel.textContent = demoMode ? "แตะเพื่อทดลอง" : "แตะแล้วพูด";

    if (state.status === "passed") {
      setFeedback("success", "คำนี้ผ่านแล้ว", "ลองพูดอีกครั้งเพื่อทบทวน หรือไปคำถัดไปได้เลย");
      nextButton.hidden = false;
    } else if (state.status === "demoCompleted") {
      setFeedback("warning", "ฝึกในโหมดทดลองแล้ว", "ผลนี้ไม่ใช่การประเมินเสียงจริง");
      nextButton.hidden = false;
    } else if (state.status === "needsPractice") {
      setFeedback("retry", "คำนี้รอทบทวน", "ฟังเสียงตัวอย่าง แล้วลองพูดอีกครั้งนะ");
    } else {
      setFeedback("neutral", "ฟังก่อน แล้วค่อยพูด", "ระบบจะตรวจว่าคำที่ได้ยินตรงกับบัตรคำหรือไม่");
    }
  }

  function showFallback(message) {
    fallback.hidden = false;
    fallbackText.textContent = message;
  }

  function hideFallback() {
    fallback.hidden = true;
  }

  function finishListening() {
    listening = false;
    micButton.classList.remove("is-listening");
    micLabel.textContent = demoMode ? "แตะเพื่อทดลอง" : "แตะแล้วพูด";
  }

  function handleRecognitionResult(event) {
    recognitionHandled = true;
    const alternatives = Array.from(event.results[0] || []).map((item) => item.transcript.trim()).filter(Boolean);
    const target = normalizeThai(currentWord().text);
    const passed = alternatives.some((text) => normalizeThai(text) === target);
    progress = recordRecognition(user.id, currentWord().id, alternatives, passed);
    finishListening();

    if (passed) {
      micButton.classList.add("is-success");
      setFeedback("success", "ผ่านแล้ว เก่งมาก!", `ระบบได้ยินว่า “${alternatives[0]}”`);
      nextButton.hidden = false;
      skipButton.hidden = true;
    } else {
      const heard = alternatives[0] || "ไม่ชัดเจน";
      setFeedback("retry", "เกือบแล้ว ลองอีกครั้ง", `ระบบได้ยินว่า “${heard}” แต่คำนี้คือ “${currentWord().text}”`);
      const currentState = progress.words[currentWord().id];
      skipButton.hidden = currentState.status === "passed" || currentState.attempts < 2;
    }
  }

  function handleRecognitionError(event) {
    recognitionHandled = true;
    finishListening();
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setFeedback("warning", "ยังใช้ไมโครโฟนไม่ได้", "อนุญาตไมโครโฟนในเบราว์เซอร์แล้วลองใหม่");
      showFallback("เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน คุณสามารถอนุญาตใหม่หรือใช้โหมดทดลองได้");
      return;
    }
    if (event.error === "audio-capture") {
      setFeedback("warning", "ไม่พบไมโครโฟน", "ตรวจสอบไมโครโฟนของอุปกรณ์แล้วลองใหม่");
      showFallback("ไม่พบไมโครโฟนที่พร้อมใช้งาน");
      return;
    }
    if (event.error === "no-speech") {
      progress = recordNoSpeech(user.id, currentWord().id);
      setFeedback("retry", "ยังไม่ได้ยินเสียง", "ขยับเข้าใกล้ไมโครโฟน แล้วพูดอีกครั้งนะ");
      const currentState = progress.words[currentWord().id];
      skipButton.hidden = currentState.status === "passed" || currentState.attempts < 2;
      return;
    }
    setFeedback("warning", "ตรวจเสียงไม่สำเร็จ", "ตรวจอินเทอร์เน็ตแล้วลองใหม่ หรือใช้โหมดทดลอง");
    showFallback("บริการรู้จำเสียงอาจไม่พร้อมใช้งานชั่วคราว");
  }

  function startRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      showFallback("อุปกรณ์นี้ไม่รองรับการรู้จำเสียงภาษาไทย กรุณาใช้ Chrome หรือ Edge รุ่นปัจจุบัน");
      setFeedback("warning", "อุปกรณ์ยังตรวจเสียงไม่ได้", "เปิดด้วย Chrome หรือ Edge หรือใช้โหมดทดลอง");
      return;
    }

    recognition = new Recognition();
    recognition.lang = "th-TH";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
    recognitionHandled = false;
    recognition.onresult = handleRecognitionResult;
    recognition.onerror = handleRecognitionError;
    recognition.onend = () => {
      if (!recognitionHandled && listening) {
        progress = recordNoSpeech(user.id, currentWord().id);
        setFeedback("retry", "หมดเวลาฟังแล้ว", "แตะไมโครโฟนและลองพูดอีกครั้งนะ");
        const currentState = progress.words[currentWord().id];
        skipButton.hidden = currentState.status === "passed" || currentState.attempts < 2;
      }
      finishListening();
    };

    try {
      recognition.start();
      listening = true;
      micButton.classList.add("is-listening");
      micLabel.textContent = "กำลังฟัง...";
      setFeedback("listening", "พูดได้เลย", `พูดคำว่า “${currentWord().text}” ให้ชัดเจน`);
      hideFallback();
    } catch {
      finishListening();
      setFeedback("warning", "ไมโครโฟนกำลังทำงาน", "รอสักครู่แล้วลองใหม่อีกครั้ง");
    }
  }

  listenButton.addEventListener("click", async () => {
    listenButton.classList.add("is-playing");
    listenButton.querySelector("span:first-child").textContent = "volume_up";
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      listenButton.classList.remove("is-playing");
      setFeedback("warning", "เปิดเสียงไม่ได้", "ตรวจสอบระดับเสียงหรือโหลดหน้าใหม่อีกครั้ง");
    }
  });
  micButton.addEventListener("click", () => {
    if (listening) {
      recognition?.stop();
      return;
    }
    if (demoMode) {
      micButton.disabled = true;
      micButton.classList.add("is-listening");
      micLabel.textContent = "กำลังทดลอง...";
      setFeedback("listening", "โหมดทดลอง", "ผลนี้จะไม่ถูกนับเป็นการผ่านจากเสียงจริง");
      window.setTimeout(() => {
        progress = markDemoCompleted(user.id, currentWord().id);
        micButton.disabled = false;
        micButton.classList.remove("is-listening");
        micButton.classList.add("is-success");
        micLabel.textContent = "ทดลองเสร็จแล้ว";
        setFeedback("warning", "ฝึกครบในโหมดทดลอง", "ไปคำถัดไปได้ แต่ผลจะติดป้ายว่าไม่ได้ตรวจเสียงจริง");
        nextButton.hidden = false;
        skipButton.hidden = true;
      }, 900);
      return;
    }
    startRecognition();
  });

  demoButton.addEventListener("click", () => {
    demoMode = true;
    hideFallback();
    micLabel.textContent = "แตะเพื่อทดลอง";
    setFeedback("warning", "กำลังใช้โหมดทดลอง", "ระบบจะไม่อ้างว่าเป็นผลประเมินเสียงจริง");
  });

  skipButton.addEventListener("click", () => {
    progress = markNeedsPractice(user.id, currentWord().id);
    goNext();
  });

  function goNext() {
    if (returnPage === "results") {
      window.location.href = "010.html";
      return;
    }
    if (returnPage === "dashboard") {
      window.location.href = "007.html";
      return;
    }
    if (currentIndex < WORDS.length - 1) {
      currentIndex += 1;
      const next = currentWord();
      window.history.replaceState({}, "", `012.html?word=${next.id}${returnPage ? `&return=${returnPage}` : ""}`);
      renderWord();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    markLessonComplete(user.id);
    document.querySelector("#completionDialog").showModal();
  }

  nextButton.addEventListener("click", goNext);
  document.querySelector("#closeFallback").addEventListener("click", hideFallback);
  renderWord();
}
