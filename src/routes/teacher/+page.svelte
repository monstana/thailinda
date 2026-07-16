<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { createApiClassroom, isApiEnabled, syncApiData } from '$lib/api.js';
  import { ensureTeacherClassrooms, getAssignments, getClassroomStudents, getSessionUser, saveClassroom } from '$lib/storage.js';

  let user = null;
  let classrooms = [];
  let activities = [];
  let name = '';
  let level = 'ประถมศึกษาปีที่ 1';
  let group = '';
  let academicYear = '2569';
  let studentCount = 24;
  let message = '';

  $: rosterByClassroom = Object.fromEntries(classrooms.map((classroom) => [classroom.id, getClassroomStudents(classroom)]));
  $: totalStudents = new Set(Object.values(rosterByClassroom).flat().map((student) => student.id)).size;

  onMount(() => {
    user = getSessionUser('teacher');
    if (!user) return goto('/');
    classrooms = ensureTeacherClassrooms(user);
    activities = getAssignments().filter((assignment) => assignment.teacherId === user.id && assignment.status === 'active');
  });

  async function createClassroom(event) {
    event.preventDefault();
    if (!name.trim() || !group.trim()) {
      message = 'กรุณาระบุชื่อห้องและชื่อกลุ่มเรียน';
      return;
    }
    if (isApiEnabled()) {
      try {
        await createApiClassroom({ name, level, group, academicYear, studentCount });
        await syncApiData(user);
      } catch (error) {
        message = error?.message || 'สร้างห้องเรียนไม่สำเร็จ';
        return;
      }
    } else {
      saveClassroom({ teacherId: user.id, name, level, group, academicYear, school: user.school, studentCount });
    }
    classrooms = ensureTeacherClassrooms(user);
    name = '';
    group = '';
    studentCount = 24;
    message = 'สร้างห้องเรียนใหม่เรียบร้อยแล้ว';
  }

  function formatDue(value) {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  }
</script>

<svelte:head><title>ห้องเรียน | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="teacher" {user} active="classrooms">
    <div class="page-head"><div><p class="eyebrow">พื้นที่คุณครู</p><h1>ห้องเรียน</h1><p>จัดการชั้นเรียน กลุ่มนักเรียน และกิจกรรมที่กำลังดำเนินการ</p></div></div>

    <section class="teacher-summary-grid">
      <article><span class="material-symbols-rounded" aria-hidden="true">meeting_room</span><div><strong>{classrooms.length}</strong><small>ห้องเรียนทั้งหมด</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">groups</span><div><strong>{totalStudents}</strong><small>บัญชีนักเรียนที่เชื่อมต่อ</small></div></article>
      <article><span class="material-symbols-rounded" aria-hidden="true">pending_actions</span><div><strong>{activities.length}</strong><small>กิจกรรมกำลังดำเนินการ</small></div></article>
    </section>

    <div class="teacher-classroom-grid">
      <section class="panel">
        <div class="panel-head"><div><h2>สร้างห้องเรียนใหม่</h2><p>เพิ่มชั้นเรียนและกลุ่มนักเรียนที่รับผิดชอบ</p></div><span class="material-symbols-rounded panel-head-icon" aria-hidden="true">add_home_work</span></div>
        <form class="classroom-form" onsubmit={createClassroom}>
          <div class="field"><label for="className">ชื่อห้องเรียน</label><input id="className" bind:value={name} maxlength="60" placeholder="เช่น ห้อง ป.2/1" /></div>
          <div class="classroom-form-row"><div class="field"><label for="classLevel">ระดับชั้น</label><select id="classLevel" bind:value={level}><option>ประถมศึกษาปีที่ 1</option><option>ประถมศึกษาปีที่ 2</option><option>ประถมศึกษาปีที่ 3</option></select></div><div class="field"><label for="classGroup">กลุ่มเรียน</label><input id="classGroup" bind:value={group} maxlength="60" placeholder="เช่น กลุ่มดวงดาว" /></div></div>
          <div class="classroom-form-row"><div class="field"><label for="academicYear">ปีการศึกษา</label><input id="academicYear" bind:value={academicYear} inputmode="numeric" maxlength="4" /></div><div class="field"><label for="studentCount">จำนวนนักเรียน</label><input id="studentCount" bind:value={studentCount} type="number" min="1" max="60" /></div></div>
          <p class="form-message classroom-message" role="status">{message}</p>
          <button class="button button--primary classroom-submit" type="submit"><span class="material-symbols-rounded" aria-hidden="true">add</span>สร้างห้องเรียน</button>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head"><div><h2>กิจกรรมที่กำลังดำเนินการ</h2><p>{activities.length} งานที่นักเรียนกำลังฝึก</p></div><a class="text-link" href="/teacher/assignments">ดูการสั่งงาน</a></div>
        <div class="teacher-activity-list">
          {#each activities as activity}
            <article class="teacher-activity"><span class="activity-icon material-symbols-rounded" aria-hidden="true">record_voice_over</span><div><strong>{activity.title}</strong><p>{activity.classroomName || 'ห้อง ป.1/2'} · {activity.itemIds.length} รายการฝึก</p><small>กำหนดส่ง {formatDue(activity.dueDate)}</small></div><span class="status-label status-label--passed">กำลังดำเนินการ</span></article>
          {:else}
            <div class="empty-state"><span class="material-symbols-rounded" aria-hidden="true">event_available</span><strong>ยังไม่มีกิจกรรม</strong><span>สร้างงานใหม่จากเมนูการสั่งงาน</span></div>
          {/each}
        </div>
      </section>
    </div>

    <section class="panel teacher-class-list-panel">
      <div class="panel-head"><div><h2>ห้องเรียนของฉัน</h2><p>ห้องเรียนที่คุณครูรับผิดชอบในปีการศึกษา {academicYear}</p></div></div>
      <div class="teacher-class-list">
        {#each classrooms as classroom}
          <a class="teacher-class-row" href={`/teacher/classrooms/${classroom.id}`} aria-label={`เปิดรายชื่อนักเรียน ${classroom.name}`}>
            <span class="class-color material-symbols-rounded" aria-hidden="true">school</span>
            <div><strong>{classroom.name}</strong><p>{classroom.level} · {classroom.group}</p></div>
            <div class="class-student-count"><strong>{rosterByClassroom[classroom.id]?.length || 0}<small>/{classroom.studentCount}</small></strong><small>เชื่อมต่อ</small></div>
            <span class="teacher-class-action"><span class="status-label status-label--passed">เปิดใช้งาน</span><span class="material-symbols-rounded" aria-hidden="true">chevron_right</span></span>
          </a>
        {/each}
      </div>
    </section>
  </AppShell>
{/if}
