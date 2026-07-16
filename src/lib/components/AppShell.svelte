<script>
  import { goto } from '$app/navigation';
  import { clearSession } from '$lib/storage.js';

  let { role, user, active = '', children } = $props();

  const navByRole = {
    student: [
      { href: '/student', id: 'lessons', icon: 'menu_book', label: 'บทเรียน' },
      { href: '/student/classroom', id: 'classroom', icon: 'school', label: 'ห้องเรียน' },
      { href: '/student/progress', id: 'progress', icon: 'monitoring', label: 'ผลการเรียน' },
      { href: '/student/profile', id: 'profile', icon: 'person', label: 'โปรไฟล์' }
    ],
    teacher: [
      { href: '/teacher', id: 'classrooms', icon: 'meeting_room', label: 'ห้องเรียน' },
      { href: '/teacher/assignments', id: 'assignments', icon: 'assignment', label: 'การสั่งงาน' },
      { href: '/teacher/profile', id: 'profile', icon: 'person', label: 'โปรไฟล์' }
    ],
    parent: [
      { href: '/parent', id: 'home', icon: 'home', label: 'หน้าหลัก' },
      { href: '/parent/development', id: 'development', icon: 'monitoring', label: 'พัฒนาการ' },
      { href: '/parent/profile', id: 'profile', icon: 'person', label: 'โปรไฟล์' }
    ]
  };

  let navItems = $derived(navByRole[role] || []);

  function logout() {
    clearSession();
    goto('/');
  }
</script>

<div class={`app-shell app-shell--${role}`}>
  <aside class="app-sidebar">
    <a class="app-brand" href={navItems[0]?.href || '/'}>
      <img src="/assets/images/thailinda-mascot.png" alt="" />
      <span><strong>ไทยลินดา</strong><small>{role === 'student' ? 'พื้นที่นักเรียน' : role === 'teacher' ? 'พื้นที่คุณครู' : 'พื้นที่ผู้ปกครอง'}</small></span>
    </a>
    <nav class="side-nav" aria-label="เมนูหลัก">
      {#each navItems as item}
        <a class:is-active={active === item.id} href={item.href}><span class="material-symbols-rounded" aria-hidden="true">{item.icon}</span>{item.label}</a>
      {/each}
    </nav>
    <div class="sidebar-user"><strong>{user?.firstName || ''}</strong><span>{user?.school || ''}</span></div>
  </aside>

  <header class="app-topbar">
    <a class="mobile-brand" href={navItems[0]?.href || '/'}><img src="/assets/images/thailinda-mascot.png" alt="" /><strong>ไทยลินดา</strong></a>
    <div class="topbar-user"><span class="user-avatar material-symbols-rounded" aria-hidden="true">{role === 'student' ? 'face' : role === 'teacher' ? 'school' : 'family_restroom'}</span><strong>{user?.firstName || ''}</strong></div>
    <button class="icon-button" type="button" onclick={logout} aria-label="ออกจากระบบ" title="ออกจากระบบ"><span class="material-symbols-rounded" aria-hidden="true">logout</span></button>
  </header>

  <main class="app-main">{@render children()}</main>
</div>

{#if navItems.length > 1}
  <nav class={`bottom-nav bottom-nav--${role}`} class:bottom-nav--four={navItems.length === 4} aria-label="เมนูหลักบนมือถือ">
    {#each navItems as item}
      <a class:is-active={active === item.id} href={item.href}><span class="material-symbols-rounded" aria-hidden="true">{item.icon}</span><span>{item.label}</span></a>
    {/each}
  </nav>
{/if}
