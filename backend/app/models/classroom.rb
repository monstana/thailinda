class Classroom < ApplicationRecord
  belongs_to :school
  belongs_to :teacher, class_name: "User", inverse_of: :taught_classrooms

  has_many :classroom_enrollments, dependent: :destroy
  has_many :students, through: :classroom_enrollments
  has_many :assignments, dependent: :destroy

  enum :status, { active: 0, archived: 1 }, validate: true

  before_validation :assign_public_id, on: :create

  validates :public_id, presence: true, uniqueness: true
  validates :name, :level, :group_name, :academic_year, presence: true
  validates :capacity, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  def api_json(include_students: false)
    payload = {
      id: public_id,
      teacherId: teacher.external_id,
      name: name,
      level: level,
      group: group_name,
      academicYear: academic_year,
      school: school.name,
      studentCount: capacity,
      connectedStudents: students.size,
      status: status,
      createdAt: created_at
    }
    payload[:students] = students.map(&:api_json) if include_students
    payload
  end

  private

  def assign_public_id
    self.public_id ||= SecureRandom.uuid
  end
end
