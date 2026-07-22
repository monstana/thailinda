class PlacementAssessment < ApplicationRecord
  belongs_to :student, class_name: "User", inverse_of: :placement_assessment

  validates :status, inclusion: { in: %w[pending completed] }
  validate :student_role
  validate :assessment_item_mix

  def self.create_for!(student)
    return student.placement_assessment if student.placement_assessment

    selected = [
      *LearningItem.where(category: "consonants").to_a.sample(3),
      *LearningItem.where(category: "vowels").to_a.sample(2),
      *LearningItem.where(category: "words").to_a.sample(1)
    ]
    create!(student: student, item_ids: selected.map(&:id))
  end

  def api_json
    {
      id: id,
      userId: student.external_id,
      status: status,
      itemIds: item_ids,
      results: results || {},
      score: score,
      level: level.to_s,
      levelCode: level_code.to_s,
      levelIcon: level_icon,
      categoryScores: category_scores || {},
      mouthAverage: mouth_average,
      recommendation: recommendation.to_s,
      createdAt: created_at,
      completedAt: completed_at
    }
  end

  private

  def level_icon
    {
      "advanced" => "workspace_premium",
      "developing" => "trending_up",
      "foundation" => "school",
      "beginner" => "flag"
    }.fetch(level_code, "quiz")
  end

  def student_role
    errors.add(:student, "must have the student role") unless student&.student?
  end

  def assessment_item_mix
    return if item_ids.blank? && new_record?

    items = LearningItem.where(id: item_ids).group_by(&:category)
    return if item_ids.length == 6 && items.fetch("consonants", []).length == 3 && items.fetch("vowels", []).length == 2 && items.fetch("words", []).length == 1

    errors.add(:item_ids, "must contain 3 consonants, 2 vowels, and 1 word")
  end
end
