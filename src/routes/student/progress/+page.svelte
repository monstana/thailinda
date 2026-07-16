<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { allLearningItems, consonants, vowels, words } from '$lib/data/learning.js';
  import { getLearningProgress, getSessionUser, summarizeLearning } from '$lib/storage.js';

  let user = null;
  let progress = null;
  $: summary = progress ? summarizeLearning(progress) : { total: allLearningItems.length, practiced: 0, passed: 0, needsPractice: 0, attempts: 0 };
  const rewardLevels = [
    { min: 0, name: 'ผู้กล้าเริ่มต้น', level: 'ระดับเริ่มต้น', icon: 'kid_star' },
    { min: 10, name: 'ดาวทองแดง', level: 'ระดับ 1', icon: 'workspace_premium' },
    { min: 25, name: 'ดาวเงิน', level: 'ระดับ 2', icon: 'workspace_premium' },
    { min: 44, name: 'ดาวทอง', level: 'ระดับ 3', icon: 'trophy' },
    { min: 60, name: 'เพชรภาษาไทย', level: 'ระดับ 4', icon: 'diamond' },
    { min: 76, name: 'ปรมาจารย์เสียงไทย', level: 'ระดับ 5', icon: 'crown' },
    { min: 86, name: 'นักอ่านคำยอดเยี่ยม', level: 'ระดับสูงสุด', icon: 'auto_stories' }
  ];
  $: currentReward = [...rewardLevels].reverse().find((reward) => summary.passed >= reward.min) || rewardLevels[0];
  $: nextReward = rewardLevels.find((reward) => reward.min > summary.passed) || null;
  $: consonantSummary = progress ? summarizeLearning(progress, consonants.map((item) => item.id)) : { passed: 0, practiced: 0 };
  $: vowelSummary = progress ? summarizeLearning(progress, vowels.map((item) => item.id)) : { passed: 0, practiced: 0 };
  $: wordSummary = progress ? summarizeLearning(progress, words.map((item) => item.id)) : { passed: 0, practiced: 0 };

  onMount(() => {
    user = getSessionUser('student');
    if (!user) return goto('/');
    progress = getLearningProgress(user.id);
  });

  function label(status) { return status === 'passed' ? 'ผ่านแล้ว' : status === 'needsPractice' ? 'ฝึกเพิ่ม' : 'ยังไม่เริ่ม'; }
</script>

<svelte:head><title>ผลการเรียน | ไทยลินดา</title></svelte:head>
{#if user && progress}
  <AppShell role="student" {user} active="progress">
    <div class="page-head"><div><p class="eyebrow">ผลจากการฝึกพูด</p><h1>ความก้าวหน้าของฉัน</h1><p>รวมพยัญชนะ 44 ตัว สระ 32 เสียง และคำศัพท์ 10 คำ</p></div></div>
    <section class="reward-band"><span class="reward-medal material-symbols-rounded" aria-hidden="true">{currentReward.icon}</span><div class="reward-copy"><p>{currentReward.level}</p><h2>{currentReward.name}</h2><span>{nextReward ? `ผ่านอีก ${nextReward.min - summary.passed} รายการ เพื่อรับ ${nextReward.name}` : 'ได้รับรางวัลระดับสูงสุดแล้ว'}</span><div class="reward-progress"><i style:width={`${nextReward ? Math.min(100, (summary.passed / nextReward.min) * 100) : 100}%`}></i></div></div><strong>{summary.passed}<small>/ {allLearningItems.length} ผ่าน</small></strong></section>
    <section class="summary-grid"><article class="summary-card"><strong>{summary.practiced}</strong><span>ฝึกแล้ว / {allLearningItems.length}</span></article><article class="summary-card"><strong>{summary.passed}</strong><span>ผ่านแล้ว</span></article><article class="summary-card"><strong>{summary.needsPractice}</strong><span>ควรฝึกเพิ่ม</span></article><article class="summary-card"><strong>{summary.attempts}</strong><span>ครั้งที่พูด</span></article></section>
    <section class="category-results"><article><span class="category-icon">ก</span><div><strong>พยัญชนะไทย</strong><small>ฝึกแล้ว {consonantSummary.practiced}/44 · ผ่าน {consonantSummary.passed}</small><div><i style:width={`${(consonantSummary.practiced / 44) * 100}%`}></i></div></div></article><article><span class="category-icon">อะ</span><div><strong>สระไทย</strong><small>ฝึกแล้ว {vowelSummary.practiced}/32 · ผ่าน {vowelSummary.passed}</small><div><i style:width={`${(vowelSummary.practiced / 32) * 100}%`}></i></div></div></article><article><span class="category-icon">กา</span><div><strong>คำศัพท์พื้นฐาน</strong><small>ฝึกแล้ว {wordSummary.practiced}/10 · ผ่าน {wordSummary.passed}</small><div><i style:width={`${(wordSummary.practiced / 10) * 100}%`}></i></div></div></article></section>
    <section class="panel"><div class="panel-head"><div><h2>ผลรายตัว</h2><p>Typhoon ASR ตรวจว่าคำที่ระบบได้ยินตรงกับบทเรียนหรือไม่</p></div></div><div class="progress-list">{#each allLearningItems as item}<article class="progress-row"><span class="progress-row__letter" class:progress-row__letter--word={item.category === 'words'}>{item.display}</span><div><strong>{item.name}</strong><small>ลอง {progress.items[item.id].attempts} ครั้ง</small></div><span class={`status-label status-label--${progress.items[item.id].status}`}>{label(progress.items[item.id].status)}</span></article>{/each}</div></section>
  </AppShell>
{/if}
