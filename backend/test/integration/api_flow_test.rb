require "test_helper"

class ApiFlowTest < ActionDispatch::IntegrationTest
  setup do
    Rails.application.load_seed if User.count.zero?
  end

  test "lists accounts and signs in with account plus pin" do
    get "/api/v1/accounts", params: { role: "student" }
    assert_response :success
    assert_equal "student-mana", response.parsed_body.fetch("accounts").first.fetch("id")

    post "/api/v1/session", params: { accountId: "student-mana", pin: "1234" }, as: :json
    assert_response :success
    token = response.parsed_body.fetch("token")

    get "/api/v1/me", headers: auth_headers(token)
    assert_response :success
    assert_equal "student", response.parsed_body.dig("user", "role")
  end

  test "rejects an incorrect pin" do
    post "/api/v1/session", params: { accountId: "student-mana", pin: "9999" }, as: :json
    assert_response :unauthorized
  end

  test "teacher sees classroom students and student progress" do
    token = login_as("teacher-linda", "2345")

    get "/api/v1/classrooms", headers: auth_headers(token)
    assert_response :success
    classroom = response.parsed_body.fetch("classrooms").first
    assert_equal "classroom-demo-p1-2", classroom.fetch("id")

    get "/api/v1/classrooms/#{classroom.fetch('id')}/students", headers: auth_headers(token)
    assert_response :success
    assert_equal "student-mana", response.parsed_body.fetch("students").first.fetch("id")

    get "/api/v1/students/student-mana/progress", headers: auth_headers(token)
    assert_response :success
    assert_equal 86, response.parsed_body.dig("summary", "total")
  end

  test "speech evaluation records the Typhoon result" do
    token = login_as("student-mana", "1234")
    fake_evaluator = Object.new
    fake_evaluator.define_singleton_method(:call) { { passed: true, transcript: "กา" } }
    audio = Rack::Test::UploadedFile.new(Rails.root.join("../static/audio/learning/w-ka.mp3"), "audio/mpeg")
    original_constructor = TyphoonSpeechEvaluator.method(:new)
    TyphoonSpeechEvaluator.define_singleton_method(:new) { |**| fake_evaluator }

    assert_difference("SpeechAttempt.count", 1) do
      post "/api/v1/speech/evaluate", params: { targetId: "w-ka", audio: audio }, headers: auth_headers(token)
    end

    assert_response :success
    assert response.parsed_body.fetch("passed")
    assert_equal "กา", response.parsed_body.fetch("transcript")
  ensure
    TyphoonSpeechEvaluator.define_singleton_method(:new, original_constructor) if original_constructor
  end

  test "new student receives and completes a six item placement assessment" do
    post "/api/v1/registrations", params: {
      role: "student",
      firstName: "เด็กใหม่",
      lastName: "ทดสอบ",
      school: "โรงเรียนบ้านแสนสุข",
      email: "new-student-#{SecureRandom.hex(4)}@example.test",
      pin: "6789"
    }, as: :json

    assert_response :created
    token = response.parsed_body.fetch("token")
    student = User.find_by!(external_id: response.parsed_body.dig("user", "id"))
    assessment = response.parsed_body.fetch("placementAssessment")
    items = LearningItem.where(id: assessment.fetch("itemIds")).group_by(&:category)
    assert_equal 3, items.fetch("consonants").length
    assert_equal 2, items.fetch("vowels").length
    assert_equal 1, items.fetch("words").length

    assessment.fetch("itemIds").each do |item_id|
      SpeechAttempt.create!(
        student: student,
        learning_item_id: item_id,
        passed: true,
        transcript: LearningItem.find(item_id).sound,
        mode: "typhoon-asr",
        match_type: "exact",
        match_confidence: 0.9,
        attempted_at: Time.current
      )
    end
    results = assessment.fetch("itemIds").map do |item_id|
      { itemId: item_id, mouthStatus: "matched", mouthScore: 80, mouthFrames: 12 }
    end

    patch "/api/v1/students/#{student.external_id}/placement_assessment",
      params: { results: results }, headers: auth_headers(token), as: :json

    assert_response :success
    completed = response.parsed_body.fetch("placementAssessment")
    assert_equal "completed", completed.fetch("status")
    assert_equal 89, completed.fetch("score")
    assert_equal "ระดับคล่องแคล่ว", completed.fetch("level")
    assert_equal 6, completed.fetch("results").length
  end

  private

  def login_as(account_id, pin)
    post "/api/v1/session", params: { accountId: account_id, pin: pin }, as: :json
    response.parsed_body.fetch("token")
  end

  def auth_headers(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
