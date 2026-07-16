class LearningItem < ApplicationRecord
  self.primary_key = :id

  has_many :assignment_items, dependent: :restrict_with_exception
  has_many :speech_attempts, dependent: :restrict_with_exception

  validates :category, inclusion: { in: %w[consonants vowels words] }
  validates :position, :display, :name, :sound, presence: true
  validates :position, uniqueness: { scope: :category }

  def api_json
    {
      id: id,
      category: category,
      order: position,
      display: display,
      name: name,
      sound: sound,
      audioText: audio_text,
      example: example,
      mouthCue: mouth_cue,
      audioPath: audio_path
    }
  end
end
