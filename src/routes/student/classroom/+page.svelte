<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { getAllUsers } from '$lib/data/users.js';
  import { itemById } from '$lib/data/learning.js';
  import { getAssignments, getLearningProgress, getSessionUser } from '$lib/storage.js';

  let user = null;
  let teacher = null;
  let progress = null;
  let assignments = [];

  onMount(() => {
    user = getSessionUser('student');
    if (!user) return goto('/');
    teacher = getAllUsers().find((account) => account.role === 'teacher' && account.school === user.school) || null;
    progress = getLearningProgress(user.id);
    assignments = getAssignments().filter((assignment) => assignment.status === 'active');
  });

  function practicedCount(assignment) {
    return assignment.itemIds.filter((id) => progress?.items[id]?.status !== 'notStarted').length;
  }

  function teacherName(assignment) {
    const account = getAllUsers().find((item) => item.id === assignment.teacherId);
    return account ? `${account.firstName} ${account.lastName}` : teacher?.firstName || 'คุณครู';
  }

  function formatDue(value) {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  }
</script>

<svelte:head><title>ห้องเรียน | ไทยลินดา</title></svelte:head>

{#if user && progress}
  <AppShell role="student" {user} active="classroom">
    <div class="page-head"><div><p class="eyebrow">ห้องเรียนของฉัน</p><h1>ประถมศึกษาปีที่ 1/2</h1><p>{user.school}</p></div></div>

    <section class="classroom-overview">
      <article><span class="classroom-icon classroom-icon--blue material-symbols-rounded" aria-hidden="true">school</span><div><small>ชั้นเรียน</small><strong>ป.1/2</strong><p>ปีการศึกษา 2569</p></div></article>
      <article><span class="classroom-icon classroom-icon--yellow material-symbols-rounded" aria-hidden="true">groups</span><div><small>กลุ่มเรียน</small><strong>กลุ่มสายรุ้ง</strong><p>ฝึกภาษาไทยพื้นฐาน</p></div></article>
      <article><span class="classroom-icon classroom-icon--orange material-symbols-rounded" aria-hidden="true">person_apron</span><div><small>ครูประจำชั้น</small><strong>{teacher ? `${teacher.firstName} ${teacher.lastName}` : 'ยังไม่เชื่อมต่อครู'}</strong><p>{teacher?.email || user.school}</p></div></article>
    </section>

    <section class="panel"><div class="panel-head"><div><h2>งานที่คุณครูมอบหมาย</h2><p>{assignments.length} งานที่กำลังดำเนินการ</p></div></div><div class="student-task-list">
      {#each assignments as assignment}
        <article class="student-task"><span class="row-icon row-icon--assignment material-symbols-rounded" aria-hidden="true">assignment</span><div class="student-task__main"><div class="student-task__title"><h3>{assignment.title}</h3><span>ส่ง {formatDue(assignment.dueDate)}</span></div><p>มอบหมายโดย {teacherName(assignment)} · {assignment.itemIds.length} รายการฝึก</p><div class="task-items">{#each assignment.itemIds.slice(0, 12) as id}<span>{itemById[id]?.display}</span>{/each}{#if assignment.itemIds.length > 12}<span>+{assignment.itemIds.length - 12}</span>{/if}</div><div class="task-progress"><span style:width={`${assignment.itemIds.length ? (practicedCount(assignment) / assignment.itemIds.length) * 100 : 0}%`}></span></div><small>ฝึกแล้ว {practicedCount(assignment)} จาก {assignment.itemIds.length}</small></div><a class="button button--primary" href={`/student/practice/${assignment.id}/0`}>เริ่มฝึก</a></article>
      {:else}
        <div class="empty-state"><span class="material-symbols-rounded" aria-hidden="true">assignment_late</span><strong>ยังไม่มีงานที่คุณครูมอบหมาย</strong><span>เมื่อคุณครูสร้างชุดฝึก งานจะปรากฏที่นี่</span></div>
      {/each}
    </div></section>
  </AppShell>
{/if}
