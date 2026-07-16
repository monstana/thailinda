export const roleMeta = {
  student: { label: 'นักเรียน', icon: 'child_care', route: '/student' },
  teacher: { label: 'คุณครู', icon: 'school', route: '/teacher' },
  parent: { label: 'ผู้ปกครอง', icon: 'family_restroom', route: '/parent' }
};

export const demoUsers = [
  { id: 'student-mana', role: 'student', firstName: 'น้องมานะ', lastName: 'รักเรียน', school: 'โรงเรียนบ้านแสนสุข', email: 'mana@student.thailinda.test', pin: '1234' },
  { id: 'teacher-linda', role: 'teacher', firstName: 'ครูลินดา', lastName: 'รักเรียน', school: 'โรงเรียนบ้านแสนสุข', email: 'linda@thailinda.test', pin: '2345' },
  { id: 'parent-anchalee', role: 'parent', firstName: 'คุณอัญชลี', lastName: 'ศรีกรุง', school: 'โรงเรียนบ้านแสนสุข', email: 'anchalee@thailinda.test', pin: '3456' }
];

const API_ACCOUNTS_KEY = 'thailinda.apiAccounts.v1';

export function getAllUsers() {
  if (typeof localStorage === 'undefined') return demoUsers;
  try {
    const registered = JSON.parse(localStorage.getItem('thailinda.registeredUsers') || '[]');
    const apiAccounts = JSON.parse(localStorage.getItem(API_ACCOUNTS_KEY) || '[]');
    const accounts = [...demoUsers, ...(Array.isArray(registered) ? registered : [])];
    const byId = new Map(accounts.map((account) => [account.id, account]));
    for (const account of Array.isArray(apiAccounts) ? apiAccounts : []) {
      if (!account?.id) continue;
      byId.set(account.id, { ...(byId.get(account.id) || {}), ...account });
    }
    return [...byId.values()];
  } catch {
    return demoUsers;
  }
}

export function saveApiAccounts(accounts) {
  localStorage.setItem(API_ACCOUNTS_KEY, JSON.stringify(Array.isArray(accounts) ? accounts : []));
}

export function saveRegisteredUser(user) {
  const registered = getAllUsers().filter((account) => !demoUsers.some((demo) => demo.id === account.id));
  registered.push(user);
  localStorage.setItem('thailinda.registeredUsers', JSON.stringify(registered));
}
