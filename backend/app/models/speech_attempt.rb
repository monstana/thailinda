class SpeechAttempt < ApplicationRecord
  belongs_to :student, class_name: "User", inverse_of: :speech_attempts
  belongs_to :learning_item

  validates :mode, :attempted_at, presence: true
  validate :student_role

  private

  def student_role
    errors.add(:student, "must have the student role") unless student&.student?
  end
end
