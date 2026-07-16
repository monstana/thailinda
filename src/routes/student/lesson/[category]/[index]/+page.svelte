<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import LessonPlayer from '$lib/components/LessonPlayer.svelte';
  import { getCategoryItems } from '$lib/data/learning.js';
  import { getSessionUser } from '$lib/storage.js';

  let user = $state(null);
  let category = $derived(['vowels', 'words'].includes(page.params.category) ? page.params.category : 'consonants');
  let items = $derived(getCategoryItems(category));
  let index = $derived(Math.max(0, Math.min(items.length - 1, Number(page.params.index) || 0)));

  onMount(() => {
    user = getSessionUser('student');
    if (!user) goto('/');
  });
</script>

{#if user}<LessonPlayer {items} {index} {user} basePath={`/student/lesson/${category}`} exitHref="/student" />{/if}
