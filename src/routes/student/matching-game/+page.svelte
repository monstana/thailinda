<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { consonants } from '$lib/data/learning.js';
  import { getSessionUser } from '$lib/storage.js';

  const GAME_KEY = 'thailinda.matchingGame.v1';
  const visualById = {
    'c-ko-kai': '🐔',
    'c-kho-khai': '🥚',
    'c-kho-khuat': '🍾',
    'c-kho-khwai': '🐃',
    'c-kho-khon': '🧑',
    'c-kho-rakhang': '🔔',
    'c-ngo-ngu': '🐍',
    'c-cho-chan': '🍽️',
    'c-cho-ching': '🥁',
    'c-cho-chang': '🐘',
    'c-so-so': '⛓️',
    'c-cho-choe': '🌳',
    'c-yo-ying': '👩',
    'c-do-chada': '👑',
    'c-to-patak': '📌',
    'c-tho-than': '🧱',
    'c-tho-montho': '👸',
    'c-tho-phuthao': '🧓',
    'c-no-nen': '🙏',
    'c-do-dek': '🧒',
    'c-to-tao': '🐢',
    'c-tho-thung': '🛍️',
    'c-tho-thahan': '🪖',
    'c-tho-thong': '🚩',
    'c-no-nu': '🐭',
    'c-bo-baimai': '🍃',
    'c-po-pla': '🐟',
    'c-pho-phueng': '🐝',
    'c-fo-fa': '🫙',
    'c-pho-phan': '🥣',
    'c-fo-fan': '🦷',
    'c-pho-samphao': '⛵',
    'c-mo-ma': '🐴',
    'c-yo-yak': '👺',
    'c-ro-ruea': '🚤',
    'c-lo-ling': '🐒',
    'c-wo-waen': '💍',
    'c-so-sala': '🏛️',
    'c-so-ruesi': '🧘',
    'c-so-suea': '🐯',
    'c-ho-hip': '🧰',
    'c-lo-chula': '🎓',
    'c-o-ang': '🛁',
    'c-ho-nokhuk': '🦉'
  };
  const matchingPool = consonants.map((item) => ({ id: item.id, letter: item.display, word: item.example, visual: visualById[item.id] }));

  let user = null;
  let stage = 'setup';
  let imageCards = [];
  let letterCards = [];
  let matchedIds = [];
  let selectedImageId = '';
  let selectedLetterId = '';
  let pairState = 'idle';
  let locked = false;
  let attempts = 0;
  let seconds = 0;
  let bestTime = null;
  let newBest = false;
  let previousImageOrder = '';
  let previousLetterOrder = '';
  let clockTimer;
  let pairTimer;

  $: accuracy = attempts ? Math.round((10 / attempts) * 100) : 100;

  onMount(() => {
    user = getSessionUser('student');
    if (!user) return goto('/');
    try {
      const root = JSON.parse(localStorage.getItem(GAME_KEY) || '{}');
      bestTime = root[user.id]?.bestTime ?? null;
    } catch {
      bestTime = null;
    }
    return () => {
      clearInterval(clockTimer);
      clearTimeout(pairTimer);
    };
  });

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  function shuffleDifferent(items, disallowedOrders = []) {
    let candidate = shuffle(items);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const order = candidate.map((item) => item.id).join('|');
      if (!disallowedOrders.includes(order)) return candidate;
      candidate = shuffle(items);
    }
    return [...candidate.slice(1), candidate[0]];
  }

  function startGame() {
    clearInterval(clockTimer);
    clearTimeout(pairTimer);
    const selectedItems = shuffle(matchingPool).slice(0, 10);
    imageCards = shuffleDifferent(selectedItems, [previousImageOrder]);
    const imageOrder = imageCards.map((item) => item.id).join('|');
    letterCards = shuffleDifferent(selectedItems, [previousLetterOrder, imageOrder]);
    previousImageOrder = imageOrder;
    previousLetterOrder = letterCards.map((item) => item.id).join('|');
    matchedIds = [];
    selectedImageId = '';
    selectedLetterId = '';
    pairState = 'idle';
    locked = false;
    attempts = 0;
    seconds = 0;
    newBest = false;
    stage = 'playing';
    clockTimer = setInterval(() => { seconds += 1; }, 1000);
  }

  function chooseImage(id) {
    if (locked || matchedIds.includes(id)) return;
    selectedImageId = id;
    pairState = 'idle';
    checkPair();
  }

  function chooseLetter(id) {
    if (locked || matchedIds.includes(id)) return;
    selectedLetterId = id;
    pairState = 'idle';
    checkPair();
  }

  function checkPair() {
    if (!selectedImageId || !selectedLetterId) return;
    attempts += 1;
    locked = true;
    const correct = selectedImageId === selectedLetterId;
    pairState = correct ? 'correct' : 'wrong';

    pairTimer = setTimeout(() => {
      if (correct) matchedIds = [...matchedIds, selectedImageId];
      selectedImageId = '';
      selectedLetterId = '';
      pairState = 'idle';
      locked = false;
      if (correct && matchedIds.length === 10) finishGame();
    }, correct ? 350 : 650);
  }

  function finishGame() {
    clearInterval(clockTimer);
    stage = 'result';
    newBest = bestTime == null || seconds < bestTime;
    if (newBest) bestTime = seconds;
    let root = {};
    try { root = JSON.parse(localStorage.getItem(GAME_KEY) || '{}'); } catch { root = {}; }
    root[user.id] = { bestTime, lastTime: seconds, lastAttempts: attempts, playedAt: new Date().toISOString() };
    localStorage.setItem(GAME_KEY, JSON.stringify(root));
  }

  function formatTime(value) {
    const minutes = Math.floor(value / 60);
    const remainingSeconds = value % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
</script>

<svelte:head><title>เกมจับคู่พยัญชนะ | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="student" {user} active="lessons">
    {#if stage === 'setup'}
      <div class="page-head"><div><p class="eyebrow">เกมฝึกความจำ</p><h1>จับคู่ภาพกับพยัญชนะ</h1><p>เลือกภาพหนึ่งใบและพยัญชนะหนึ่งตัวที่สัมพันธ์กัน</p></div><a class="icon-button" href="/student" aria-label="กลับหน้าบทเรียน" title="กลับหน้าบทเรียน"><span class="material-symbols-rounded" aria-hidden="true">close</span></a></div>
      <section class="matching-setup">
        <div class="matching-preview" aria-hidden="true"><span>🐔</span><strong>ก</strong><span>🐘</span><strong>ช</strong><span>🐟</span><strong>ป</strong><span>🐴</span><strong>ม</strong></div>
        <div class="matching-setup-copy"><span class="game-label">คลังภาพครบ 44 ตัว</span><h2>สุ่มจับคู่รอบละ 10 คู่</h2><p>ระบบจะสุ่มพยัญชนะ 10 ตัวจาก ก-ฮ ครบทั้ง 44 ตัว และสลับลำดับการ์ดทั้งสองฝั่งก่อนเริ่มเกมทุกครั้ง</p><div class="matching-rules"><span><i class="material-symbols-rounded" aria-hidden="true">imagesmode</i>เลือกภาพ</span><b class="material-symbols-rounded" aria-hidden="true">arrow_forward</b><span><i class="material-symbols-rounded" aria-hidden="true">translate</i>เลือกพยัญชนะ</span><b class="material-symbols-rounded" aria-hidden="true">arrow_forward</b><span><i class="material-symbols-rounded" aria-hidden="true">check_circle</i>จับคู่สำเร็จ</span></div>{#if bestTime != null}<div class="game-best"><span class="material-symbols-rounded" aria-hidden="true">timer</span><p><small>เวลาที่ดีที่สุด</small><strong>{formatTime(bestTime)}</strong></p></div>{/if}<button class="button button--primary game-start-button" type="button" onclick={startGame}><span class="material-symbols-rounded" aria-hidden="true">shuffle</span>สุ่มและเริ่มเกม</button></div>
      </section>
    {:else if stage === 'playing'}
      <div class="matching-topline"><a class="icon-button" href="/student" aria-label="ออกจากเกม" title="ออกจากเกม"><span class="material-symbols-rounded" aria-hidden="true">close</span></a><div class="matching-progress-copy"><strong>จับคู่แล้ว {matchedIds.length} / 10</strong><div class="game-progress"><i style:width={`${matchedIds.length * 10}%`}></i></div></div><div class="matching-metrics"><span><small>ครั้ง</small><strong>{attempts}</strong></span><span><small>เวลา</small><strong>{formatTime(seconds)}</strong></span></div></div>
      <section class="matching-board"><div class="matching-board-head"><div><span class="material-symbols-rounded" aria-hidden="true">imagesmode</span><strong>เลือกภาพ</strong></div><div><span class="material-symbols-rounded" aria-hidden="true">translate</span><strong>เลือกพยัญชนะ</strong></div></div><div class="matching-columns">
        <div class="matching-card-grid matching-card-grid--images">{#each imageCards as item}<button type="button" class:is-selected={selectedImageId === item.id} class:is-matched={matchedIds.includes(item.id)} class:is-wrong={pairState === 'wrong' && selectedImageId === item.id} onclick={() => chooseImage(item.id)} disabled={matchedIds.includes(item.id)} aria-label={`ภาพ${item.word}`}><span class="matching-visual">{item.visual}</span>{#if matchedIds.includes(item.id)}<i class="material-symbols-rounded" aria-hidden="true">check_circle</i>{/if}</button>{/each}</div>
        <div class="matching-card-grid matching-card-grid--letters">{#each letterCards as item}<button type="button" class:is-selected={selectedLetterId === item.id} class:is-matched={matchedIds.includes(item.id)} class:is-wrong={pairState === 'wrong' && selectedLetterId === item.id} onclick={() => chooseLetter(item.id)} disabled={matchedIds.includes(item.id)} aria-label={`พยัญชนะ ${item.letter}`}><strong>{item.letter}</strong>{#if matchedIds.includes(item.id)}<i class="material-symbols-rounded" aria-hidden="true">check_circle</i>{/if}</button>{/each}</div>
      </div>{#if pairState === 'correct'}<p class="matching-message matching-message--correct"><span class="material-symbols-rounded" aria-hidden="true">check_circle</span>จับคู่ถูกต้อง</p>{:else if pairState === 'wrong'}<p class="matching-message matching-message--wrong"><span class="material-symbols-rounded" aria-hidden="true">refresh</span>ยังไม่ใช่คู่นี้ ลองอีกครั้ง</p>{:else}<p class="matching-message">เลือกการ์ดจากทั้งสองฝั่ง</p>{/if}</section>
    {:else}
      <section class="game-result matching-result"><span class="result-medal material-symbols-rounded" aria-hidden="true">extension</span><p class="eyebrow">จับคู่ครบแล้ว</p><h1>เก่งมาก จับคู่สำเร็จ!</h1><strong class="final-score matching-final-time">{formatTime(seconds)}<small>เวลาที่ใช้</small></strong><div class="result-stats"><div><strong>10</strong><span>คู่ที่ถูกต้อง</span></div><div><strong>{attempts}</strong><span>จำนวนครั้ง</span></div><div><strong>{accuracy}%</strong><span>ความแม่นยำ</span></div></div>{#if newBest}<p class="new-best"><span class="material-symbols-rounded" aria-hidden="true">celebration</span>สถิติเวลาที่ดีที่สุดใหม่</p>{/if}<div class="result-actions"><a class="button button--secondary" href="/student">กลับบทเรียน</a><button class="button button--primary" type="button" onclick={startGame}><span class="material-symbols-rounded" aria-hidden="true">shuffle</span>สุ่มเล่นอีกครั้ง</button></div></section>
    {/if}
  </AppShell>
{/if}
