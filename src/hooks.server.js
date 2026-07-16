const legacyRoutes = new Map([
  ['/index.html', '/'],
  ['/student/student/007.html', '/student'],
  ['/student/student/010.html', '/student/progress'],
  ['/student/student/011.html', '/student/profile'],
  ['/student/student/012.html', '/student/lesson/consonants/0'],
  ['/teacher/teacher/t_001.html', '/teacher'],
  ['/teacher/teacher/t_002.html', '/teacher/assignments'],
  ['/teacher/teacher/t_003.html', '/teacher/profile'],
  ['/teacher/teacher/t_006.html', '/teacher/assignments'],
  ['/parent/parent/p_001.html', '/parent'],
  ['/parent/parent/p_002.html', '/parent/development'],
  ['/parent/parent/p_003.html', '/parent/profile']
]);

export async function handle({ event, resolve }) {
  const destination = legacyRoutes.get(event.url.pathname);
  if (destination) {
    return new Response(null, {
      status: 307,
      headers: { location: destination }
    });
  }
  return resolve(event);
}
