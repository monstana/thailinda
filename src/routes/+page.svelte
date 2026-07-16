<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { demoUsers, getAllUsers, roleMeta, saveRegisteredUser } from '$lib/data/users.js';
  import { createApiSession, isApiEnabled, refreshApiAccounts, registerApiAccount, syncApiData } from '$lib/api.js';
  import { saveSession } from '$lib/storage.js';

  let role = 'student';
  let pinDigits = ['', '', '', ''];
  let pinInputs = [];
  let message = '';
  let splashVisible = true;
  let view = 'login';
  let accounts = demoUsers;
  let accountPickerOpen = false;
  let activeUserId = 'student-mana';
  let registerRole = 'student';
  let firstName = '';
  let lastName = '';
  let school = '';
  let email = '';
  let registerPin = '';
  let acceptTerms = false;
  let registerMessage = '';
  $: roleUsers = accounts.filter((user) => user.role === role);
  $: selectedUser = accounts.find((user) => user.id === activeUserId && user.role === role) || roleUsers[0] || null;

  onMount(() => {
    accounts = getAllUsers();
    const lastId = localStorage.getItem('thailinda.lastUserId');
    const last = accounts.find((user) => user.id === lastId);
    if (last) {
      role = last.role;
      activeUserId = last.id;
    }
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 850;
    const timer = setTimeout(() => {
      splashVisible = false;
      setTimeout(() => pinInputs[0]?.focus(), 60);
    }, delay);
    loadApiAccounts();
    return () => clearTimeout(timer);
  });

  async function loadApiAccounts() {
    if (!isApiEnabled()) return;
    try {
      await refreshApiAccounts();
      accounts = getAllUsers();
      if (!accounts.some((account) => account.id === activeUserId && account.role === role)) activeUserId = accounts.find((account) => account.role === role)?.id || '';
    } catch {
      message = 'เชื่อมต่อระบบบัญชีไม่ได้ กรุณาตรวจสอบ Rails API';
    }
  }

  function chooseRole(nextRole) {
    role = nextRole;
    activeUserId = accounts.find((user) => user.role === nextRole)?.id || '';
    accountPickerOpen = false;
    pinDigits = ['', '', '', ''];
    message = '';
  }

  function chooseAccount(account) {
    activeUserId = account.id;
    accountPickerOpen = false;
    pinDigits = ['', '', '', ''];
    message = '';
    setTimeout(() => pinInputs[0]?.focus(), 60);
  }

  function updateDigit(index, event) {
    const value = event.currentTarget.value.replace(/\D/g, '').slice(-1);
    pinDigits[index] = value;
    pinDigits = [...pinDigits];
    message = '';
    if (value && pinInputs[index + 1]) pinInputs[index + 1].focus();
  }

  function handleKey(index, event) {
    if (event.key === 'Backspace' && !pinDigits[index] && pinInputs[index - 1]) pinInputs[index - 1].focus();
    if (event.key === 'ArrowLeft') pinInputs[index - 1]?.focus();
    if (event.key === 'ArrowRight') pinInputs[index + 1]?.focus();
  }

  function pastePin(event) {
    const value = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!value) return;
    event.preventDefault();
    pinDigits = Array.from({ length: 4 }, (_, index) => value[index] || '');
    pinInputs[Math.min(value.length, 4) - 1]?.focus();
  }

  function maskEmail(value) {
    const [name, domain] = value.split('@');
    if (!domain) return value;
    const visible = name.slice(0, Math.min(2, name.length));
    return `${visible}${'*'.repeat(Math.max(3, name.length - visible.length))}@${domain}`;
  }

  function useDemoPin(nextRole) {
    role = nextRole;
    const demoUser = demoUsers.find((user) => user.role === nextRole);
    activeUserId = demoUser?.id || '';
    accountPickerOpen = false;
    const value = demoUser?.pin || '';
    pinDigits = Array.from({ length: 4 }, (_, index) => value[index] || '');
    message = '';
  }

  async function login(event) {
    event.preventDefault();
    const pin = pinDigits.join('');
    if (!selectedUser) {
      message = 'กรุณาเลือกบัญชีก่อนเข้าสู่ระบบ';
      return;
    }
    if (pin.length < 4) {
      message = 'กรุณาใส่ PIN ให้ครบ 4 หลัก';
      return;
    }
    if (isApiEnabled()) {
      try {
        const session = await createApiSession(selectedUser.id, pin);
        saveSession(session.user, session.token);
        message = `ถูกต้อง กำลังเข้าสู่ระบบ${roleMeta[session.user.role].label}`;
        try { await syncApiData(session.user); } catch { /* The API remains authoritative; cached screens can refresh later. */ }
        await goto(roleMeta[session.user.role].route);
      } catch (error) {
        message = error?.message || 'เข้าสู่ระบบไม่สำเร็จ';
      }
      return;
    }
    if (selectedUser.pin !== pin) { message = `PIN ไม่ถูกต้องสำหรับบัญชี ${selectedUser.firstName}`; return; }
    saveSession(selectedUser);
    message = `ถูกต้อง กำลังเข้าสู่ระบบ${roleMeta[selectedUser.role].label}`;
    await goto(roleMeta[selectedUser.role].route);
  }

  function showRegister() {
    view = 'register';
    registerRole = role;
    message = '';
    registerMessage = '';
  }

  function showLogin() {
    view = 'login';
    accountPickerOpen = false;
    registerMessage = '';
  }

  function updateRegisterPin(event) {
    registerPin = event.currentTarget.value.replace(/\D/g, '').slice(0, 4);
  }

  async function registerAccount(event) {
    event.preventDefault();
    registerMessage = '';
    const normalizedEmail = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim() || !school.trim() || !normalizedEmail) {
      registerMessage = 'กรุณากรอกข้อมูลให้ครบทุกช่อง';
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      registerMessage = 'กรุณาตรวจสอบรูปแบบอีเมล';
      return;
    }
    if (getAllUsers().some((user) => user.email.toLowerCase() === normalizedEmail)) {
      registerMessage = 'อีเมลนี้มีบัญชีอยู่แล้ว';
      return;
    }
    if (registerPin.length !== 4) {
      registerMessage = 'กรุณาตั้งรหัส PIN ให้ครบ 4 หลัก';
      return;
    }
    if (!acceptTerms) {
      registerMessage = 'กรุณายอมรับข้อกำหนดก่อนสร้างบัญชี';
      return;
    }
    const userValues = {
      id: `user-${Date.now()}`,
      role: registerRole,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      school: school.trim(),
      email: normalizedEmail,
      pin: registerPin
    };
    let user = userValues;
    if (isApiEnabled()) {
      try {
        const result = await registerApiAccount(userValues);
        user = result.user;
        await refreshApiAccounts();
      } catch (error) {
        registerMessage = error?.message || 'สร้างบัญชีไม่สำเร็จ';
        return;
      }
    } else {
      saveRegisteredUser(user);
    }
    accounts = getAllUsers();
    role = user.role;
    activeUserId = user.id;
    accountPickerOpen = false;
    pinDigits = Array.from({ length: 4 }, (_, index) => user.pin[index] || '');
    firstName = '';
    lastName = '';
    school = '';
    email = '';
    registerPin = '';
    acceptTerms = false;
    view = 'login';
    message = `สร้างบัญชีของ ${user.firstName} เรียบร้อยแล้ว กดเข้าสู่ระบบได้เลย`;
  }
</script>

<svelte:head><title>เข้าสู่ระบบ | ไทยลินดา</title><meta name="description" content="ไทยลินดา ฝึกออกเสียงภาษาไทยสำหรับนักเรียนประถมต้น" /></svelte:head>

{#if splashVisible}
  <div class="classic-splash" aria-label="กำลังเปิด ไทยลินดา">
    <div class="classic-splash__mark"><span>ท</span><i></i><i></i></div>
    <div class="classic-wordmark">ไทย<span>ลินดา</span></div>
    <p>เรียนรู้ภาษาไทยอย่างมั่นใจ</p>
    <div class="classic-loader" aria-hidden="true"><span></span><span></span><span></span></div>
  </div>
{/if}

<main class="classic-auth">
  <section class="classic-brand" aria-labelledby="brandTitle">
    <header class="classic-brandbar"><a href="/" class="classic-logo"><span class="classic-logo__mark">ท</span><span id="brandTitle">ไทย<strong>ลินดา</strong></span></a><span class="classic-tag">ฝึกออกเสียงภาษาไทย</span></header>
    <div class="classic-brandvisual">
      <div class="classic-brandcopy"><p class="classic-eyebrow">พูดชัด อ่านคล่อง</p><h1>ทุกคำใหม่<br />เริ่มจากความกล้า</h1><p>พื้นที่ฝึกภาษาไทยที่เด็ก ๆ ครู และผู้ปกครองเรียนรู้ไปด้วยกัน</p></div>
      <figure class="classic-mascot"><img src="/assets/images/thailinda-mascot.png" alt="ลินดาถือบัตรพยัญชนะ ก" /></figure>
    </div>
    <div class="classic-roles" aria-label="ผู้ใช้งาน ไทยลินดา"><span><span class="material-symbols-rounded" aria-hidden="true">child_care</span>นักเรียน</span><span><span class="material-symbols-rounded" aria-hidden="true">school</span>คุณครู</span><span><span class="material-symbols-rounded" aria-hidden="true">family_restroom</span>ผู้ปกครอง</span></div>
  </section>

  <section class="classic-formpanel">
    <a class="classic-mobile-logo" href="/"><span class="classic-logo__mark">ท</span><span>ไทย<strong>ลินดา</strong></span></a>
    <div class="classic-loginbox" class:classic-loginbox--register={view === 'register'}>
      {#if view === 'login'}
      <div class="classic-loginhead"><p>เข้าสู่ระบบ</p><h2>ยินดีต้อนรับกลับมา</h2><span>เลือกบทบาท ตรวจสอบบัญชี แล้วใส่รหัส PIN</span></div>

      <div class="classic-rolepicker" aria-label="เลือกผู้ใช้งาน">
        {#each Object.entries(roleMeta) as [id, meta]}
          <button class:is-active={role === id} type="button" onclick={() => chooseRole(id)} aria-label={`เลือก${meta.label}`}><span class="material-symbols-rounded" aria-hidden="true">{meta.icon}</span><span>{meta.label}</span></button>
        {/each}
      </div>

      {#if selectedUser}
        <div class="classic-selectedaccount"><span class={`classic-accountavatar classic-accountavatar--${role}`}><span class="material-symbols-rounded" aria-hidden="true">{roleMeta[role].icon}</span></span><p><small>กำลังเข้าสู่บัญชี</small><strong>{selectedUser.firstName} {selectedUser.lastName}</strong><span>{maskEmail(selectedUser.email)}</span></p><button type="button" onclick={() => accountPickerOpen = !accountPickerOpen} aria-expanded={accountPickerOpen} aria-controls="accountPicker">{accountPickerOpen ? 'ปิดรายการ' : 'เปลี่ยนบัญชี'}</button></div>
      {/if}

      {#if accountPickerOpen}
        <section class="classic-accountsection" id="accountPicker" aria-labelledby="accountPickerTitle">
          <div class="classic-accounthead"><div><strong id="accountPickerTitle">เลือกบัญชี{roleMeta[role].label}</strong><span>{roleUsers.length} บัญชีบนเครื่องนี้</span></div><button class="classic-accountclose" type="button" onclick={() => accountPickerOpen = false} aria-label="ปิดรายการบัญชี"><span class="material-symbols-rounded" aria-hidden="true">close</span></button></div>
          <div class="classic-accountpicker">
            {#each roleUsers as account}
              <button class:is-active={selectedUser?.id === account.id} type="button" onclick={() => chooseAccount(account)} aria-pressed={selectedUser?.id === account.id}>
                <span class={`classic-accountavatar classic-accountavatar--${role}`}><span class="material-symbols-rounded" aria-hidden="true">{roleMeta[role].icon}</span></span>
                <span class="classic-accountcopy"><strong>{account.firstName} {account.lastName}</strong><small>{maskEmail(account.email)}</small></span>
                <span class="classic-accountcheck material-symbols-rounded" aria-hidden="true">{selectedUser?.id === account.id ? 'check_circle' : 'chevron_right'}</span>
              </button>
            {:else}
              <div class="classic-accountempty"><span class="material-symbols-rounded" aria-hidden="true">person_off</span><span>ยังไม่มีบัญชีสำหรับบทบาทนี้</span></div>
            {/each}
          </div>
        </section>
      {/if}

      <form class="classic-loginform" onsubmit={login}>
        <fieldset><legend>ใส่รหัส PIN 4 หลัก</legend><div class="classic-pins" class:has-error={Boolean(message && !message.startsWith('ถูกต้อง') && !message.startsWith('สร้างบัญชี'))}>
          {#each pinDigits as digit, index}
            <input bind:this={pinInputs[index]} value={digit} oninput={(event) => updateDigit(index, event)} onkeydown={(event) => handleKey(index, event)} onpaste={pastePin} aria-label={`PIN หลักที่ ${index + 1}`} inputmode="numeric" autocomplete={index === 0 ? 'one-time-code' : 'off'} maxlength="1" />
          {/each}
        </div><p class="classic-message" class:is-success={message.startsWith('สร้างบัญชี') || message.startsWith('ถูกต้อง')} role="alert">{message}</p></fieldset>
        <button class="classic-primary" type="submit" disabled={!selectedUser}><span>เข้าสู่ระบบ</span><span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span></button>
      </form>

      <div class="classic-authfooter"><span>ยังไม่มีบัญชี?</span><button type="button" onclick={showRegister}><span class="material-symbols-rounded" aria-hidden="true">person_add</span>สมัครสมาชิก</button></div>

      <details class="classic-demo"><summary>รหัสสำหรับทดลองใช้งาน</summary><div>{#each Object.entries(roleMeta) as [id, meta]}<button type="button" onclick={() => useDemoPin(id)}><span>{meta.label}</span><strong>{demoUsers.find((user) => user.role === id)?.pin}</strong></button>{/each}</div></details>
      {:else}
        <div class="classic-registerhead"><button class="icon-button" type="button" onclick={showLogin} aria-label="กลับไปหน้าเข้าสู่ระบบ"><span class="material-symbols-rounded" aria-hidden="true">arrow_back</span></button><div><p>เริ่มต้นใช้งาน</p><h2>สมัครสมาชิกใหม่</h2></div></div>
        <form class="classic-registerform" onsubmit={registerAccount} novalidate>
          <fieldset><legend>ฉันคือ</legend><div class="classic-registerroles">
            {#each Object.entries(roleMeta) as [id, meta]}
              <button class:is-active={registerRole === id} type="button" onclick={() => registerRole = id}><span class="material-symbols-rounded" aria-hidden="true">{meta.icon}</span>{meta.label}</button>
            {/each}
          </div></fieldset>
          <div class="classic-fieldgrid"><label><span>ชื่อ</span><input bind:value={firstName} autocomplete="given-name" placeholder="เช่น มานะ" /></label><label><span>นามสกุล</span><input bind:value={lastName} autocomplete="family-name" placeholder="เช่น รักเรียน" /></label></div>
          <label class="classic-registerfield"><span>โรงเรียน</span><span class="classic-inputicon"><span class="material-symbols-rounded" aria-hidden="true">account_balance</span><input bind:value={school} autocomplete="organization" placeholder="ชื่อโรงเรียน" /></span></label>
          <label class="classic-registerfield"><span>อีเมล</span><span class="classic-inputicon"><span class="material-symbols-rounded" aria-hidden="true">mail</span><input bind:value={email} type="email" autocomplete="email" placeholder="name@example.com" /></span></label>
          <label class="classic-registerfield"><span>ตั้งรหัส PIN 4 หลัก</span><input class="classic-registerpin" value={registerPin} oninput={updateRegisterPin} inputmode="numeric" autocomplete="new-password" maxlength="4" placeholder="••••" /></label>
          <label class="classic-terms"><input bind:checked={acceptTerms} type="checkbox" /><span>ฉันยอมรับ <strong>ข้อกำหนดการใช้งาน</strong> และ <strong>นโยบายความเป็นส่วนตัว</strong> ของ ไทยลินดา</span></label>
          <p class="classic-registermessage" role="alert">{registerMessage}</p>
          <button class="classic-primary" type="submit"><span>สร้างบัญชี</span><span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span></button>
        </form>
      {/if}
    </div>
  </section>
</main>
