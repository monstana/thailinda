<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { createApiAssignment, isApiEnabled, syncApiData } from '$lib/api.js';
  import { allLearningItems, consonants, getCategoryItems, itemById, vowels, words } from '$lib/data/learning.js';
  import { ensureTeacherClassrooms, getAssignments, getSessionUser, saveAssignment } from '$lib/storage.js';

  let user = null;
  let tab = 'consonants';
  let selectedIds = [];
  let title = '';
  let dueDate = '';
  let classroomId = '';
  let classrooms = [];
  let assignments = [];
  let message = '';
  $: visibleItems = getCategoryItems(tab);
  $: activeAssignments = assignments.filter((assignment) => assignment.status === 'active');
  $: overdueCount = activeAssignments.filter((assignment) => new Date(`${assignment.dueDate}T23:59:59`) < new Date()).length;
  $: totalItems = assignments.reduce((sum, assignment) => sum + assignment.itemIds.length, 0);

  onMount(() => {
    user = getSessionUser('teacher');
    if (!user) return goto('/');
    classrooms = ensureTeacherClassrooms(user);
    classroomId = classrooms[0]?.id || '';
    assignments = getAssignments().filter((assignment) => assignment.teacherId === user.id);
    const date = new Date();
    date.setDate(date.getDate() + 7);
    dueDate = date.toISOString().slice(0, 10);
  });

  function toggleItem(id, checked) {
    selectedIds = checked ? [...new Set([...selectedIds, id])] : selectedIds.filter((itemId) => itemId !== id);
  }

  function selectSet(type) {
    if (type === 'all') selectedIds = allLearningItems.map((item) => item.id);
    else if (type === 'clear') selectedIds = [];
    else selectedIds = getCategoryItems(type).map((item) => item.id);
  }

  async function submitAssignment(event) {
    event.preventDefault();
    if (!title.trim()) { message = 'กรุณาระบุชื่อชุดฝึก'; return; }
    if (!classroomId) { message = 'กรุณาเลือกห้องเรียน'; return; }
    if (!selectedIds.length) { message = 'เลือกพยัญชนะหรือสระอย่างน้อย 1 ตัว'; return; }
    if (!dueDate) { message = 'กรุณาเลือกกำหนดส่ง'; return; }
    const classroom = classrooms.find((item) => item.id === classroomId);
    if (isApiEnabled()) {
      try {
        await createApiAssignment({ classroomId, title, itemIds: selectedIds, dueDate });
        await syncApiData(user);
      } catch (error) {
        message = error?.message || 'มอบหมายงานไม่สำเร็จ';
        return;
      }
    } else {
      saveAssignment({ teacherId: user.id, classroomId, classroomName: classroom?.name, title, itemIds: selectedIds, dueDate });
    }
    assignments = getAssignments().filter((assignment) => assignment.teacherId === user.id);
    title = '';
    selectedIds = [];
    message = 'มอบหมายชุดฝึกให้นักเรียนแล้ว';
  }

  function formatDue(value) {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  }
</script>

<svelte:head><title>การสั่งงาน | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="teacher" {user} active="assignments">
    <div class="page-head"><div><p class="eyebrow">งานและชุดฝึก</p><h1>การสั่งงาน</h1><p>ติดตามงานปัจจุบันและสร้างชุดฝึกออกเสียงให้นักเรียน</p></div></div>

    <section class="teacher-summary-grid teacher-summary-grid--four">
      <article><span class="material-symbols-rounded" aria-hidden="true">assignment</span><div><strong>{assignments.length}</strong><small>งานที่สร้างทั้งหมด</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">pending_actions</span><div><strong>{activeAssignments.length}</strong><small>งานปัจจุบัน</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">warning</span><div><strong>{overdueCount}</strong><small>งานเกินกำหนด</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">spellcheck</span><div><strong>{totalItems}</strong><small>รายการฝึกที่มอบหมาย</small></div></article>
    </section>

    <div class="teacher-layout">
      <section class="panel"><div class="panel-head"><div><h2>งานปัจจุบัน</h2><p>{activeAssignments.length} งานที่กำลังดำเนินการ</p></div></div><div class="assignment-list">
        {#if assignments.length}
          {#each assignments as assignment}
            <article class="teacher-assignment"><div class="assignment-heading"><h3>{assignment.title}</h3><span class="status-label status-label--passed">กำลังดำเนินการ</span></div><p>{assignment.classroomName || 'ห้อง ป.1/2'} · {assignment.itemIds.length} รายการฝึก · ส่ง {formatDue(assignment.dueDate)}</p><div class="inline-items">{#each assignment.itemIds.slice(0, 14) as id}<span>{itemById[id]?.display}</span>{/each}{#if assignment.itemIds.length > 14}<span>+{assignment.itemIds.length - 14}</span>{/if}</div></article>
          {/each}
        {:else}<div class="empty-state"><span class="material-symbols-rounded" aria-hidden="true">assignment_add</span><strong>ยังไม่มีชุดฝึก</strong><span>สร้างงานแรกจากแบบฟอร์มด้านข้าง</span></div>{/if}
      </div></section>

      <section class="panel"><div class="panel-head"><div><h2>สร้างงานใหม่</h2><p>งานจะปรากฏในห้องเรียนของนักเรียนทันที</p></div><span class="ai-badge">{selectedIds.length} รายการ</span></div><form class="assignment-form" onsubmit={submitAssignment}>
        <div class="assignment-meta-grid"><div class="field"><label for="assignmentTitle">ชื่อชุดฝึก</label><input id="assignmentTitle" bind:value={title} maxlength="80" placeholder="เช่น ฝึกพยัญชนะ ก-ง" /></div><div class="field"><label for="classroomId">ห้องเรียน</label><select id="classroomId" bind:value={classroomId}>{#each classrooms as classroom}<option value={classroom.id}>{classroom.name}</option>{/each}</select></div><div class="field"><label for="dueDate">กำหนดส่ง</label><input id="dueDate" bind:value={dueDate} type="date" /></div></div>
        <div class="segmented segmented--three" aria-label="เลือกหมวด"><button class:is-active={tab === 'consonants'} type="button" onclick={() => tab = 'consonants'}>พยัญชนะ 44 ตัว</button><button class:is-active={tab === 'vowels'} type="button" onclick={() => tab = 'vowels'}>สระ 32 เสียง</button><button class:is-active={tab === 'words'} type="button" onclick={() => tab = 'words'}>คำศัพท์ 10 คำ</button></div>
        <div class="quick-actions"><button type="button" onclick={() => selectSet('consonants')}>เลือกพยัญชนะทั้งหมด</button><button type="button" onclick={() => selectSet('vowels')}>เลือกสระทั้งหมด</button><button type="button" onclick={() => selectSet('words')}>เลือกคำศัพท์ทั้งหมด</button><button type="button" onclick={() => selectSet('all')}>เลือกครบ {allLearningItems.length}</button><button type="button" onclick={() => selectSet('clear')}>ล้างการเลือก</button></div>
        <div class="select-grid">{#each visibleItems as item}<label class="select-item"><input type="checkbox" checked={selectedIds.includes(item.id)} onchange={(event) => toggleItem(item.id, event.currentTarget.checked)} /><span title={item.name}>{item.display}</span></label>{/each}</div>
        <div class="selection-footer"><p>เลือกแล้ว {selectedIds.length} จาก {consonants.length + vowels.length + words.length} รายการ</p><span class="form-message" role="status">{message}</span><button class="button button--primary" type="submit"><span class="material-symbols-rounded" aria-hidden="true">send</span>มอบหมายงาน</button></div>
      </form></section>
    </div>
  </AppShell>
{/if}
