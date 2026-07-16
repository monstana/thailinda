<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import AppShell from '$lib/components/AppShell.svelte';
  import { allLearningItems, consonants, vowels, words } from '$lib/data/learning.js';
  import { getClassroomAssignments, getClassroomById, getClassroomStudents, getLearningProgress, getSessionUser, summarizeLearning } from '$lib/storage.js';

  const rewardLevels = [
    { min: 0, name: 'ผู้กล้าเริ่มต้น', icon: 'flag' },
    { min: 10, name: 'ดาวทองแดง', icon: 'stars' },
    { min: 25, name: 'ดาวเงิน', icon: 'workspace_premium' },
    { min: 44, name: 'ดาวทอง', icon: 'military_tech' },
    { min: 60, name: 'เพชรภาษาไทย', icon: 'diamond' },
    { min: 76, name: 'ปรมาจารย์เสียงไทย', icon: 'trophy' },
    { min: 86, name: 'นักอ่านคำยอดเยี่ยม', icon: 'auto_stories' }
  ];

  let user = $state(null);
  let classroom = $state(null);
  let student = $state(null);
  let progress = $state(null);
  let assignments = $state([]);
  let avatarUrl = $state('');

  let summary = $derived(progress ? summarizeLearning(progress) : { practiced: 0, passed: 0, needsPractice: 0, attempts: 0 });
  let consonantSummary = $derived(progress ? summarizeLearning(progress, consonants.map((item) => item.id)) : { practiced: 0, passed: 0 });
  let vowelSummary = $derived(progress ? summarizeLearning(progress, vowels.map((item) => item.id)) : { practiced: 0, passed: 0 });
  let wordSummary = $derived(progress ? summarizeLearning(progress, words.map((item) => item.id)) : { practiced: 0, passed: 0 });
  let currentReward = $derived([...rewardLevels].reverse().find((reward) => summary.passed >= reward.min) || rewardLevels[0]);
  let needsPracticeItems = $derived(progress ? allLearningItems.filter((item) => progress.items[item.id]?.status === 'needsPractice') : []);
  let assignmentRows = $derived(progress ? assignments.map((assignment) => ({
    ...assignment,
    practiced: assignment.itemIds.filter((id) => progress.items[id]?.status !== 'notStarted').length,
    passed: assignment.itemIds.filter((id) => progress.items[id]?.status === 'passed').length
  })) : []);

  onMount(() => {
    user = getSessionUser('teacher');
    if (!user) return goto('/');
    classroom = getClassroomById(page.params.classroomId);
    if (!classroom || classroom.teacherId !== user.id) return goto('/teacher');
    student = getClassroomStudents(classroom).find((account) => account.id === page.params.studentId) || null;
    if (!student) return goto(`/teacher/classrooms/${classroom.id}`);
    progress = getLearningProgress(student.id);
    assignments = getClassroomAssignments(classroom, user.id);
    avatarUrl = localStorage.getItem(`thailinda.studentAvatar.${student.id}`) || '';
  });

  function statusText(status) {
    if (status === 'passed') return 'ผ่านแล้ว';
    if (status === 'needsPractice') return 'ควรฝึกเพิ่ม';
    return 'ยังไม่เริ่ม';
  }

  function formatDue(value) {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  }

  function formatUpdated(value) {
    if (!value) return 'ยังไม่มีข้อมูลการฝึก';
    return `อัปเดต ${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))}`;
  }
</script>

<svelte:head><title>{student ? `รายงาน ${student.firstName} | ไทยลินดา` : 'รายงานนักเรียน | ไทยลินดา'}</title></svelte:head>

{#if user && classroom && student && progress}
  <AppShell role="teacher" {user} active="classrooms">
    <nav class="page-breadcrumb" aria-label="เส้นทางนำทาง"><a href="/teacher">ห้องเรียน</a><span class="material-symbols-rounded" aria-hidden="true">chevron_right</span><a href={`/teacher/classrooms/${classroom.id}`}>{classroom.name}</a><span class="material-symbols-rounded" aria-hidden="true">chevron_right</span><span>{student.firstName}</span></nav>

    <section class="teacher-student-report-head">
      <span class="teacher-report-avatar">{#if avatarUrl}<img src={avatarUrl} alt={`รูปโปรไฟล์ของ ${student.firstName}`} />{:else}<span class="material-symbols-rounded" aria-hidden="true">face</span>{/if}</span>
      <div><p class="eyebrow">รายงานผลรายบุคคล</p><h1>{student.firstName} {student.lastName}</h1><p>{classroom.name} · {classroom.level} · {formatUpdated(progress.updatedAt)}</p></div>
      <div class="teacher-report-actions"><span><span class="material-symbols-rounded" aria-hidden="true">{currentReward.icon}</span><small>ระดับรางวัล</small><strong>{currentReward.name}</strong></span><button class="icon-button" type="button" onclick={() => window.print()} aria-label="พิมพ์รายงาน" title="พิมพ์รายงาน"><span class="material-symbols-rounded" aria-hidden="true">print</span></button></div>
    </section>

    <section class="teacher-summary-grid teacher-summary-grid--four">
      <article><span class="material-symbols-rounded" aria-hidden="true">spellcheck</span><div><strong>{summary.practiced}</strong><small>รายการที่ฝึก</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">task_alt</span><div><strong>{summary.passed}</strong><small>ผ่านแล้ว</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">refresh</span><div><strong>{summary.needsPractice}</strong><small>ควรฝึกเพิ่ม</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">record_voice_over</span><div><strong>{summary.attempts}</strong><small>จำนวนครั้งที่พูด</small></div></article>
    </section>

    <section class="category-results teacher-report-categories">
      <article><span class="category-icon">ก</span><div><strong>พยัญชนะไทย</strong><small>ผ่าน {consonantSummary.passed} · ฝึกแล้ว {consonantSummary.practiced} จาก 44</small><div><i style:width={`${(consonantSummary.passed / 44) * 100}%`}></i></div></div></article>
      <article><span class="category-icon">อะ</span><div><strong>สระไทย</strong><small>ผ่าน {vowelSummary.passed} · ฝึกแล้ว {vowelSummary.practiced} จาก 32</small><div><i style:width={`${(vowelSummary.passed / 32) * 100}%`}></i></div></div></article>
      <article><span class="category-icon">กา</span><div><strong>คำศัพท์พื้นฐาน</strong><small>ผ่าน {wordSummary.passed} · ฝึกแล้ว {wordSummary.practiced} จาก 10</small><div><i style:width={`${(wordSummary.passed / 10) * 100}%`}></i></div></div></article>
    </section>

    <div class="teacher-report-grid">
      <section class="panel"><div class="panel-head"><div><h2>งานที่มอบหมาย</h2><p>ความคืบหน้าของงานใน {classroom.name}</p></div></div><div class="teacher-report-assignment-list">
        {#each assignmentRows as assignment}
          <article><span class="material-symbols-rounded" aria-hidden="true">assignment</span><div><strong>{assignment.title}</strong><p>กำหนดส่ง {formatDue(assignment.dueDate)}</p><div><i style:width={`${assignment.itemIds.length ? (assignment.passed / assignment.itemIds.length) * 100 : 0}%`}></i></div><small>ผ่าน {assignment.passed} · ฝึกแล้ว {assignment.practiced} จาก {assignment.itemIds.length}</small></div><span class={`status-label ${assignment.passed === assignment.itemIds.length ? 'status-label--passed' : 'status-label--needsPractice'}`}>{assignment.passed === assignment.itemIds.length ? 'ครบแล้ว' : 'กำลังทำ'}</span></article>
        {:else}<div class="empty-state"><span class="material-symbols-rounded" aria-hidden="true">assignment_add</span><strong>ยังไม่มีงานที่มอบหมาย</strong></div>{/each}
      </div></section>

      <section class="panel"><div class="panel-head"><div><h2>รายการที่ควรฝึกเพิ่ม</h2><p>เรียงจากรายการที่ระบบบันทึกว่ายังไม่ผ่าน</p></div><span class="ai-badge">{needsPracticeItems.length} รายการ</span></div><div class="teacher-needs-list">
        {#each needsPracticeItems.slice(0, 12) as item}
          <article><span class:teacher-need-word={item.category === 'words'}>{item.display}</span><div><strong>{item.name}</strong><small>ลองแล้ว {progress.items[item.id].attempts} ครั้ง</small></div><span class="status-label status-label--needsPractice">ฝึกเพิ่ม</span></article>
        {:else}<div class="empty-state"><span class="material-symbols-rounded" aria-hidden="true">verified</span><strong>ยังไม่มีรายการที่ต้องฝึกเพิ่ม</strong><span>เมื่อมีผลการฝึก รายการที่ควรติดตามจะแสดงที่นี่</span></div>{/each}
      </div></section>
    </div>

    <details class="panel teacher-full-report">
      <summary><span><strong>รายละเอียดผลครบทั้ง {allLearningItems.length} รายการ</strong><small>พยัญชนะ สระ และคำศัพท์ทั้งหมด</small></span><span class="material-symbols-rounded" aria-hidden="true">expand_more</span></summary>
      <div class="full-report-list">{#each allLearningItems as item}<article><strong>{item.display}</strong><span>{item.name}</span><small class={`status-label status-label--${progress.items[item.id]?.status || 'notStarted'}`}>{statusText(progress.items[item.id]?.status)}</small><em>{progress.items[item.id]?.attempts || 0} ครั้ง</em></article>{/each}</div>
    </details>
  </AppShell>
{/if}
