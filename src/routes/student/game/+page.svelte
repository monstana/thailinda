<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { consonants, vowels, words } from '$lib/data/learning.js';
  import { getSessionUser } from '$lib/storage.js';

  const TOTAL_QUESTIONS = 10;
  const GAME_KEY = 'thailinda.listeningGame.v1';
  const modeMeta = {
    consonants: { label: 'พยัญชนะ', description: 'ก-ฮ ครบ 44 ตัว', icon: 'ก' },
    vowels: { label: 'สระ', description: 'สระไทย 32 เสียง', icon: 'อะ' },
    words: { label: 'คำศัพท์', description: 'คำพื้นฐาน 10 คำ', icon: 'กา' },
    mixed: { label: 'แบบผสม', description: 'พยัญชนะ สระ และคำ', icon: 'กะ' }
  };

  let user = null;
  let stage = 'setup';
  let mode = 'consonants';
  let question = null;
  let choices = [];
  let usedIds = [];
  let questionNumber = 0;
  let score = 0;
  let streak = 0;
  let maxStreak = 0;
  let selectedId = '';
  let answered = false;
  let isCorrect = false;
  let isPlaying = false;
  let achievedNewBest = false;
  let volume = 0.8;
  let gameStats = { bestScores: {} };
  let currentAudio;
  let fallbackUsed = false;

  $: bestScore = gameStats.bestScores?.[mode] || 0;

  onMount(() => {
    user = getSessionUser('student');
    if (!user) return goto('/');
    try {
      const settings = JSON.parse(localStorage.getItem('thailinda.studentSettings.v1') || '{}');
      volume = Math.min(1, Math.max(0, (settings[user.id]?.volume ?? 80) / 100));
      const root = JSON.parse(localStorage.getItem(GAME_KEY) || '{}');
      gameStats = root[user.id] || { bestScores: {} };
    } catch {
      volume = 0.8;
      gameStats = { bestScores: {} };
    }
    return stopAudio;
  });

  function itemPool() {
    if (mode === 'consonants') return consonants;
    if (mode === 'vowels') return vowels;
    if (mode === 'words') return words;
    return [...consonants, ...vowels, ...words];
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  function startGame() {
    stage = 'playing';
    questionNumber = 1;
    score = 0;
    streak = 0;
    maxStreak = 0;
    achievedNewBest = false;
    usedIds = [];
    buildQuestion();
  }

  function buildQuestion() {
    stopAudio();
    selectedId = '';
    answered = false;
    isCorrect = false;
    const pool = itemPool();
    const available = pool.filter((item) => !usedIds.includes(item.id));
    question = shuffle(available.length ? available : pool)[0];
    usedIds = [...usedIds, question.id];
    const distractors = shuffle(pool.filter((item) => item.id !== question.id)).slice(0, 3);
    choices = shuffle([question, ...distractors]);
    playAudio();
  }

  function stopAudio() {
    currentAudio?.pause();
    currentAudio = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    isPlaying = false;
  }

  async function playAudio() {
    if (!question || isPlaying) return;
    stopAudio();
    fallbackUsed = false;
    isPlaying = true;
    currentAudio = new Audio(question.audioPath);
    currentAudio.volume = volume;
    currentAudio.onended = () => { isPlaying = false; currentAudio = null; };
    currentAudio.onerror = speakFallback;
    try {
      await currentAudio.play();
    } catch {
      speakFallback();
    }
  }

  function speakFallback() {
    if (fallbackUsed || !question) return;
    fallbackUsed = true;
    currentAudio?.pause();
    currentAudio = null;
    if (!('speechSynthesis' in window)) {
      isPlaying = false;
      return;
    }
    const utterance = new SpeechSynthesisUtterance(question.audioText || question.sound);
    utterance.lang = 'th-TH';
    utterance.rate = 0.78;
    utterance.volume = volume;
    utterance.onend = () => { isPlaying = false; };
    utterance.onerror = () => { isPlaying = false; };
    window.speechSynthesis.speak(utterance);
  }

  function chooseAnswer(choice) {
    if (answered) return;
    selectedId = choice.id;
    answered = true;
    isCorrect = choice.id === question.id;
    if (isCorrect) {
      score += 10;
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }

  function nextQuestion() {
    if (questionNumber >= TOTAL_QUESTIONS) {
      finishGame();
      return;
    }
    questionNumber += 1;
    buildQuestion();
  }

  function finishGame() {
    stopAudio();
    stage = 'result';
    achievedNewBest = score > bestScore;
    const nextBest = Math.max(bestScore, score);
    gameStats = { ...gameStats, bestScores: { ...(gameStats.bestScores || {}), [mode]: nextBest }, lastMode: mode, lastScore: score, playedAt: new Date().toISOString() };
    let root = {};
    try { root = JSON.parse(localStorage.getItem(GAME_KEY) || '{}'); } catch { root = {}; }
    root[user.id] = gameStats;
    localStorage.setItem(GAME_KEY, JSON.stringify(root));
  }

  function resetGame() {
    stopAudio();
    stage = 'setup';
    question = null;
  }
</script>

<svelte:head><title>เกมฟังเสียง | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="student" {user} active="lessons">
    {#if stage === 'setup'}
      <div class="page-head"><div><p class="eyebrow">เกมฝึกทักษะการฟัง</p><h1>ฟังเสียง แล้วเลือกคำตอบ</h1><p>เลือกโหมด ฟังคำอ่าน และทายตัวอักษรให้ถูกต้อง</p></div><a class="icon-button" href="/student" aria-label="กลับหน้าบทเรียน" title="กลับหน้าบทเรียน"><span class="material-symbols-rounded" aria-hidden="true">close</span></a></div>
      <section class="listening-game-setup">
        <div class="game-listening-visual"><span class="material-symbols-rounded" aria-hidden="true">headphones</span><i></i><i></i><i></i></div>
        <div class="game-setup-copy"><span class="game-label">10 ข้อ · ข้อละ 10 คะแนน</span><h2>เลือกหมวดที่อยากเล่น</h2><div class="game-mode-grid">{#each Object.entries(modeMeta) as [modeId, meta]}<button type="button" class:is-active={mode === modeId} onclick={() => mode = modeId}><span>{meta.icon}</span><strong>{meta.label}</strong><small>{meta.description}</small></button>{/each}</div><div class="game-best"><span class="material-symbols-rounded" aria-hidden="true">emoji_events</span><p><small>คะแนนสูงสุดโหมดนี้</small><strong>{bestScore} / 100</strong></p></div><button class="button button--primary game-start-button" type="button" onclick={startGame}><span class="material-symbols-rounded" aria-hidden="true">play_arrow</span>เริ่มเกม</button></div>
      </section>
    {:else if stage === 'playing' && question}
      <div class="game-topline"><a class="icon-button" href="/student" aria-label="ออกจากเกม" title="ออกจากเกม"><span class="material-symbols-rounded" aria-hidden="true">close</span></a><div><strong>ข้อ {questionNumber} / {TOTAL_QUESTIONS}</strong><div class="game-progress"><i style:width={`${(questionNumber / TOTAL_QUESTIONS) * 100}%`}></i></div></div><span class="game-score"><small>คะแนน</small><strong>{score}</strong></span></div>
      <section class="listening-question">
        <p class="eyebrow">ฟังเสียงให้ดี</p><h1>เสียงที่ได้ยินคือข้อไหน?</h1><button class="listen-orb" class:is-playing={isPlaying} type="button" onclick={playAudio} disabled={isPlaying} aria-label="ฟังเสียงอีกครั้ง"><span class="material-symbols-rounded" aria-hidden="true">{isPlaying ? 'graphic_eq' : 'volume_up'}</span></button><span class="listen-again-copy">{isPlaying ? 'กำลังเล่นเสียง...' : 'กดเพื่อฟังอีกครั้ง'}</span>
        <div class="listening-choices">{#each choices as choice}<button type="button" class:is-selected={answered && choice.id === selectedId} class:is-correct={answered && choice.id === question.id} class:is-wrong={answered && choice.id === selectedId && choice.id !== question.id} onclick={() => chooseAnswer(choice)} disabled={answered}><strong>{choice.display}</strong><span>{choice.name}</span></button>{/each}</div>
        {#if answered}<div class="game-feedback" class:is-correct={isCorrect}><span class="material-symbols-rounded" aria-hidden="true">{isCorrect ? 'check_circle' : 'refresh'}</span><div><strong>{isCorrect ? 'ถูกต้อง เก่งมาก!' : 'ยังไม่ถูก คำตอบคือ'}</strong><p>{question.display} · {question.name} ออกเสียงว่า “{question.sound}”</p></div><button class="button button--primary" type="button" onclick={nextQuestion}>{questionNumber === TOTAL_QUESTIONS ? 'ดูคะแนน' : 'ข้อต่อไป'}<span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span></button></div>{/if}
      </section>
    {:else if stage === 'result'}
      <section class="game-result"><span class="result-medal material-symbols-rounded" aria-hidden="true">{score >= 80 ? 'emoji_events' : score >= 50 ? 'workspace_premium' : 'stars'}</span><p class="eyebrow">จบเกมแล้ว</p><h1>{score >= 80 ? 'ยอดเยี่ยมมาก!' : score >= 50 ? 'ทำได้ดีมาก!' : 'ฝึกต่ออีกนิดนะ!'}</h1><strong class="final-score">{score}<small>/ 100 คะแนน</small></strong><div class="result-stats"><div><strong>{score / 10}</strong><span>ตอบถูก</span></div><div><strong>{TOTAL_QUESTIONS - (score / 10)}</strong><span>ตอบผิด</span></div><div><strong>{maxStreak}</strong><span>ถูกต่อเนื่อง</span></div></div>{#if achievedNewBest}<p class="new-best"><span class="material-symbols-rounded" aria-hidden="true">celebration</span>คะแนนสูงสุดใหม่ของโหมด {modeMeta[mode].label}</p>{/if}<div class="result-actions"><button class="button button--secondary" type="button" onclick={resetGame}>เปลี่ยนโหมด</button><button class="button button--primary" type="button" onclick={startGame}><span class="material-symbols-rounded" aria-hidden="true">replay</span>เล่นอีกครั้ง</button></div></section>
    {/if}
  </AppShell>
{/if}
