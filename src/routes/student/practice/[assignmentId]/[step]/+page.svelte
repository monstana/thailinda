<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import LessonPlayer from '$lib/components/LessonPlayer.svelte';
  import { itemById } from '$lib/data/learning.js';
  import { getAssignments, getSessionUser } from '$lib/storage.js';

  let user = $state(null);
  let assignment = $state(null);
  let items = $state([]);
  let index = $derived(Math.max(0, Math.min(items.length - 1, Number(page.params.step) || 0)));

  onMount(() => {
    user = getSessionUser('student');
    if (!user) return goto('/');
    assignment = getAssignments().find((item) => item.id === page.params.assignmentId);
    if (!assignment) return goto('/student');
    items = assignment.itemIds.map((id) => itemById[id]).filter(Boolean);
  });
</script>

{#if user && assignment && items.length}<LessonPlayer {items} {index} {user} basePath={`/student/practice/${assignment.id}`} exitHref="/student" assignmentTitle={assignment.title} />{/if}
