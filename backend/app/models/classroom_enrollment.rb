class ClassroomEnrollment < ApplicationRecord
  belongs_to :classroom
  belongs_to :student, class_name: "User", inverse_of: :classroom_enrollments

  validates :student_id, uniqueness: { scope: :classroom_id }
  validate :student_role

  private

  def student_role
    errors.add(:student, "must have the student role") unless student&.student?
  end
end
