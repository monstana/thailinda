<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PlacementSummaryCard from '$lib/components/PlacementSummaryCard.svelte';
  import { isApiEnabled, submitPlacementAssessment } from '$lib/api.js';
  import { itemById } from '$lib/data/learning.js';
  import {
    finalizePlacementAssessment,
    getPlacementAssessment,
    placementIsReady,
    savePlacementAssessment
  } from '$lib/placement-assessment.js';
  import { getSessionUser } from '$lib/storage.js';

  let user = $state(null);
  let assessment = $state(null);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    user = getSessionUser('student');
    if (!user) return goto('/');
    assessment = getPlacementAssessment(user.id);
    if (!placementIsReady(assessment)) return goto('/student/placement/0');
    try {
      if (assessment.status !== 'completed') {
        if (isApiEnabled()) {
          const payload = await submitPlacementAssessment(user.id, Object.values(assessment.results));
          assessment = payload.placementAssessment;
          savePlacementAssessment(assessment);
        } else {
          assessment = finalizePlacementAssessment(user.id);
        }
      }
    } catch (submitError) {
      error = submitError?.message || 'ประมวลผลคะแนนไม่สำเร็จ';
    } finally {
      loading = false;
    }
  });

  function categoryLabel(category) {
    if (category === 'vowels') return 'สระ';
    if (category === 'words') return 'คำศัพท์';
    return 'พยัญชนะ';
  }
</script>

<svelte:head><title>ผลประเมินระดับ | ไทยลินดา</title></svelte:head>

<main class="placement-result-page">
  {#if loading}
    <section class="placement-result-state"><span class="material-symbols-rounded spin" aria-hidden="true">progress_activity</span><h1>กำลังคำนวณผลประเมิน</h1><p>Typhoon กำลังสรุปผลเสียงและรูปปากทั้ง 6 ข้อ</p></section>
  {:else if error}
    <section class="placement-result-state"><span class="material-symbols-rounded" aria-hidden="true">error</span><h1>ยังสรุปผลไม่ได้</h1><p>{error}</p><button class="button button--primary" type="button" onclick={() => location.reload()}>ลองประมวลผลอีกครั้ง</button></section>
  {:else if assessment?.status === 'completed'}
    <header class="placement-result-head"><span class="material-symbols-rounded" aria-hidden="true">verified</span><p>ทำครบแล้ว เก่งมาก!</p><h1>ผลประเมินระดับของ {user.firstName}</h1><small>คะแนนเสียงเป็นหลัก 85% และรูปปากเป็นข้อมูลเสริม 15%</small></header>
    <PlacementSummaryCard {assessment} />
    <section class="placement-result-items">
      <h2>ผลรายข้อ</h2>
      <div>
        {#each assessment.itemIds as itemId}
          {@const item = itemById[itemId]}
          {@const result = assessment.results?.[itemId]}
          <article><span>{item?.display}</span><div><small>{categoryLabel(item?.category)}</small><strong>{item?.name}</strong><p>Typhoon ได้ยิน “{result?.transcript || '—'}”</p></div><strong>{result?.score ?? 0}</strong></article>
        {/each}
      </div>
    </section>
    <a class="button button--primary placement-finish" href="/student">เริ่มเรียนตามคำแนะนำ<span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span></a>
  {/if}
</main>

<style>
  .placement-result-page { width: min(900px, calc(100% - 32px)); margin: 0 auto; padding: 44px 0 64px; }
  .placement-result-head { text-align: center; }
  .placement-result-head > span, .placement-result-state > span { font-size: 52px; color: #16856f; }
  .placement-result-head p { margin: 8px 0 0; color: #16856f; font-weight: 800; }
  .placement-result-head h1 { margin: 4px 0; }
  .placement-result-head small { color: #687774; }
  .placement-result-state { min-height: 70vh; display: grid; place-content: center; justify-items: center; text-align: center; }
  .placement-result-items { padding: 24px; border-radius: 24px; background: white; border: 1px solid #e4ebe9; }
  .placement-result-items h2 { margin-top: 0; }
  .placement-result-items article { display: grid; grid-template-columns: 58px 1fr auto; gap: 14px; align-items: center; padding: 13px 0; border-top: 1px solid #edf1f0; }
  .placement-result-items article > span { display: grid; place-content: center; width: 52px; height: 52px; border-radius: 14px; background: #edf8f5; color: #0d6555; font-size: 1.45rem; font-weight: 800; }
  .placement-result-items article div strong, .placement-result-items article div small { display: block; }
  .placement-result-items article div small { color: #8a7060; }
  .placement-result-items article p { margin: 2px 0 0; color: #687774; }
  .placement-result-items article > strong { font-size: 1.35rem; color: #16856f; }
  .placement-finish { display: flex; width: fit-content; margin: 24px auto 0; }
</style>
