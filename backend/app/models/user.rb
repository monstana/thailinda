class User < ApplicationRecord
  belongs_to :school

  has_secure_password :pin

  enum :role, { student: 0, teacher: 1, parent: 2 }, validate: true

  has_many :taught_classrooms, class_name: "Classroom", foreign_key: :teacher_id, inverse_of: :teacher, dependent: :restrict_with_exception
  has_many :classroom_enrollments, foreign_key: :student_id, inverse_of: :student, dependent: :destroy
  has_many :classrooms, through: :classroom_enrollments
  has_many :guardian_links_as_parent, class_name: "GuardianLink", foreign_key: :parent_id, inverse_of: :parent, dependent: :destroy
  has_many :guardian_links_as_student, class_name: "GuardianLink", foreign_key: :student_id, inverse_of: :student, dependent: :destroy
  has_many :children, through: :guardian_links_as_parent, source: :student
  has_many :guardians, through: :guardian_links_as_student, source: :parent
  has_many :speech_attempts, foreign_key: :student_id, inverse_of: :student, dependent: :destroy
  has_many :api_sessions, dependent: :destroy

  before_validation :assign_external_id, on: :create

  validates :external_id, presence: true, uniqueness: true
  validates :first_name, :last_name, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :pin, numericality: { only_integer: true }, length: { is: 4 }, if: -> { pin.present? }

  def api_json
    {
      id: external_id,
      role: role,
      firstName: first_name,
      lastName: last_name,
      school: school.name,
      email: email
    }
  end

  private

  def assign_external_id
    self.external_id ||= "user-#{SecureRandom.uuid}"
  end
end
