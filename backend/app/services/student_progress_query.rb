class StudentProgressQuery
  def initialize(student)
    @student = student
  end

  def call
    attempts_by_item = @student.speech_attempts.order(:attempted_at).group_by(&:learning_item_id)
    items = LearningItem.order(:category, :position).each_with_object({}) do |item, result|
      attempts = attempts_by_item.fetch(item.id, [])
      passed_count = attempts.count(&:passed?)
      last_attempt = attempts.last
      result[item.id] = {
        status: passed_count.positive? ? "passed" : attempts.any? ? "needsPractice" : "notStarted",
        attempts: attempts.size,
        correct: passed_count,
        incorrect: attempts.size - passed_count,
        lastResult: last_attempt ? (last_attempt.passed? ? "correct" : "incorrect") : nil,
        lastAttemptAt: last_attempt&.attempted_at,
        mode: last_attempt&.mode || "notEvaluated",
        lastRecognizedText: last_attempt&.transcript.to_s
      }
    end

    states = items.values
    {
      userId: @student.external_id,
      items: items,
      updatedAt: states.filter_map { |state| state[:lastAttemptAt] }.max,
      placementAssessment: @student.placement_assessment&.api_json,
      summary: {
        total: states.size,
        practiced: states.count { |state| state[:status] != "notStarted" },
        passed: states.count { |state| state[:status] == "passed" },
        needsPractice: states.count { |state| state[:status] == "needsPractice" },
        attempts: states.sum { |state| state[:attempts] }
      }
    }
  end
end
