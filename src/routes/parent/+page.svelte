<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { getAllUsers } from '$lib/data/users.js';
  import { allLearningItems, itemById } from '$lib/data/learning.js';
  import { getAssignments, getLearningProgress, getSessionUser, summarizeLearning } from '$lib/storage.js';

  let user = null;
  let children = [];
  let selectedChildId = '';
  let assignments = [];

  $: child = children.find((account) => account.id === selectedChildId) || children[0] || null;
  $: progress = child ? getLearningProgress(child.id) : null;
  $: summary = progress ? summarizeLearning(progress) : { practiced: 0, passed: 0, needsPractice: 0, attempts: 0 };
  $: assignmentRows = progress ? assignments.map((assignment) => {
    const completed = assignment.itemIds.filter((id) => progress.items[id]?.status === 'passed').length;
    const percent = assignment.itemIds.length ? Math.round((completed / assignment.itemIds.length) * 100) : 0;
    return { ...assignment, completed, percent, submitted: percent === 100 };
  }) : [];
  $: submittedCount = assignmentRows.filter((assignment) => assignment.submitted).length;
  $: pendingCount = assignmentRows.length - submittedCount;
  $: averageScore = assignmentRows.length ? Math.round(assignmentRows.reduce((sum, assignment) => sum + assignment.percent, 0) / assignmentRows.length) : 0;
  $: learnerStatus = summary.practiced === 0 ? 'พร้อมเริ่มเรียน' : summary.needsPractice > 0 ? 'มีหัวข้อที่ควรฝึกเพิ่ม' : summary.passed >= 60 ? 'พัฒนาการยอดเยี่ยม' : 'กำลังพัฒนาอย่างต่อเนื่อง';

  onMount(() => {
    user = getSessionUser('parent');
    if (!user) return goto('/');
    children = getAllUsers().filter((account) => account.role === 'student' && account.school === user.school);
    selectedChildId = children[0]?.id || '';
    assignments = getAssignments().filter((assignment) => assignment.status === 'active').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  function formatDue(value) {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  }
</script>

<svelte:head><title>หน้าหลักผู้ปกครอง | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="parent" {user} active="home">
    <div class="page-head parent-page-head"><div><p class="eyebrow">สำหรับผู้ปกครอง</p><h1>การเรียนรู้ของบุตรหลาน</h1><p>ติดตามงาน ผลการฝึก และสถานะการเรียนล่าสุด</p></div>{#if children.length > 1}<label class="child-picker"><span>เลือกบุตรหลาน</span><select bind:value={selectedChildId}>{#each children as account}<option value={account.id}>{account.firstName} {account.lastName}</option>{/each}</select></label>{/if}</div>

    {#if child && progress}
      <section class="parent-child-banner"><span class="parent-child-avatar material-symbols-rounded" aria-hidden="true">face</span><div><small>กำลังติดตาม</small><h2>{child.firstName} {child.lastName}</h2><p>ชั้นประถมศึกษาปีที่ 1/2 · {child.school}</p></div><a class="button button--secondary" href="/parent/development">ดูพัฒนาการ</a></section>

      <section class="parent-kpi-grid">
        <article><span class="kpi-icon kpi-icon--green material-symbols-rounded" aria-hidden="true">task_alt</span><div><strong>{submittedCount}</strong><small>งานที่ส่งแล้ว</small></div></article>
        <article><span class="kpi-icon kpi-icon--orange material-symbols-rounded" aria-hidden="true">pending_actions</span><div><strong>{pendingCount}</strong><small>งานที่ยังไม่ได้ส่ง</small></div></article>
        <article><span class="kpi-icon kpi-icon--blue material-symbols-rounded" aria-hidden="true">workspace_premium</span><div><strong>{averageScore}%</strong><small>คะแนนเฉลี่ย</small></div></article>
      </section>

      <div class="parent-home-grid">
        <section class="panel"><div class="panel-head"><div><h2>รายการงานล่าสุด</h2><p>{assignmentRows.length} งานจากคุณครู</p></div></div><div class="parent-assignment-list">
          {#each assignmentRows.slice(0, 5) as assignment}
            <article class="parent-assignment-row"><span class="assignment-state-icon material-symbols-rounded" class:is-complete={assignment.submitted} aria-hidden="true">{assignment.submitted ? 'check_circle' : 'assignment'}</span><div><div class="parent-assignment-title"><strong>{assignment.title}</strong><span class={`status-label ${assignment.submitted ? 'status-label--passed' : 'status-label--needsPractice'}`}>{assignment.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง'}</span></div><p>{assignment.classroomName || 'ห้อง ป.1/2'} · ส่ง {formatDue(assignment.dueDate)}</p><div class="parent-task-progress"><i style:width={`${assignment.percent}%`}></i></div><small>ผ่านแล้ว {assignment.completed} จาก {assignment.itemIds.length} รายการฝึก</small><div class="inline-items compact-items">{#each assignment.itemIds.slice(0, 8) as id}<span>{itemById[id]?.display}</span>{/each}</div></div></article>
          {:else}<div class="empty-state"><span class="material-symbols-rounded" aria-hidden="true">assignment_late</span><strong>ยังไม่มีงานจากคุณครู</strong></div>{/each}
        </div></section>

        <section class="panel learner-status-panel"><div class="panel-head"><div><h2>สถานะของผู้เรียน</h2><p>อัปเดตจากการฝึกล่าสุด</p></div></div><div class="learner-status-body"><div class="learner-status-ring" style={`--progress:${Math.round((summary.passed / allLearningItems.length) * 360)}deg`}><span><strong>{summary.passed}</strong><small>/ {allLearningItems.length}</small></span></div><h3>{learnerStatus}</h3><p>ฝึกแล้ว {summary.practiced} รายการ จากการพูดทั้งหมด {summary.attempts} ครั้ง</p><div class="learner-mini-stats"><div><strong>{summary.passed}</strong><span>ผ่านแล้ว</span></div><div><strong>{summary.needsPractice}</strong><span>ฝึกเพิ่ม</span></div></div><a class="button button--primary" href="/parent/development">ดูรายละเอียดพัฒนาการ</a></div></section>
      </div>
    {:else}
      <div class="empty-state panel"><span class="material-symbols-rounded" aria-hidden="true">person_off</span><strong>ยังไม่พบบัญชีนักเรียนที่เชื่อมต่อ</strong><span>บัญชีนักเรียนต้องใช้ชื่อโรงเรียนเดียวกับผู้ปกครอง</span></div>
    {/if}
  </AppShell>
{/if}
