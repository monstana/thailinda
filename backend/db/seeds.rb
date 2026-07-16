learning_items = JSON.parse(Rails.root.join("db/learning_items.json").read)
learning_items.each do |attributes|
  item = LearningItem.find_or_initialize_by(id: attributes.fetch("id"))
  item.update!(attributes)
end

if !Rails.env.production? || ENV["SEED_DEMO_DATA"] == "true"
  school = School.find_or_create_by!(name: "โรงเรียนบ้านแสนสุข")

  users = [
    { external_id: "student-mana", role: :student, first_name: "น้องมานะ", last_name: "รักเรียน", email: "mana@student.thailinda.test", pin: "1234" },
    { external_id: "teacher-linda", role: :teacher, first_name: "ครูลินดา", last_name: "รักเรียน", email: "linda@thailinda.test", pin: "2345" },
    { external_id: "parent-anchalee", role: :parent, first_name: "คุณอัญชลี", last_name: "ศรีกรุง", email: "anchalee@thailinda.test", pin: "3456" }
  ].index_with do |attributes|
    user = User.find_or_initialize_by(external_id: attributes.fetch(:external_id))
    user.assign_attributes(attributes.merge(school: school))
    user.save!
    user
  end

  classroom = Classroom.find_or_initialize_by(public_id: "classroom-demo-p1-2")
  classroom.update!(
    school: school,
    teacher: users.fetch(users.keys.find { |item| item[:external_id] == "teacher-linda" }),
    name: "ห้อง ป.1/2",
    level: "ประถมศึกษาปีที่ 1",
    group_name: "กลุ่มสายรุ้ง",
    academic_year: "2569",
    capacity: 24,
    status: :active
  )

  student = users.fetch(users.keys.find { |item| item[:external_id] == "student-mana" })
  parent = users.fetch(users.keys.find { |item| item[:external_id] == "parent-anchalee" })
  teacher = users.fetch(users.keys.find { |item| item[:external_id] == "teacher-linda" })
  ClassroomEnrollment.find_or_create_by!(classroom: classroom, student: student)
  GuardianLink.find_or_create_by!(parent: parent, student: student) { |link| link.status = :active }

  assignment = Assignment.find_or_initialize_by(public_id: "assignment-demo-basic")
  assignment.update!(teacher: teacher, classroom: classroom, title: "ฝึกออกเสียงพื้นฐาน", due_date: 7.days.from_now.to_date, status: :active)
  assignment.learning_items = LearningItem.where(id: %w[c-ko-kai v-a-long w-ka])

  puts "Seeded #{LearningItem.count} learning items, #{User.count} users, #{Classroom.count} classroom, and #{Assignment.count} assignment."
else
  puts "Seeded #{LearningItem.count} learning items. Demo data was skipped in production."
end
