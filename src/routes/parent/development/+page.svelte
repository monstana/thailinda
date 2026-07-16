<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { getAllUsers } from '$lib/data/users.js';
  import { allLearningItems, consonants, vowels, words } from '$lib/data/learning.js';
  import { getLearningProgress, getSessionUser, summarizeLearning } from '$lib/storage.js';

  const rewardLevels = [
    { passed: 0, name: 'ผู้กล้าเริ่มต้น', icon: 'flag' },
    { passed: 10, name: 'ดาวทองแดง', icon: 'stars' },
    { passed: 25, name: 'ดาวเงิน', icon: 'workspace_premium' },
    { passed: 44, name: 'ดาวทอง', icon: 'military_tech' },
    { passed: 60, name: 'เพชรภาษาไทย', icon: 'diamond' },
    { passed: 76, name: 'ปรมาจารย์เสียงไทย', icon: 'trophy' },
    { passed: 86, name: 'นักอ่านคำยอดเยี่ยม', icon: 'auto_stories' }
  ];

  let user = null;
  let children = [];
  let selectedChildId = '';
  let showFullReport = false;

  $: child = children.find((account) => account.id === selectedChildId) || children[0] || null;
  $: progress = child ? getLearningProgress(child.id) : null;
  $: summary = progress ? summarizeLearning(progress) : { practiced: 0, passed: 0, needsPractice: 0, attempts: 0 };
  $: weeklyDays = progress ? buildWeek(progress, 0) : [];
  $: previousDays = progress ? buildWeek(progress, 7) : [];
  $: weeklyAttempts = weeklyDays.reduce((sum, day) => sum + day.attempts, 0);
  $: previousAttempts = previousDays.reduce((sum, day) => sum + day.attempts, 0);
  $: weeklyPassed = weeklyDays.reduce((sum, day) => sum + day.passed, 0);
  $: previousPassed = previousDays.reduce((sum, day) => sum + day.passed, 0);
  $: maxDailyAttempts = Math.max(1, ...weeklyDays.map((day) => day.attempts));
  $: currentReward = [...rewardLevels].reverse().find((reward) => summary.passed >= reward.passed) || rewardLevels[0];
  $: nextReward = rewardLevels.find((reward) => reward.passed > summary.passed) || currentReward;
  $: consonantSummary = progress ? summarizeLearning(progress, consonants.map((item) => item.id)) : { passed: 0, practiced: 0 };
  $: vowelSummary = progress ? summarizeLearning(progress, vowels.map((item) => item.id)) : { passed: 0, practiced: 0 };
  $: wordSummary = progress ? summarizeLearning(progress, words.map((item) => item.id)) : { passed: 0, practiced: 0 };

  onMount(() => {
    user = getSessionUser('parent');
    if (!user) return goto('/');
    children = getAllUsers().filter((account) => account.role === 'student' && account.school === user.school);
    selectedChildId = children[0]?.id || '';
  });

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function buildWeek(learningProgress, offsetDays) {
    const formatter = new Intl.DateTimeFormat('th-TH', { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offsetDays - (6 - index));
      const key = dateKey(date);
      const states = Object.values(learningProgress.items).filter((state) => state.lastAttemptAt && dateKey(new Date(state.lastAttemptAt)) === key);
      return { key, label: formatter.format(date), attempts: states.reduce((sum, state) => sum + state.attempts, 0), passed: states.filter((state) => state.status === 'passed').length };
    });
  }

  function comparison(current, previous) {
    if (previous === 0) return current === 0 ? 'เท่าเดิม' : `เพิ่มขึ้น ${current}`;
    const percent = Math.round(((current - previous) / previous) * 100);
    return percent === 0 ? 'เท่าเดิม' : `${percent > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(percent)}%`;
  }

  function statusText(status) {
    if (status === 'passed') return 'ผ่านแล้ว';
    if (status === 'needsPractice') return 'ควรฝึกเพิ่ม';
    return 'ยังไม่เริ่ม';
  }
</script>

<svelte:head><title>พัฒนาการบุตรหลาน | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="parent" {user} active="development">
    <div class="page-head parent-page-head"><div><p class="eyebrow">ติดตามความก้าวหน้า</p><h1>พัฒนาการของบุตรหลาน</h1><p>สถิติรายสัปดาห์ รางวัล และรายละเอียดการฝึกภาษาไทย</p></div>{#if children.length > 1}<label class="child-picker"><span>เลือกบุตรหลาน</span><select bind:value={selectedChildId}>{#each children as account}<option value={account.id}>{account.firstName} {account.lastName}</option>{/each}</select></label>{/if}</div>

    {#if child && progress}
      <section class="development-banner"><div><small>รายงานของ</small><h2>{child.firstName} {child.lastName}</h2><p>ข้อมูลล่าสุดจากการฝึกบนอุปกรณ์นี้</p></div><button class="button button--secondary" type="button" onclick={() => showFullReport = !showFullReport}><span class="material-symbols-rounded" aria-hidden="true">description</span>{showFullReport ? 'ปิดรายงานฉบับเต็ม' : 'รายงานฉบับเต็ม'}</button></section>

      <section class="parent-development-grid">
        <article><span class="material-symbols-rounded" aria-hidden="true">spellcheck</span><div><strong>{summary.practiced}</strong><small>รายการที่ฝึก</small><em>{comparison(weeklyAttempts, previousAttempts)} จากสัปดาห์ก่อน</em></div></article>
        <article><span class="material-symbols-rounded" aria-hidden="true">task_alt</span><div><strong>{summary.passed}</strong><small>ผ่านแล้ว</small><em>{comparison(weeklyPassed, previousPassed)} จากสัปดาห์ก่อน</em></div></article>
        <article><span class="material-symbols-rounded" aria-hidden="true">record_voice_over</span><div><strong>{summary.attempts}</strong><small>จำนวนครั้งที่พูด</small><em>{weeklyAttempts} ครั้งใน 7 วัน</em></div></article>
        <article><span class="material-symbols-rounded" aria-hidden="true">refresh</span><div><strong>{summary.needsPractice}</strong><small>ควรฝึกเพิ่ม</small><em>ติดตามอย่างต่อเนื่อง</em></div></article>
      </section>

      <div class="development-main-grid">
        <section class="panel weekly-panel"><div class="panel-head"><div><h2>สถิติการเรียนรู้รายสัปดาห์</h2><p>จำนวนครั้งที่พูดในช่วง 7 วันที่ผ่านมา</p></div><span class="week-total">{weeklyAttempts} ครั้ง</span></div><div class="weekly-chart" aria-label="กราฟการฝึกรายสัปดาห์">{#each weeklyDays as day}<div class="weekly-column"><div class="weekly-bar-track"><i style:height={`${Math.max(day.attempts ? 12 : 2, (day.attempts / maxDailyAttempts) * 100)}%`}></i></div><strong>{day.attempts}</strong><span>{day.label}</span></div>{/each}</div><div class="week-comparison"><span class="material-symbols-rounded" aria-hidden="true">compare_arrows</span><p><strong>เปรียบเทียบกับสัปดาห์ก่อน</strong><small>{comparison(weeklyAttempts, previousAttempts)} · สัปดาห์ก่อน {previousAttempts} ครั้ง</small></p></div></section>

        <section class="parent-reward-card"><span class="reward-medal material-symbols-rounded" aria-hidden="true">{currentReward.icon}</span><div><small>ระดับรางวัลปัจจุบัน</small><h2>{currentReward.name}</h2><p>ผ่านแล้ว {summary.passed} จาก {allLearningItems.length} รายการ</p><div class="reward-progress"><i style:width={`${Math.min(100, (summary.passed / Math.max(1, nextReward.passed)) * 100)}%`}></i></div><small>{nextReward === currentReward ? 'ได้รับรางวัลสูงสุดแล้ว' : `อีก ${nextReward.passed - summary.passed} รายการถึง ${nextReward.name}`}</small></div></section>
      </div>

      <section class="category-results parent-category-results"><article><span class="category-icon">ก</span><div><strong>พยัญชนะไทย</strong><small>ผ่าน {consonantSummary.passed} · ฝึกแล้ว {consonantSummary.practiced} จาก 44 ตัว</small><div><i style:width={`${(consonantSummary.passed / 44) * 100}%`}></i></div></div></article><article><span class="category-icon">อะ</span><div><strong>สระไทย</strong><small>ผ่าน {vowelSummary.passed} · ฝึกแล้ว {vowelSummary.practiced} จาก 32 เสียง</small><div><i style:width={`${(vowelSummary.passed / 32) * 100}%`}></i></div></div></article><article><span class="category-icon">กา</span><div><strong>คำศัพท์พื้นฐาน</strong><small>ผ่าน {wordSummary.passed} · ฝึกแล้ว {wordSummary.practiced} จาก 10 คำ</small><div><i style:width={`${(wordSummary.passed / 10) * 100}%`}></i></div></div></article></section>

      {#if showFullReport}
        <section class="panel full-report"><div class="panel-head"><div><h2>รายงานผลการเรียนฉบับเต็ม</h2><p>สถานะพยัญชนะ สระ และคำศัพท์ครบทั้ง {allLearningItems.length} รายการ</p></div><button class="icon-button" type="button" onclick={() => window.print()} aria-label="พิมพ์รายงาน" title="พิมพ์รายงาน"><span class="material-symbols-rounded" aria-hidden="true">print</span></button></div><div class="full-report-list">{#each allLearningItems as item}<article><strong>{item.display}</strong><span>{item.name}</span><small class={`status-label status-label--${progress.items[item.id]?.status || 'notStarted'}`}>{statusText(progress.items[item.id]?.status)}</small><em>{progress.items[item.id]?.attempts || 0} ครั้ง</em></article>{/each}</div></section>
      {/if}
    {:else}<div class="empty-state panel"><span class="material-symbols-rounded" aria-hidden="true">person_off</span><strong>ยังไม่พบบัญชีนักเรียนที่เชื่อมต่อ</strong></div>{/if}
  </AppShell>
{/if}
