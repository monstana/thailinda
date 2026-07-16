<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AppShell from '$lib/components/AppShell.svelte';
  import { getAllUsers } from '$lib/data/users.js';
  import { getLearningProgress, getSessionUser, summarizeLearning } from '$lib/storage.js';

  const SETTINGS_KEY = 'thailinda.studentSettings.v1';
  let user = null;
  let parentAccount = null;
  let summary = { practiced: 0, passed: 0, needsPractice: 0 };
  let volume = 80;
  let avatarUrl = '';
  let settingsMessage = '';

  onMount(() => {
    user = getSessionUser('student');
    if (!user) return goto('/');
    summary = summarizeLearning(getLearningProgress(user.id));
    parentAccount = getAllUsers().find((account) => account.role === 'parent' && account.school === user.school) || null;
    avatarUrl = localStorage.getItem(`thailinda.studentAvatar.${user.id}`) || '';
    try {
      const root = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      volume = Number.isFinite(root[user.id]?.volume) ? root[user.id].volume : 80;
    } catch {
      volume = 80;
    }
  });

  function saveVolume(event) {
    volume = Number(event.currentTarget.value);
    let root = {};
    try { root = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { root = {}; }
    root[user.id] = { ...(root[user.id] || {}), volume };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(root));
    settingsMessage = 'บันทึกระดับเสียงแล้ว';
    setTimeout(() => settingsMessage = '', 1400);
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
      const crop = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - crop) / 2;
      const sy = (image.naturalHeight - crop) / 2;
      context.drawImage(image, sx, sy, crop, crop, 0, 0, size, size);
      avatarUrl = canvas.toDataURL('image/jpeg', .82);
      localStorage.setItem(`thailinda.studentAvatar.${user.id}`, avatarUrl);
      settingsMessage = 'เปลี่ยนรูปโปรไฟล์แล้ว';
    } finally {
      URL.revokeObjectURL(objectUrl);
      event.currentTarget.value = '';
    }
  }
</script>

<svelte:head><title>โปรไฟล์ | ไทยลินดา</title></svelte:head>

{#if user}
  <AppShell role="student" {user} active="profile">
    <div class="page-head"><div><p class="eyebrow">ข้อมูลของฉัน</p><h1>โปรไฟล์นักเรียน</h1><p>บัญชี การตั้งค่า และการเชื่อมต่อ</p></div></div>

    <div class="student-profile-layout">
      <section class="student-profile-card">
        <div class="student-photo">
          {#if avatarUrl}<img src={avatarUrl} alt={`รูปโปรไฟล์ของ ${user.firstName}`} />{:else}<span class="material-symbols-rounded" aria-hidden="true">face</span>{/if}
          <label class="photo-edit" title="เปลี่ยนรูปโปรไฟล์"><span class="material-symbols-rounded" aria-hidden="true">photo_camera</span><input type="file" accept="image/*" onchange={changeAvatar} aria-label="เปลี่ยนรูปโปรไฟล์" /></label>
        </div>
        <h2>{user.firstName} {user.lastName}</h2><p>{user.school}</p><span class="student-level">ป.1/2 · กลุ่มสายรุ้ง</span>
        <div class="profile-score"><div><strong>{summary.practiced}</strong><span>ฝึกแล้ว</span></div><div><strong>{summary.passed}</strong><span>ผ่านแล้ว</span></div><div><strong>{summary.needsPractice}</strong><span>ฝึกเพิ่ม</span></div></div>
      </section>

      <div class="student-profile-main">
        <section class="panel"><div class="panel-head"><div><h2>ตั้งค่าเสียง</h2><p>ระดับเสียงตัวอย่างในบทเรียน</p></div><span class="volume-value">{volume}%</span></div><div class="volume-setting"><span class="material-symbols-rounded" aria-hidden="true">volume_down</span><input type="range" min="0" max="100" step="5" value={volume} oninput={saveVolume} aria-label="ระดับเสียง" /><span class="material-symbols-rounded" aria-hidden="true">volume_up</span></div><p class="settings-status" role="status">{settingsMessage}</p></section>

        <section class="panel"><div class="panel-head"><div><h2>ข้อมูลนักเรียน</h2><p>ข้อมูลบัญชีและห้องเรียน</p></div></div><div class="student-info-list"><div><span class="material-symbols-rounded" aria-hidden="true">badge</span><p><small>ชื่อ-นามสกุล</small><strong>{user.firstName} {user.lastName}</strong></p></div><div><span class="material-symbols-rounded" aria-hidden="true">mail</span><p><small>อีเมล</small><strong>{user.email}</strong></p></div><div><span class="material-symbols-rounded" aria-hidden="true">school</span><p><small>ชั้นเรียน</small><strong>ประถมศึกษาปีที่ 1/2</strong></p></div><div><span class="material-symbols-rounded" aria-hidden="true">groups</span><p><small>กลุ่มเรียน</small><strong>กลุ่มสายรุ้ง</strong></p></div></div></section>

        <section class="panel"><div class="panel-head"><div><h2>ผู้ปกครองที่เชื่อมต่อ</h2><p>บัญชีที่ติดตามความก้าวหน้าของนักเรียน</p></div></div>{#if parentAccount}<article class="parent-connection"><span class="parent-avatar material-symbols-rounded" aria-hidden="true">family_restroom</span><div><strong>{parentAccount.firstName} {parentAccount.lastName}</strong><small>{parentAccount.email}</small><span><i></i>เชื่อมต่อแล้ว</span></div></article>{:else}<div class="empty-state"><span class="material-symbols-rounded" aria-hidden="true">person_add</span><strong>ยังไม่มีผู้ปกครองเชื่อมต่อ</strong><span>บัญชีผู้ปกครองต้องใช้ชื่อโรงเรียนเดียวกัน</span></div>{/if}</section>
      </div>
    </div>
  </AppShell>
{/if}
