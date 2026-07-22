<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { evaluateSpeechWithApi, isApiEnabled } from '$lib/api.js';
  import { recordAssessment } from '$lib/storage.js';
  import {
    evaluateMouthSequence,
    extractMouthFeatures,
    mouthReferenceKey,
    mouthResultMessage,
    prepareMouthEvaluation
  } from '$lib/mouth-evaluation.js';

  let { items, index, user, basePath, exitHref = '/student', assignmentTitle = '' } = $props();
  let current = $derived(items[index]);
  let status = $state('idle');
  let cameraOn = $state(false);
  let cameraError = $state('');
  let mouthModelStatus = $state('idle');
  let mouthFaceDetected = $state(false);
  let mouthEvaluation = $state(null);
  let micMessage = $state('');
  let recognizedText = $state('');
  let audioMessage = $state('');
  let isSpeaking = $state(false);
  let videoElement = $state();
  let cameraStream;
  let mouthLandmarker;
  let mouthReferences;
  let mouthAnimationFrame;
  let mouthFrames = [];
  let mouthCaptureActive = $state(false);
  let mouthAnalyzedFrames = $state(0);
  let mouthDetectedFrames = $state(0);
  let lastMouthSampleAt = 0;
  let lastMouthVideoTime = -1;
  let currentAudio;
  let thaiVoice;
  let volume = 0.8;
  let micStream;
  let micPreparingPromise;
  let micReady = $state(false);
  let micPreparing = $state(false);
  let recordingContext;
  let recordingSource;
  let recordingProcessor;
  let recordingChunks = [];
  let preRollChunks = [];
  let recordingActive = false;
  let recordingSampleRate = 44100;
  let recordingStartedAt = 0;
  let audioQuality = $state(null);
  let speechMatch = $state(null);
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

  async function startSpeaking(event) {
    if (!current || status === 'analyzing' || isHolding) return;
    event?.preventDefault();
    if (event?.pointerId != null) event.currentTarget.setPointerCapture?.(event.pointerId);
    stopAudio();
    micMessage = '';
    recognizedText = '';
    speechMatch = null;
    audioQuality = null;
    mouthEvaluation = null;
    mouthFrames = [];
    mouthAnalyzedFrames = 0;
    mouthDetectedFrames = 0;
    mouthCaptureActive = cameraOn && Boolean(mouthReferenceKey(current));
    analysisStarted = false;
    isHolding = true;
    status = 'preparing';
    const token = ++captureToken;

    if (!navigator.mediaDevices?.getUserMedia) {
      isHolding = false;
      status = 'idle';
      micMessage = 'อุปกรณ์นี้ไม่รองรับไมโครโฟน กรุณาใช้ Chrome หรือ Edge รุ่นปัจจุบัน';
      return;
    }

    const ready = await prepareMicrophone();
    if (!ready || token !== captureToken || !isHolding) {
      if (token === captureToken) status = 'idle';
      return;
    }

    // ให้ AudioContext เก็บเสียงนำสั้น ๆ ก่อน เพื่อไม่ตัดพยัญชนะต้นคำ
    await new Promise((resolve) => setTimeout(resolve, 180));
    if (token !== captureToken || !isHolding) return;
    recordingChunks = preRollChunks.map((chunk) => new Float32Array(chunk));
    preRollChunks = [];
    recordingActive = true;
    recordingStartedAt = Date.now();
    status = 'listening';
    micMessage = 'ไมโครโฟนพร้อมแล้ว พูดได้เลย';
  }

  async function prepareMicrophone() {
    if (micStream?.active && recordingContext && recordingProcessor) {
      await recordingContext.resume().catch(() => {});
      micReady = recordingContext.state === 'running';
      return micReady;
    }
    if (micPreparingPromise) return micPreparingPromise;

    micPreparing = true;
    micMessage = 'กำลังเตรียมไมโครโฟน กรุณากดค้างไว้';
    micPreparingPromise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('audio-context-unavailable');
        micStream = stream;
        recordingContext = new AudioContextClass();
        await recordingContext.resume();
        recordingSampleRate = recordingContext.sampleRate;
        recordingChunks = [];
        preRollChunks = [];
        recordingSource = recordingContext.createMediaStreamSource(stream);
        recordingProcessor = recordingContext.createScriptProcessor(4096, 1, 1);
        recordingProcessor.onaudioprocess = (audioEvent) => {
          const chunk = new Float32Array(audioEvent.inputBuffer.getChannelData(0));
          preRollChunks.push(chunk);
          trimPreRoll();
          if (recordingActive) recordingChunks.push(chunk);
        };
        recordingSource.connect(recordingProcessor);
        recordingProcessor.connect(recordingContext.destination);
        micReady = true;
        return true;
      } catch (error) {
        releaseMicrophone();
        micMessage = error?.name === 'NotAllowedError'
          ? 'ไม่สามารถใช้ไมโครโฟนได้ กรุณาอนุญาตสิทธิ์ไมโครโฟนแล้วลองใหม่'
          : 'อุปกรณ์นี้ไม่สามารถบันทึกเสียงได้ กรุณาลองใช้ Chrome หรือ Edge';
        return false;
      } finally {
        micPreparing = false;
        micPreparingPromise = null;
      }
    })();
    return micPreparingPromise;
  }

  function trimPreRoll() {
    const maximumSamples = Math.round(recordingSampleRate * 0.35);
    let sampleCount = preRollChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    while (preRollChunks.length > 1 && sampleCount > maximumSamples) {
      sampleCount -= preRollChunks.shift().length;
    }
  }

  function releaseMicrophone() {
    recordingActive = false;
    if (recordingProcessor) {
      recordingProcessor.onaudioprocess = null;
      recordingProcessor.disconnect();
    }
    recordingSource?.disconnect();
    recordingContext?.close().catch(() => {});
    micStream?.getTracks().forEach((track) => track.stop());
    micStream = null;
    micReady = false;
    micPreparing = false;
    micPreparingPromise = null;
    recordingProcessor = null;
    recordingSource = null;
    recordingContext = null;
    recordingChunks = [];
    preRollChunks = [];
  }

  function finishRecording() {
    recordingActive = false;
    const chunks = recordingChunks;
    const sampleRate = recordingSampleRate;
    recordingChunks = [];
    if (!chunks.length) return null;
    const analyzed = analyzeAndTrimRecording(chunks, sampleRate);
    return { ...analyzed, blob: encodeWav([analyzed.samples], sampleRate) };
  }

  function analyzeAndTrimRecording(chunks, sampleRate) {
    const sampleCount = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const samples = new Float32Array(sampleCount);
    let writeOffset = 0;
    for (const chunk of chunks) {
      samples.set(chunk, writeOffset);
      writeOffset += chunk.length;
    }

    const windowSize = Math.max(1, Math.round(sampleRate * 0.02));
    const windows = [];
    let peak = 0;
    let energy = 0;
    for (let offset = 0; offset < samples.length; offset += windowSize) {
      let windowEnergy = 0;
      const end = Math.min(samples.length, offset + windowSize);
      for (let index = offset; index < end; index += 1) {
        const absolute = Math.abs(samples[index]);
        peak = Math.max(peak, absolute);
        energy += samples[index] * samples[index];
        windowEnergy += samples[index] * samples[index];
      }
      windows.push(Math.sqrt(windowEnergy / Math.max(1, end - offset)));
    }

    const sortedWindows = [...windows].sort((left, right) => left - right);
    const noiseFloor = sortedWindows[Math.floor((sortedWindows.length - 1) * 0.2)] || 0;
    const voiceThreshold = Math.max(0.012, noiseFloor * 2.8);
    const activeWindows = windows
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => value >= voiceThreshold)
      .map(({ index }) => index);
    const voiceDetected = activeWindows.length > 0;
    const padding = Math.round(sampleRate * 0.18);
    const start = voiceDetected ? Math.max(0, activeWindows[0] * windowSize - padding) : 0;
    const end = voiceDetected
      ? Math.min(samples.length, (activeWindows.at(-1) + 1) * windowSize + padding)
      : samples.length;
    const trimmed = samples.slice(start, end);
    const rms = Math.sqrt(energy / Math.max(1, samples.length));
    const voicedEnergy = activeWindows.reduce((sum, windowIndex) => sum + windows[windowIndex] ** 2, 0);
    const voicedRms = Math.sqrt(voicedEnergy / Math.max(1, activeWindows.length));
    const snrDb = voiceDetected
      ? Math.min(40, 20 * Math.log10(Math.max(voicedRms, 0.000001) / Math.max(noiseFloor, 0.0001)))
      : 0;
    const durationMs = Math.round((trimmed.length / sampleRate) * 1000);
    const qualityStatus = !voiceDetected || voicedRms < 0.018
      ? 'too-quiet'
      : peak >= 0.99
        ? 'clipping'
        : snrDb < 8
          ? 'noisy'
          : durationMs < 450
            ? 'too-short'
            : 'good';

    return {
      samples: trimmed,
      metrics: {
        durationMs,
        rms: Number(rms.toFixed(4)),
        peak: Number(peak.toFixed(3)),
        noiseFloor: Number(noiseFloor.toFixed(4)),
        snrDb: Number(snrDb.toFixed(1)),
        voiceDetected,
        qualityStatus
      }
    };
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
    if (!isHolding || analysisStarted) return;
    isHolding = false;
    mouthCaptureActive = false;
    captureToken += 1;
    if (status === 'preparing') {
      status = 'idle';
      micMessage = micPreparing
        ? 'ปล่อยก่อนที่ไมค์จะพร้อม กรุณารอข้อความ “พูดได้เลย” แล้วลองอีกครั้ง'
        : 'ไมโครโฟนพร้อมแล้ว กรุณากดค้างและพูดอีกครั้ง';
      return;
    }
    if (status !== 'listening') return;

    const recording = finishRecording();
    const localMouthEvaluation = cameraOn
      ? evaluateMouthSequence(current, mouthFrames, mouthReferences)
      : null;
    mouthEvaluation = localMouthEvaluation;

    if (!recording) {
      status = 'idle';
      micMessage = 'ยังไม่ได้รับข้อมูลเสียง กรุณากดค้างแล้วพูดอีกครั้ง';
      return;
    }

    const audioBlob = recording.blob;
    audioQuality = recording.metrics;
    preRollChunks = [];

    if (Date.now() - recordingStartedAt < 300 || recording.metrics.durationMs < 350) {
      status = 'idle';
      micMessage = 'เสียงสั้นเกินไป กรุณาพูดให้ครบทั้งเสียง เช่น “กอ ไก่”';
      return;
    }

    if (!recording.metrics.voiceDetected || recording.metrics.qualityStatus === 'too-quiet') {
      status = 'idle';
      micMessage = 'เสียงเบาเกินไป กรุณาเข้าใกล้ไมโครโฟนและพูดใหม่';
      return;
    }

    if (recording.metrics.qualityStatus === 'clipping') {
      status = 'idle';
      micMessage = 'เสียงดังจนแตก กรุณาถอยจากไมโครโฟนเล็กน้อยแล้วลองใหม่';
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
      speechMatch = {
        type: result.matchType || (result.passed ? 'exact' : 'different'),
        confidence: Number.isFinite(result.matchConfidence) ? result.matchConfidence : null
      };
      recordAssessment(user.id, current.id, result.passed, {
        mode: result.mode,
        transcript: recognizedText,
        matchType: speechMatch.type,
        matchConfidence: speechMatch.confidence,
        audioDurationMs: recording.metrics.durationMs,
        audioRms: recording.metrics.rms,
        audioPeak: recording.metrics.peak,
        audioSnrDb: recording.metrics.snrDb,
        audioQualityStatus: recording.metrics.qualityStatus,
        mouthStatus: localMouthEvaluation?.status || 'not-used',
        mouthScore: localMouthEvaluation?.score ?? null,
        mouthDistance: localMouthEvaluation?.distance ?? null,
        mouthFrames: localMouthEvaluation?.capturedFrames ?? 0,
        mouthVisualWeight: localMouthEvaluation?.visualWeight ?? 0
      });
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
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      cameraOn = true;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (videoElement) {
        videoElement.srcObject = cameraStream;
        await videoElement.play().catch(() => {});
      }
      initializeMouthTracking();
    } catch {
      cameraError = 'เปิดกล้องไม่ได้ กรุณาตรวจสิทธิ์กล้องของเบราว์เซอร์';
      cameraOn = false;
    }
  }

  async function initializeMouthTracking() {
    if (!mouthReferenceKey(current)) {
      mouthModelStatus = 'no-reference';
      return;
    }
    mouthModelStatus = 'loading';
    try {
      const prepared = await prepareMouthEvaluation();
      if (!cameraOn) return;
      mouthLandmarker = prepared.landmarker;
      mouthReferences = prepared.references;
      mouthModelStatus = 'ready';
      lastMouthVideoTime = -1;
      lastMouthSampleAt = 0;
      runMouthTracking();
    } catch {
      if (!cameraOn) return;
      mouthModelStatus = 'error';
      cameraError = 'เปิดกล้องได้ แต่โหลดระบบตรวจรูปปากไม่สำเร็จ เสียงยังตรวจได้ตามปกติ';
    }
  }

  function runMouthTracking(timestamp = performance.now()) {
    if (!cameraOn) return;
    if (
      mouthLandmarker
      && videoElement?.readyState >= 2
      && videoElement.currentTime !== lastMouthVideoTime
      && timestamp - lastMouthSampleAt >= 80
    ) {
      lastMouthSampleAt = timestamp;
      lastMouthVideoTime = videoElement.currentTime;
      try {
        const result = mouthLandmarker.detectForVideo(videoElement, timestamp);
        mouthAnalyzedFrames += 1;
        mouthFaceDetected = Boolean(result.faceLandmarks?.length);
        if (mouthFaceDetected) {
          mouthDetectedFrames += 1;
          if (mouthCaptureActive) {
            const features = extractMouthFeatures(result.faceLandmarks[0]);
            if (features) mouthFrames.push(features);
          }
        }
      } catch {
        mouthFaceDetected = false;
      }
    }
    mouthAnimationFrame = requestAnimationFrame(runMouthTracking);
  }

  function stopCamera() {
    if (mouthAnimationFrame) cancelAnimationFrame(mouthAnimationFrame);
    mouthAnimationFrame = null;
    mouthCaptureActive = false;
    mouthFaceDetected = false;
    mouthFrames = [];
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
    speechMatch = null;
    audioQuality = null;
    mouthEvaluation = null;
    mouthFrames = [];
    mouthCaptureActive = false;
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
          <button class="action-button action-button--speak" class:is-holding={isHolding} type="button" onpointerdown={startSpeaking} onpointerup={finishSpeaking} onpointercancel={finishSpeaking} onkeydown={handleSpeakKeyDown} onkeyup={handleSpeakKeyUp} oncontextmenu={(event) => event.preventDefault()} disabled={status === 'analyzing'} aria-label="กดค้างเพื่อพูดตาม"><span class="material-symbols-rounded" aria-hidden="true">{isHolding ? 'graphic_eq' : 'mic'}</span><span>{status === 'preparing' ? 'กำลังเตรียมไมค์...' : status === 'listening' ? 'ปล่อยเพื่อประมวลผล' : status === 'analyzing' ? 'กำลังวิเคราะห์...' : 'กดค้างเพื่อพูด'}</span></button>
          <button class="action-button action-button--camera" class:is-active={cameraOn} type="button" onclick={toggleCamera}><span class="material-symbols-rounded" aria-hidden="true">{cameraOn ? 'videocam_off' : 'videocam'}</span><span>{cameraOn ? 'ปิดกล้อง' : 'ดูรูปปาก'}</span></button>
        </div>

        {#if audioMessage}<p class="permission-note permission-note--error">{audioMessage}</p>{/if}
        {#if micMessage}<p class="permission-note">{micMessage}</p>{/if}
        {#if cameraError}<p class="permission-note permission-note--error">{cameraError}</p>{/if}

        <div class="ai-result" class:ai-result--listening={status === 'preparing' || status === 'listening' || status === 'analyzing'} class:ai-result--correct={status === 'correct'} class:ai-result--incorrect={status === 'incorrect'} aria-live="polite">
          {#if status === 'idle'}
            <span class="material-symbols-rounded" aria-hidden="true">touch_app</span><div><strong>กดปุ่ม “พูดตาม” ค้างไว้</strong><p>{micReady ? 'ไมโครโฟนพร้อมแล้ว พูดให้ครบแล้วจึงปล่อยปุ่ม' : cameraOn ? 'Typhoon ตรวจเสียงเป็นหลัก และ MediaPipe ตรวจรูปปากเสริม' : 'รอให้ไมค์พร้อม พูดตามเสียงตัวอย่าง แล้วปล่อยปุ่มเมื่อพูดจบ'}</p></div>
          {:else if status === 'preparing'}
            <span class="material-symbols-rounded spin" aria-hidden="true">progress_activity</span><div><strong>กำลังเตรียมไมโครโฟน</strong><p>กดค้างไว้ และเริ่มพูดเมื่อเห็นข้อความ “พูดได้เลย”</p></div>
          {:else if status === 'listening'}
            <span class="listening-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><strong>กำลังฟังเสียงของหนู</strong><p>กดค้างไว้ พูดช้า ๆ แล้วปล่อยเพื่อประมวลผล</p></div>
          {:else if status === 'analyzing'}
            <span class="material-symbols-rounded spin" aria-hidden="true">progress_activity</span><div><strong>กำลังประมวลผล</strong></div>
          {:else if status === 'correct'}
            <span class="material-symbols-rounded" aria-hidden="true">check_circle</span><div><strong>ถูกต้อง</strong><p>{mouthResultMessage(mouthEvaluation, true)}</p></div>
          {:else}
            <span class="material-symbols-rounded" aria-hidden="true">refresh</span><div><strong>ลองใหม่อีกครั้ง</strong><p>{mouthResultMessage(mouthEvaluation, false)}</p></div>
          {/if}
        </div>

      </section>

      {#if cameraOn}
        <aside class="camera-panel">
          <div class="camera-head">
            <span><strong>ตรวจรูปปากด้วย MediaPipe</strong><small>ขยับหน้าให้อยู่กลางกรอบ</small></span>
            <span class="mouth-tracking-badge" class:is-ready={mouthModelStatus === 'ready' && mouthFaceDetected}>
              {mouthModelStatus === 'loading' ? 'กำลังโหลด' : mouthModelStatus === 'error' ? 'ใช้ไม่ได้' : mouthModelStatus === 'no-reference' ? 'ไม่มีต้นแบบ' : mouthFaceDetected ? 'พบรูปปาก' : 'จัดตำแหน่งหน้า'}
            </span>
          </div>
          <div class="camera-frame" class:is-face-ready={mouthFaceDetected}>
            <video bind:this={videoElement} autoplay muted playsinline aria-label="ภาพจากกล้องสำหรับตรวจรูปปาก"></video>
            <div class="mouth-guide"><span></span></div>
            {#if mouthCaptureActive}<span class="mouth-recording-indicator">กำลังเก็บลำดับรูปปาก</span>{/if}
          </div>
          <p>
            {current.mouthCue}
            {#if mouthEvaluation?.score != null}<strong class="mouth-score">คะแนนรูปปาก {mouthEvaluation.score}%</strong>{/if}
            {#if mouthModelStatus === 'ready' && mouthAnalyzedFrames > 0}<small>ตรวจพบใบหน้า {mouthDetectedFrames} / {mouthAnalyzedFrames} เฟรม</small>{/if}
          </p>
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
