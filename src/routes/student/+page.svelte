<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { allLearningItems, getCategoryItems, learningCategories } from '$lib/data/learning.js';
  import { getLearningProgress, getSessionUser, summarizeLearning } from '$lib/storage.js';

  let user = null;
  let progress = null;
  let category = 'consonants';
  $: items = getCategoryItems(category);
  $: selectedCategory = learningCategories.find((item) => item.id === category) || learningCategories[0];
  $: summary = progress ? summarizeLearning(progress) : { practiced: 0, total: allLearningItems.length };

  onMount(() => {
    user = getSessionUser('student');
    if (!user) return goto('/');
    progress = getLearningProgress(user.id);
  });

  function stateFor(id) {
    return progress?.items[id]?.status || 'notStarted';
  }

</script>

<svelte:head><title>บทเรียน | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="student" {user} active="lessons">
    <section class="student-welcome"><div><p class="eyebrow">บทเรียนของฉัน</p><h1>สวัสดี {user.firstName}</h1><p>เลือกพยัญชนะ สระ หรือคำศัพท์ที่อยากฝึกได้เลย</p></div><div class="welcome-stat"><strong>{summary.practiced} / {allLearningItems.length}</strong><span>รายการที่ฝึกแล้ว</span></div></section>

    <section class="student-game-banner"><span class="game-banner-icon material-symbols-rounded" aria-hidden="true">hearing</span><div><p class="eyebrow">เกมฝึกทักษะการฟัง</p><h2>ฟังเสียง แล้วเลือกคำตอบ</h2><span>ทายพยัญชนะและสระจากเสียงตัวอย่าง เก็บคะแนนให้ครบ 10 ข้อ</span></div><a class="button button--primary" href="/student/game"><span class="material-symbols-rounded" aria-hidden="true">play_arrow</span>เริ่มเล่นเกม</a></section>

    <section class="student-game-banner student-game-banner--matching"><span class="game-banner-icon game-banner-icon--matching material-symbols-rounded" aria-hidden="true">extension</span><div><p class="eyebrow">เกมฝึกความจำ</p><h2>จับคู่ภาพกับพยัญชนะ</h2><span>คลังภาพครบ 44 ตัว สุ่มเล่นรอบละ 10 ตัว และสลับการ์ดใหม่ทุกครั้ง</span></div><a class="button button--primary" href="/student/matching-game"><span class="material-symbols-rounded" aria-hidden="true">play_arrow</span>เริ่มจับคู่</a></section>

    <div class="category-tabs" aria-label="เลือกหมวดบทเรียน">
      {#each learningCategories as lesson}
        <button class="category-tab" class:is-active={category === lesson.id} type="button" onclick={() => category = lesson.id}><span class="category-icon">{lesson.icon}</span><span><strong>{lesson.name}</strong><small>{lesson.description}</small></span><span>{lesson.count} บท</span></button>
      {/each}
    </div>

    <section class="panel"><div class="panel-head"><div><h2>{selectedCategory.heading}</h2><p>{category === 'words' ? 'เลือกคำศัพท์เพื่อเริ่มฟังเสียงและพูดตาม' : 'เลือกตัวอักษรเพื่อเริ่มฟังเสียงและพูดตาม'}</p></div></div><div class="letter-grid" class:letter-grid--words={category === 'words'}>
      {#each items as item, index}
        <a class="letter-tile" href={`/student/lesson/${category}/${index}`} aria-label={`เรียน ${item.name}`}><span class={`tile-status tile-status--${stateFor(item.id)}`}></span><strong>{item.display}</strong><small>{item.name}</small></a>
      {/each}
    </div></section>
  </AppShell>
{/if}
