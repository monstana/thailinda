<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import AppShell from '$lib/components/AppShell.svelte';
  import { allLearningItems } from '$lib/data/learning.js';
  import { getClassroomAssignments, getClassroomById, getClassroomStudents, getLearningProgress, getSessionUser, summarizeLearning } from '$lib/storage.js';

  let user = $state(null);
  let classroom = $state(null);
  let studentRows = $state([]);
  let assignments = $state([]);

  let activeStudents = $derived(studentRows.filter((row) => row.summary.practiced > 0).length);
  let needsSupport = $derived(studentRows.filter((row) => row.summary.needsPractice > 0).length);
  let averageProgress = $derived(studentRows.length ? Math.round(studentRows.reduce((sum, row) => sum + row.summary.passed, 0) / (studentRows.length * allLearningItems.length) * 100) : 0);

  onMount(() => {
    user = getSessionUser('teacher');
    if (!user) return goto('/');
    classroom = getClassroomById(page.params.classroomId);
    if (!classroom || classroom.teacherId !== user.id) return goto('/teacher');
    assignments = getClassroomAssignments(classroom, user.id);
    studentRows = getClassroomStudents(classroom).map((student) => {
      const progress = getLearningProgress(student.id);
      const states = Object.values(progress.items).filter((state) => state.lastAttemptAt);
      const lastActivity = states.sort((a, b) => new Date(b.lastAttemptAt) - new Date(a.lastAttemptAt))[0]?.lastAttemptAt || null;
      return {
        student,
        progress,
        summary: summarizeLearning(progress),
        lastActivity,
        avatarUrl: localStorage.getItem(`thailinda.studentAvatar.${student.id}`) || ''
      };
    });
  });

  function formatActivity(value) {
    if (!value) return 'ยังไม่มีการฝึก';
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }
</script>

<svelte:head><title>{classroom ? `${classroom.name} | ไทยลินดา` : 'รายชื่อนักเรียน | ไทยลินดา'}</title></svelte:head>

{#if user && classroom}
  <AppShell role="teacher" {user} active="classrooms">
    <nav class="page-breadcrumb" aria-label="เส้นทางนำทาง"><a href="/teacher">ห้องเรียน</a><span class="material-symbols-rounded" aria-hidden="true">chevron_right</span><span>{classroom.name}</span></nav>

    <section class="teacher-classroom-banner">
      <span class="material-symbols-rounded" aria-hidden="true">meeting_room</span>
      <div><p class="eyebrow">ห้องเรียนของฉัน</p><h1>{classroom.name}</h1><p>{classroom.level} · {classroom.group} · ปีการศึกษา {classroom.academicYear}</p></div>
      <a class="button button--secondary" href="/teacher/assignments"><span class="material-symbols-rounded" aria-hidden="true">assignment_add</span>สร้างงานให้ห้องนี้</a>
    </section>

    <section class="teacher-summary-grid teacher-summary-grid--four">
      <article><span class="material-symbols-rounded" aria-hidden="true">groups</span><div><strong>{studentRows.length}</strong><small>บัญชีนักเรียนในห้อง</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">record_voice_over</span><div><strong>{activeStudents}</strong><small>เริ่มฝึกแล้ว</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">assignment</span><div><strong>{assignments.length}</strong><small>งานที่มอบหมาย</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">monitoring</span><div><strong>{averageProgress}%</strong><small>ความก้าวหน้าเฉลี่ย</small></div></article>
    </section>

    <section class="panel teacher-roster-panel">
      <div class="panel-head"><div><h2>นักเรียนทุกคนในห้อง</h2><p>{studentRows.length} บัญชีที่เชื่อมต่อ · {needsSupport} คนควรได้รับการติดตาม</p></div></div>
      <div class="teacher-student-list">
        {#each studentRows as row}
          <a class="teacher-student-row" href={`/teacher/classrooms/${classroom.id}/students/${row.student.id}`} aria-label={`ดูรายงานของ ${row.student.firstName} ${row.student.lastName}`}>
            <span class="teacher-student-avatar">
              {#if row.avatarUrl}<img src={row.avatarUrl} alt="" />{:else}<span class="material-symbols-rounded" aria-hidden="true">face</span>{/if}
            </span>
            <div class="teacher-student-identity"><strong>{row.student.firstName} {row.student.lastName}</strong><small>{row.student.email}</small><span>ล่าสุด {formatActivity(row.lastActivity)}</span></div>
            <div class="teacher-student-metric"><strong>{row.summary.passed}<small>/{allLearningItems.length}</small></strong><span>ผ่านแล้ว</span></div>
            <div class="teacher-student-progress"><div><i style:width={`${(row.summary.passed / allLearningItems.length) * 100}%`}></i></div><span>ฝึกแล้ว {row.summary.practiced} · พูด {row.summary.attempts} ครั้ง</span></div>
            <span class={`status-label ${row.summary.needsPractice ? 'status-label--needsPractice' : row.summary.practiced ? 'status-label--passed' : 'status-label--notStarted'}`}>{row.summary.needsPractice ? `ฝึกเพิ่ม ${row.summary.needsPractice}` : row.summary.practiced ? 'กำลังเรียน' : 'ยังไม่เริ่ม'}</span>
            <span class="material-symbols-rounded teacher-row-chevron" aria-hidden="true">chevron_right</span>
          </a>
        {:else}
          <div class="empty-state"><span class="material-symbols-rounded" aria-hidden="true">person_add</span><strong>ยังไม่มีบัญชีนักเรียนในห้องนี้</strong><span>นักเรียนจะปรากฏเมื่อมีบัญชีจากโรงเรียนเดียวกันเชื่อมต่อกับห้องเรียน</span></div>
        {/each}
      </div>
    </section>
  </AppShell>
{/if}
