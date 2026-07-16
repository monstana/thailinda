export const roleMeta = {
  student: {
    label: "นักเรียน",
    icon: "child_care",
    greeting: "พร้อมฝึกคำใหม่แล้วหรือยัง",
    route: "student/student/007.html"
  },
  teacher: {
    label: "คุณครู",
    icon: "school",
    greeting: "ยินดีต้อนรับคุณครู",
    route: "teacher/teacher/t_001.html"
  },
  parent: {
    label: "ผู้ปกครอง",
    icon: "family_restroom",
    greeting: "ยินดีต้อนรับผู้ปกครอง",
    route: "parent/parent/p_003.html"
  }
};

export const demoUsers = [
  {
    id: "student-mana",
    role: "student",
    firstName: "น้องมานะ",
    lastName: "รักเรียน",
    school: "โรงเรียนบ้านแสนสุข",
    email: "mana@student.thailinda.test",
    pin: "1234"
  },
  {
    id: "teacher-linda",
    role: "teacher",
    firstName: "ครูลินดา",
    lastName: "รักเรียน",
    school: "โรงเรียนบ้านแสนสุข",
    email: "linda@thailinda.test",
    pin: "2345"
  },
  {
    id: "parent-anchalee",
    role: "parent",
    firstName: "คุณอัญชลี",
    lastName: "ศรีกรุง",
    school: "โรงเรียนบ้านแสนสุข",
    email: "anchalee@thailinda.test",
    pin: "3456"
  }
];

export function loadRegisteredUsers() {
  try {
    return JSON.parse(localStorage.getItem("thailinda.registeredUsers") || "[]");
  } catch {
    return [];
  }
}

export function saveRegisteredUser(user) {
  const users = loadRegisteredUsers();
  users.push(user);
  localStorage.setItem("thailinda.registeredUsers", JSON.stringify(users));
}

export function getAllUsers() {
  return [...demoUsers, ...loadRegisteredUsers()];
}

export function resolveUserForPin(currentUser, pin, users = getAllUsers()) {
  if (currentUser?.pin === pin) return { user: currentUser, ambiguous: false };
  const matches = users.filter((user) => user.pin === pin);
  return {
    user: matches.length === 1 ? matches[0] : null,
    ambiguous: matches.length > 1
  };
}
