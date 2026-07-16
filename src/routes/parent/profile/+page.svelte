<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { getAllUsers } from '$lib/data/users.js';
  import { allLearningItems } from '$lib/data/learning.js';
  import { getLearningProgress, getSessionUser, summarizeLearning } from '$lib/storage.js';

  const SETTINGS_KEY = 'thailinda.parentSettings.v1';
  const defaults = { assignmentNotification: true, practiceReminder: true, weeklySummary: true, reportEnabled: true, reportFrequency: 'weekly' };
  let user = null;
  let children = [];
  let avatarUrl = '';
  let settings = { ...defaults };
  let message = '';

  onMount(() => {
    user = getSessionUser('parent');
    if (!user) return goto('/');
    children = getAllUsers().filter((account) => account.role === 'student' && account.school === user.school);
    avatarUrl = localStorage.getItem(`thailinda.parentAvatar.${user.id}`) || '';
    try {
      const root = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      settings = { ...defaults, ...(root[user.id] || {}) };
    } catch {
      settings = { ...defaults };
    }
  });

  function childSummary(child) {
    return summarizeLearning(getLearningProgress(child.id));
  }

  function updateSetting(key, value) {
    settings = { ...settings, [key]: value };
    let root = {};
    try { root = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { root = {}; }
    root[user.id] = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(root));
    message = 'บันทึกการตั้งค่าแล้ว';
    setTimeout(() => message = '', 1400);
  }

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
      localStorage.setItem(`thailinda.parentAvatar.${user.id}`, avatarUrl);
      message = 'เปลี่ยนรูปโปรไฟล์แล้ว';
    } catch {
      message = 'ไม่สามารถใช้รูปนี้ได้ กรุณาลองรูปอื่น';
    } finally {
      URL.revokeObjectURL(objectUrl);
      event.currentTarget.value = '';
    }
  }
</script>

<svelte:head><title>โปรไฟล์ผู้ปกครอง | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="parent" {user} active="profile">
    <div class="page-head"><div><p class="eyebrow">บัญชีผู้ปกครอง</p><h1>โปรไฟล์และการตั้งค่า</h1><p>จัดการข้อมูลบุตรหลาน การแจ้งเตือน และรายงานผลการเรียน</p></div></div>

    <div class="parent-profile-layout">
      <section class="parent-profile-card">
        <div class="student-photo parent-photo">
          {#if avatarUrl}<img src={avatarUrl} alt={`รูปโปรไฟล์ของ ${user.firstName}`} />{:else}<span class="material-symbols-rounded" aria-hidden="true">family_restroom</span>{/if}
          <label class="photo-edit" title="เปลี่ยนรูปโปรไฟล์"><span class="material-symbols-rounded" aria-hidden="true">photo_camera</span><input type="file" accept="image/*" onchange={changeAvatar} aria-label="เปลี่ยนรูปโปรไฟล์" /></label>
        </div>
        <h2>{user.firstName} {user.lastName}</h2><p>{user.email}</p><span class="parent-role-badge">บัญชีผู้ปกครอง</span><div class="parent-account-school"><span class="material-symbols-rounded" aria-hidden="true">school</span><small>{user.school}</small></div><p class="profile-upload-status" role="status">{message}</p>
      </section>

      <div class="parent-profile-main">
        <section class="panel"><div class="panel-head"><div><h2>บุตรหลานที่เชื่อมต่อ</h2><p>{children.length} บัญชีนักเรียนในความดูแล</p></div></div><div class="linked-child-list">
          {#each children as child}
            {@const summary = childSummary(child)}
            <article class="linked-child-row"><span class="linked-child-avatar material-symbols-rounded" aria-hidden="true">face</span><div><strong>{child.firstName} {child.lastName}</strong><p>ชั้นประถมศึกษาปีที่ 1/2 · {child.email}</p><small>ผ่านแล้ว {summary.passed} จาก {allLearningItems.length} รายการ</small></div><a class="button button--secondary" href="/parent/development">ดูพัฒนาการ</a></article>
          {:else}<div class="empty-state"><span class="material-symbols-rounded" aria-hidden="true">person_add</span><strong>ยังไม่มีบุตรหลานเชื่อมต่อ</strong><span>บัญชีนักเรียนต้องใช้ชื่อโรงเรียนเดียวกัน</span></div>{/each}
        </div></section>

        <section class="panel"><div class="panel-head"><div><h2>การตั้งค่าการแจ้งเตือน</h2><p>เลือกเหตุการณ์ที่ต้องการรับแจ้งเตือน</p></div></div><div class="parent-settings-list">
          <label><span class="setting-icon material-symbols-rounded" aria-hidden="true">assignment</span><span><strong>งานใหม่จากคุณครู</strong><small>แจ้งเตือนเมื่อมีการมอบหมายชุดฝึกใหม่</small></span><input class="switch-input" type="checkbox" checked={settings.assignmentNotification} onchange={(event) => updateSetting('assignmentNotification', event.currentTarget.checked)} /></label>
          <label><span class="setting-icon material-symbols-rounded" aria-hidden="true">notifications_active</span><span><strong>เตือนให้ฝึกต่อ</strong><small>แจ้งเตือนเมื่อยังมีงานที่ยังไม่ได้ส่ง</small></span><input class="switch-input" type="checkbox" checked={settings.practiceReminder} onchange={(event) => updateSetting('practiceReminder', event.currentTarget.checked)} /></label>
          <label><span class="setting-icon material-symbols-rounded" aria-hidden="true">monitoring</span><span><strong>สรุปพัฒนาการรายสัปดาห์</strong><small>รับข้อมูลเปรียบเทียบกับสัปดาห์ก่อน</small></span><input class="switch-input" type="checkbox" checked={settings.weeklySummary} onchange={(event) => updateSetting('weeklySummary', event.currentTarget.checked)} /></label>
        </div></section>

        <section class="panel"><div class="panel-head"><div><h2>รายงานผลการเรียน</h2><p>ตั้งค่าการจัดทำรายงานของบุตรหลาน</p></div></div><div class="report-settings"><label class="report-toggle"><span class="setting-icon material-symbols-rounded" aria-hidden="true">description</span><span><strong>เปิดใช้งานรายงานอัตโนมัติ</strong><small>จัดทำรายงานจากผลการฝึกที่บันทึกไว้</small></span><input class="switch-input" type="checkbox" checked={settings.reportEnabled} onchange={(event) => updateSetting('reportEnabled', event.currentTarget.checked)} /></label><label class="report-frequency"><span>ความถี่ของรายงาน</span><select value={settings.reportFrequency} onchange={(event) => updateSetting('reportFrequency', event.currentTarget.value)} disabled={!settings.reportEnabled}><option value="weekly">ทุกสัปดาห์</option><option value="monthly">ทุกเดือน</option><option value="term">ทุกภาคเรียน</option></select></label><a class="button button--primary" href="/parent/development"><span class="material-symbols-rounded" aria-hidden="true">analytics</span>ดูรายงานล่าสุด</a></div></section>
      </div>
    </div>
  </AppShell>
{/if}
