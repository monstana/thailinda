<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { ensureTeacherClassrooms, getAssignments, getSessionUser } from '$lib/storage.js';

  let user = null;
  let avatarUrl = '';
  let classroomCount = 0;
  let assignmentCount = 0;
  let message = '';

  onMount(() => {
    user = getSessionUser('teacher');
    if (!user) return goto('/');
    avatarUrl = localStorage.getItem(`thailinda.teacherAvatar.${user.id}`) || '';
    classroomCount = ensureTeacherClassrooms(user).length;
    assignmentCount = getAssignments().filter((assignment) => assignment.teacherId === user.id).length;
  });

  async function changeAvatar(event) {
    const file = event.currentTarget.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = objectUrl; });
      const size = 320;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      const crop = Math.min(image.naturalWidth, image.naturalHeight);
      context.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, size, size);
      avatarUrl = canvas.toDataURL('image/jpeg', .82);
      localStorage.setItem(`thailinda.teacherAvatar.${user.id}`, avatarUrl);
      message = 'เปลี่ยนรูปโปรไฟล์แล้ว';
    } catch {
      message = 'ไม่สามารถใช้รูปนี้ได้ กรุณาลองรูปอื่น';
    } finally {
      URL.revokeObjectURL(objectUrl);
      event.currentTarget.value = '';
    }
  }
</script>

<svelte:head><title>โปรไฟล์คุณครู | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="teacher" {user} active="profile">
    <div class="page-head"><div><p class="eyebrow">บัญชีของฉัน</p><h1>โปรไฟล์คุณครู</h1><p>จัดการรูปโปรไฟล์และดูข้อมูลบัญชี ไทยลินดา</p></div></div>

    <div class="teacher-profile-layout">
      <section class="teacher-profile-card">
        <div class="student-photo teacher-photo">
          {#if avatarUrl}<img src={avatarUrl} alt={`รูปโปรไฟล์ของ ${user.firstName}`} />{:else}<span class="material-symbols-rounded" aria-hidden="true">person_apron</span>{/if}
          <label class="photo-edit" title="เปลี่ยนรูปโปรไฟล์"><span class="material-symbols-rounded" aria-hidden="true">photo_camera</span><input type="file" accept="image/*" onchange={changeAvatar} aria-label="เปลี่ยนรูปโปรไฟล์" /></label>
        </div>
        <h2>{user.firstName} {user.lastName}</h2><p>คุณครู · {user.school}</p><span class="profile-role-badge">บัญชีคุณครู</span>
        <div class="teacher-profile-stats"><div><strong>{classroomCount}</strong><span>ห้องเรียน</span></div><div><strong>{assignmentCount}</strong><span>งานที่สร้าง</span></div></div>
        <p class="profile-upload-status" role="status">{message}</p>
      </section>

      <div class="teacher-profile-main">
        <section class="panel">
          <div class="panel-head"><div><h2>ข้อมูลบัญชี</h2><p>ข้อมูลสำหรับการใช้งานพื้นที่คุณครู</p></div></div>
          <div class="teacher-account-list">
            <div><span class="material-symbols-rounded" aria-hidden="true">badge</span><p><small>ชื่อ-นามสกุล</small><strong>{user.firstName} {user.lastName}</strong></p></div>
            <div><span class="material-symbols-rounded" aria-hidden="true">mail</span><p><small>อีเมล</small><strong>{user.email}</strong></p></div>
            <div><span class="material-symbols-rounded" aria-hidden="true">school</span><p><small>สถานศึกษา</small><strong>{user.school}</strong></p></div>
            <div><span class="material-symbols-rounded" aria-hidden="true">verified_user</span><p><small>ประเภทบัญชี</small><strong>คุณครูผู้สอน</strong></p></div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><h2>ความช่วยเหลือและข้อมูล</h2><p>ข้อมูลสนับสนุนและข้อกำหนดของ ไทยลินดา</p></div></div>
          <div class="teacher-help-list">
            <details><summary><span class="help-icon material-symbols-rounded" aria-hidden="true">support_agent</span><span><strong>ความช่วยเหลือและศูนย์สนับสนุน</strong><small>คำแนะนำการใช้บทเรียน ห้องเรียน และการสั่งงาน</small></span><span class="expand-icon material-symbols-rounded" aria-hidden="true">expand_more</span></summary><div class="help-content"><p>หากพบปัญหาในการใช้งาน โปรดตรวจการเชื่อมต่ออินเทอร์เน็ตและรีเฟรชหน้าเว็บก่อน ติดต่อทีมสนับสนุนได้ที่ support@thailinda.example</p></div></details>
            <details><summary><span class="help-icon material-symbols-rounded" aria-hidden="true">info</span><span><strong>เกี่ยวกับ ไทยลินดา</strong><small>ระบบฝึกการออกเสียงภาษาไทยสำหรับนักเรียน</small></span><span class="expand-icon material-symbols-rounded" aria-hidden="true">expand_more</span></summary><div class="help-content"><p>ไทยลินดา ช่วยให้ครูสร้างชุดฝึกพยัญชนะและสระ ติดตามกิจกรรม และสนับสนุนการฝึกออกเสียงอย่างเป็นขั้นตอน</p></div></details>
            <details><summary><span class="help-icon material-symbols-rounded" aria-hidden="true">privacy_tip</span><span><strong>นโยบายความเป็นส่วนตัว</strong><small>การจัดเก็บและใช้งานข้อมูลภายใน Prototype</small></span><span class="expand-icon material-symbols-rounded" aria-hidden="true">expand_more</span></summary><div class="help-content"><p>Prototype นี้เก็บบัญชี ห้องเรียน งาน และผลการฝึกไว้ในเบราว์เซอร์ของอุปกรณ์ ไม่จัดเก็บไฟล์เสียงหรือภาพจากกล้องไว้บนเซิร์ฟเวอร์</p></div></details>
          </div>
        </section>
      </div>
    </div>
  </AppShell>
{/if}
