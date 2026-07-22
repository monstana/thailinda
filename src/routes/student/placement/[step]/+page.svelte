<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import LessonPlayer from '$lib/components/LessonPlayer.svelte';
  import { fetchPlacementAssessment, isApiEnabled } from '$lib/api.js';
  import { itemById } from '$lib/data/learning.js';
  import {
    createPlacementAssessment,
    getPlacementAssessment,
    savePlacementAssessment,
    savePlacementAttempt
  } from '$lib/placement-assessment.js';
  import { getSessionUser } from '$lib/storage.js';

  let user = $state(null);
  let assessment = $state(null);
  let loading = $state(true);
  let error = $state('');
  let index = $derived(Math.max(0, Math.min(5, Number(page.params.step) || 0)));
  let items = $derived((assessment?.itemIds || []).map((itemId) => itemById[itemId]).filter(Boolean));

  onMount(async () => {
    user = getSessionUser('student');
    if (!user) return goto('/');
    try {
      if (isApiEnabled()) {
        const payload = await fetchPlacementAssessment(user.id);
        assessment = payload.placementAssessment;
        if (assessment) savePlacementAssessment(assessment);
      } else {
        assessment = getPlacementAssessment(user.id) || createPlacementAssessment(user.id);
      }
      if (assessment?.status === 'completed') return goto('/student/placement/result');
      if (items.length !== 6) error = 'ไม่สามารถสร้างแบบประเมิน 6 ข้อได้ กรุณากลับเข้าสู่ระบบใหม่';
    } catch (loadError) {
      error = loadError?.message || 'โหลดแบบประเมินไม่สำเร็จ';
    } finally {
      loading = false;
    }
  });

  function keepResult(result) {
    assessment = savePlacementAttempt(user.id, result);
  }
</script>

<svelte:head><title>แบบประเมินระดับ | ไทยลินดา</title></svelte:head>

{#if loading}
  <main class="placement-loading"><span class="material-symbols-rounded spin" aria-hidden="true">progress_activity</span><strong>กำลังสุ่มแบบประเมินของหนู...</strong></main>
{:else if error}
  <main class="placement-loading placement-loading--error"><span class="material-symbols-rounded" aria-hidden="true">error</span><strong>{error}</strong><a class="button button--primary" href="/">กลับหน้าเข้าสู่ระบบ</a></main>
{:else if user && items.length === 6}
  <LessonPlayer
    {items}
    {index}
    {user}
    basePath="/student/placement"
    exitHref="/student"
    assignmentTitle="แบบประเมินระดับแรกเข้า"
    onAssessment={keepResult}
    requireCamera
    singleAttempt
    captureMouthWithoutReference
    completionHref="/student/placement/result"
    completionLabel="ดูผลประเมิน"
  />
{/if}

<style>
  .placement-loading { min-height: 100vh; display: grid; place-content: center; justify-items: center; gap: 14px; padding: 24px; text-align: center; background: #f5faf8; }
  .placement-loading > span { font-size: 42px; color: #16856f; }
  .placement-loading--error > span { color: #bd493d; }
</style>
