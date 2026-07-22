class PlacementAssessmentScorer
  LEVELS = [
    { minimum: 85, level: "ระดับคล่องแคล่ว", code: "advanced" },
    { minimum: 70, level: "ระดับกำลังพัฒนา", code: "developing" },
    { minimum: 50, level: "ระดับพื้นฐาน", code: "foundation" },
    { minimum: 0, level: "ระดับเริ่มต้น", code: "beginner" }
  ].freeze

  def initialize(assessment:, submitted_results:)
    @assessment = assessment
    @student = assessment.student
    @submitted_results = Array(submitted_results).index_by { |result| result[:itemId].to_s }
  end

  def call
    scored_results = @assessment.item_ids.map { |item_id| score_item(item_id) }
    raise ArgumentError, "ผลแบบประเมินยังไม่ครบ 6 ข้อ" if scored_results.any?(&:nil?)

    category_scores = %w[consonants vowels words].to_h do |category|
      values = scored_results.filter_map { |result| result[:category] == category ? result[:score] : nil }
      [ category, values.sum.fdiv(values.length).round ]
    end
    score = scored_results.sum { |result| result[:score] }.fdiv(scored_results.length).round
    visual_values = scored_results.filter_map { |result| result[:visualScore] }
    mouth_average = visual_values.any? ? visual_values.sum.fdiv(visual_values.length).round : nil
    level = LEVELS.find { |candidate| score >= candidate[:minimum] }

    @assessment.update!(
      status: "completed",
      results: scored_results.index_by { |result| result[:itemId] },
      score: score,
      level: level[:level],
      level_code: level[:code],
      category_scores: category_scores,
      mouth_average: mouth_average,
      recommendation: recommendation(category_scores, mouth_average),
      completed_at: Time.current
    )
    @assessment
  end

  private

  def score_item(item_id)
    submitted = @submitted_results[item_id]
    return unless submitted

    item = LearningItem.find(item_id)
    attempt = @student.speech_attempts.where(learning_item_id: item_id)
      .where("attempted_at >= ?", @assessment.created_at)
      .order(:attempted_at).first
    return unless attempt

    confidence = attempt.match_confidence&.to_f
    speech_score = if confidence
      value = (confidence.clamp(0, 1) * 100).round
      attempt.passed? ? [ value, 75 ].max : [ value, 69 ].min
    else
      attempt.passed? ? 100 : 0
    end
    mouth_score = numeric_score(submitted[:mouthScore])
    has_visual_score = item.category != "words" && mouth_score
    combined = has_visual_score ? (speech_score * 0.85 + mouth_score * 0.15).round : speech_score

    {
      itemId: item_id,
      category: item.category,
      passed: attempt.passed?,
      transcript: attempt.transcript.to_s,
      matchType: attempt.match_type.to_s,
      matchConfidence: confidence,
      audioScore: speech_score,
      visualScore: has_visual_score ? mouth_score : nil,
      mouthStatus: submitted[:mouthStatus].to_s,
      mouthFrames: submitted[:mouthFrames].to_i,
      score: combined,
      assessedAt: attempt.attempted_at
    }
  end

  def numeric_score(value)
    number = Float(value, exception: false)
    number&.clamp(0, 100)&.round
  end

  def recommendation(category_scores, mouth_average)
    labels = { "consonants" => "พยัญชนะ", "vowels" => "สระ", "words" => "คำศัพท์" }
    weakest = category_scores.min_by { |_, value| value }
    focus = "ควรเน้นฝึก#{labels.fetch(weakest.first)} โดยฟังเสียงต้นแบบแล้วพูดช้า ๆ ให้ครบเสียง"
    mouth_average && mouth_average < 70 ? "#{focus} และฝึกจัดรูปปากหน้ากระจกให้ใกล้เคียงตัวอย่าง" : "#{focus} พร้อมทบทวนวันละ 5–10 นาที"
  end
end
