class GuardianLink < ApplicationRecord
  belongs_to :parent, class_name: "User", inverse_of: :guardian_links_as_parent
  belongs_to :student, class_name: "User", inverse_of: :guardian_links_as_student

  enum :status, { active: 0, pending: 1, removed: 2 }, validate: true

  validates :student_id, uniqueness: { scope: :parent_id }
  validate :roles_are_valid

  private

  def roles_are_valid
    errors.add(:parent, "must have the parent role") unless parent&.parent?
    errors.add(:student, "must have the student role") unless student&.student?
  end
end
