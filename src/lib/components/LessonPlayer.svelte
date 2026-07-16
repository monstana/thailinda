<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { evaluateSpeechWithApi, isApiEnabled } from '$lib/api.js';
  import { recordAssessment } from '$lib/storage.js';

  let { items, index, user, basePath, exitHref = '/student', assignmentTitle = '' } = $props();
  let current = $derived(items[index]);
  let status = $state('idle');
  let cameraOn = $state(false);
  let cameraError = $state('');
  let micMessage = $state('');
  let recognizedText = $state('');
  let audioMessage = $state('');
  let isSpeaking = $state(false);
  let videoElement = $state();
  let cameraStream;
  let currentAudio;
  let thaiVoice;
  let volume = 0.8;
  let micStream;
  let recordingContext;
  let recordingSource;
  let recordingProcessor;
  let recordingChunks = [];
  let recordingSampleRate = 44100;
  let holdStartedAt = 0;
  let captureToken = 0;
  let isHolding = $state(false);
  let analysisStarted = false;

  onMount(() => {
    try {
      const settings = JSON.parse(localStorage.getItem('thailinda.studentSettings.v1') || '{}');
      volume = Math.min(1, Math.max(0, (settings[user.id]?.volume ?? 80) / 100));
    } catch {
      volume = 0.8;
    }
    loadThaiVoice();
    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = loadThaiVoice;
    return () => {
      stopCamera();
      stopAudio();
      releaseMicrophone();
      captureToken += 1;
      if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = null;
    };
  });

  function loadThaiVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    thaiVoice = voices.find((voice) => voice.name.includes('Premwadee')) || voices.find((voice) => voice.lang?.toLowerCase().startsWith('th'));
  }

  function stopAudio() {
    currentAudio?.pause();
    currentAudio = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    isSpeaking = false;
  }

  async function listen() {
    if (!current || isSpeaking) return;
    stopAudio();
    audioMessage = '';
    isSpeaking = true;
    currentAudio = new Audio(current.audioPath);
    currentAudio.volume = volume;
    currentAudio.onended = () => { isSpeaking = false; currentAudio = null; };
    currentAudio.onerror = () => speakWithBrowser();
    try {
      await currentAudio.play();
    } catch {
      speakWithBrowser();
    }
  }

  function speakWithBrowser() {
    currentAudio?.pause();
    currentAudio = null;
    if (!('speechSynthesis' in window)) {
      isSpeaking = false;
      audioMessage = 'อุปกรณ์นี้ไม่รองรับการเล่นเสียง กรุณาลองใช้ Chrome หรือ Edge';
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.audioText || current.sound);
    utterance.lang = 'th-TH';
    utterance.voice = thaiVoice || null;
    utterance.rate = 0.78;
    utterance.pitch = 1;
    utterance.volume = volume;
    utterance.onend = () => { isSpeaking = false; };
    utterance.onerror = () => {
      isSpeaking = false;
      audioMessage = 'เล่นเสียงไม่ได้ กรุณาตรวจระดับเสียงของอุปกรณ์แล้วลองอีกครั้ง';
    };
    window.speechSynthesis.speak(utterance);
  }

  function startSpeaking(event) {
    if (!current || status === 'analyzing' || isHolding) return;
    event?.preventDefault();
    if (event?.pointerId != null) event.currentTarget.setPointerCapture?.(event.pointerId);
    stopAudio();
    micMessage = '';
    recognizedText = '';
    analysisStarted = false;
    isHolding = true;
    holdStartedAt = Date.now();
    status = 'listening';
    const token = ++captureToken;

    if (!navigator.mediaDevices?.getUserMedia) {
      micMessage = 'อุปกรณ์นี้ไม่รองรับไมโครโฟน กรุณาใช้ Chrome หรือ Edge รุ่นปัจจุบัน';
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(async (stream) => {
      if (token !== captureToken || !isHolding || status !== 'listening') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('audio-context-unavailable');
        micStream = stream;
        recordingContext = new AudioContextClass();
        await recordingContext.resume();
        recordingSampleRate = recordingContext.sampleRate;
        recordingChunks = [];
        recordingSource = recordingContext.createMediaStreamSource(stream);
        recordingProcessor = recordingContext.createScriptProcessor(4096, 1, 1);
        recordingProcessor.onaudioprocess = (audioEvent) => {
          if (!isHolding) return;
          recordingChunks.push(new Float32Array(audioEvent.inputBuffer.getChannelData(0)));
        };
        recordingSource.connect(recordingProcessor);
        recordingProcessor.connect(recordingContext.destination);
      } catch {
        releaseMicrophone();
        if (token === captureToken) micMessage = 'อุปกรณ์นี้ไม่สามารถบันทึกเสียงได้ กรุณาลองใช้ Chrome หรือ Edge';
      }
    }).catch(() => {
      if (token === captureToken) micMessage = 'ไม่สามารถใช้ไมโครโฟนได้ กรุณาอนุญาตสิทธิ์ไมโครโฟนแล้วลองใหม่';
    });
  }

  function releaseMicrophone() {
    if (recordingProcessor) {
      recordingProcessor.onaudioprocess = null;
      recordingProcessor.disconnect();
    }
    recordingSource?.disconnect();
    recordingContext?.close().catch(() => {});
    micStream?.getTracks().forEach((track) => track.stop());
    micStream = null;
    recordingProcessor = null;
    recordingSource = null;
    recordingContext = null;
  }

  function finishRecording() {
    const chunks = recordingChunks;
    const sampleRate = recordingSampleRate;
    recordingChunks = [];
    releaseMicrophone();
    if (!chunks.length) return null;
    return encodeWav(chunks, sampleRate);
  }

  function encodeWav(chunks, sampleRate) {
    const sampleCount = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);
    const writeText = (offset, value) => {
      for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
    };
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, sampleCount * 2, true);
    let offset = 44;
    for (const chunk of chunks) {
      for (const sample of chunk) {
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  async function finishSpeaking(event) {
    event?.preventDefault();
    if (!isHolding || status !== 'listening' || analysisStarted) return;
    isHolding = false;
    captureToken += 1;
    const audioBlob = finishRecording();

    if (Date.now() - holdStartedAt < 500) {
      status = 'idle';
      micMessage = 'กดปุ่มค้างไว้แล้วพูด เมื่อพูดจบจึงปล่อยปุ่ม';
      return;
    }

    if (!audioBlob || audioBlob.size < 1200) {
      status = 'idle';
      micMessage = micMessage || 'ยังไม่ได้ยินเสียง กรุณากดค้าง รอให้ไมโครโฟนพร้อม แล้วพูดอีกครั้ง';
      return;
    }

    analysisStarted = true;
    status = 'analyzing';
    try {
      let result;
      if (isApiEnabled()) {
        result = await evaluateSpeechWithApi(current.id, audioBlob);
      } else {
        const form = new FormData();
        form.append('targetId', current.id);
        form.append('audio', audioBlob, `${current.id}.wav`);
        const response = await fetch('/api/speech/evaluate', { method: 'POST', body: form });
        result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'ประเมินเสียงไม่สำเร็จ');
      }
      recognizedText = result.transcript || '';
      recordAssessment(user.id, current.id, result.passed, { mode: result.mode, transcript: recognizedText });
      status = result.passed ? 'correct' : 'incorrect';
    } catch (error) {
      status = 'idle';
      micMessage = error?.message || 'เชื่อมต่อบริการประเมินเสียงไม่ได้ กรุณาลองใหม่';
    } finally {
      analysisStarted = false;
    }
  }

  function handleSpeakKeyDown(event) {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) startSpeaking(event);
  }

  function handleSpeakKeyUp(event) {
    if (event.key === ' ' || event.key === 'Enter') finishSpeaking(event);
  }

  function categoryTitle(category) {
    if (category === 'words') return 'คำศัพท์พื้นฐาน';
    if (category === 'vowels') return 'สระไทย';
    return 'พยัญชนะไทย';
  }

  async function toggleCamera() {
    if (cameraOn) {
      stopCamera();
      return;
    }
    cameraError = '';
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      cameraOn = true;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (videoElement) videoElement.srcObject = cameraStream;
    } catch {
      cameraError = 'เปิดกล้องไม่ได้ กรุณาตรวจสิทธิ์กล้องของเบราว์เซอร์';
      cameraOn = false;
    }
  }

  function stopCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    cameraStream = null;
    cameraOn = false;
    if (videoElement) videoElement.srcObject = null;
  }

  function move(step) {
    const next = index + step;
    if (next < 0 || next >= items.length) return;
    status = 'idle';
    micMessage = '';
    audioMessage = '';
    isHolding = false;
    analysisStarted = false;
    captureToken += 1;
    recognizedText = '';
    recordingChunks = [];
    releaseMicrophone();
    stopAudio();
    goto(`${basePath}/${next}`);
  }
</script>

<svelte:head><title>{current?.name || 'บทเรียน'} | ไทยลินดา</title></svelte:head>

{#if current}
  <div class="lesson-player">
    <header class="lesson-topbar">
      <a class="icon-button" href={exitHref} aria-label="ออกจากบทเรียน" title="ออกจากบทเรียน"><span class="material-symbols-rounded" aria-hidden="true">close</span></a>
      <div class="lesson-progress-copy"><strong>{assignmentTitle || categoryTitle(current.category)}</strong><span>{index + 1} / {items.length}</span></div>
      <span class="ai-badge"><span class="status-pulse"></span>Typhoon AI</span>
    </header>
    <div class="lesson-progress-bar"><span style:width={`${((index + 1) / items.length) * 100}%`}></span></div>

    <main class="lesson-stage" class:with-camera={cameraOn}>
      <section class="character-stage">
        <p class="lesson-eyebrow">ดูตัวอักษร แล้วฟังเสียง</p>
        <div class="giant-character" class:is-vowel={current.category === 'vowels'} class:is-word={current.category === 'words'}>{current.display}</div>
        <h1>{current.name}</h1>
        <p class="sound-copy">ออกเสียงว่า <strong>“{current.sound}”</strong></p>
        <div class="mouth-tip"><span class="material-symbols-rounded" aria-hidden="true">record_voice_over</span><span><strong>รูปปาก</strong>{current.mouthCue}</span></div>

        <div class="lesson-actions">
          <button class="action-button action-button--listen" type="button" onclick={listen} disabled={isSpeaking}><span class="material-symbols-rounded" aria-hidden="true">{isSpeaking ? 'graphic_eq' : 'volume_up'}</span><span>{isSpeaking ? 'กำลังเล่น...' : 'ฟังเสียง'}</span></button>
          <button class="action-button action-button--speak" class:is-holding={isHolding} type="button" onpointerdown={startSpeaking} onpointerup={finishSpeaking} onpointercancel={finishSpeaking} onkeydown={handleSpeakKeyDown} onkeyup={handleSpeakKeyUp} oncontextmenu={(event) => event.preventDefault()} disabled={status === 'analyzing'} aria-label="กดค้างเพื่อพูดตาม"><span class="material-symbols-rounded" aria-hidden="true">{isHolding ? 'graphic_eq' : 'mic'}</span><span>{status === 'listening' ? 'ปล่อยเพื่อประมวลผล' : status === 'analyzing' ? 'กำลังวิเคราะห์...' : 'กดค้างเพื่อพูด'}</span></button>
          <button class="action-button action-button--camera" class:is-active={cameraOn} type="button" onclick={toggleCamera}><span class="material-symbols-rounded" aria-hidden="true">{cameraOn ? 'videocam_off' : 'videocam'}</span><span>{cameraOn ? 'ปิดกล้อง' : 'ดูรูปปาก'}</span></button>
        </div>

        {#if audioMessage}<p class="permission-note permission-note--error">{audioMessage}</p>{/if}
        {#if micMessage}<p class="permission-note">{micMessage}</p>{/if}
        {#if cameraError}<p class="permission-note permission-note--error">{cameraError}</p>{/if}

        <div class="ai-result" class:ai-result--listening={status === 'listening' || status === 'analyzing'} class:ai-result--correct={status === 'correct'} class:ai-result--incorrect={status === 'incorrect'} aria-live="polite">
          {#if status === 'idle'}
            <span class="material-symbols-rounded" aria-hidden="true">touch_app</span><div><strong>กดปุ่ม “พูดตาม” ค้างไว้</strong><p>พูดตามเสียงตัวอย่าง แล้วปล่อยปุ่มเมื่อพูดจบ</p></div>
          {:else if status === 'listening'}
            <span class="listening-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><strong>กำลังฟังเสียงของหนู</strong><p>กดค้างไว้ พูดช้า ๆ แล้วปล่อยเพื่อประมวลผล</p></div>
          {:else if status === 'analyzing'}
            <span class="material-symbols-rounded spin" aria-hidden="true">progress_activity</span><div><strong>กำลังประมวลผล</strong></div>
          {:else if status === 'correct'}
            <span class="material-symbols-rounded" aria-hidden="true">check_circle</span><div><strong>ถูกต้อง</strong></div>
          {:else}
            <span class="material-symbols-rounded" aria-hidden="true">refresh</span><div><strong>ลองใหม่อีกครั้ง</strong></div>
          {/if}
        </div>
      </section>

      {#if cameraOn}
        <aside class="camera-panel">
          <div class="camera-head"><span><strong>กระจกดูรูปปาก</strong><small>ขยับหน้าให้อยู่กลางกรอบ</small></span><span class="live-badge">LIVE</span></div>
          <div class="camera-frame"><video bind:this={videoElement} autoplay muted playsinline aria-label="ภาพจากกล้องสำหรับดูรูปปาก"></video><div class="mouth-guide"><span></span></div></div>
          <p>{current.mouthCue}</p>
        </aside>
      {/if}
    </main>

    <footer class="lesson-footer">
      <button class="button button--secondary" type="button" onclick={() => move(-1)} disabled={index === 0}><span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>ก่อนหน้า</button>
      {#if index < items.length - 1}
        <button class="button button--primary" type="button" onclick={() => move(1)}>ข้อต่อไป<span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span></button>
      {:else}
        <a class="button button--primary" href={exitHref}>จบบทเรียน<span class="material-symbols-rounded" aria-hidden="true">celebration</span></a>
      {/if}
    </footer>
  </div>
{/if}
