class ThaiSpeechMatcher
  WORD_PREFIX = "คำว่า"

  def initialize(item:, transcript:)
    @item = item
    @transcript = transcript
  end

  def call
    spoken = normalize(@transcript)
    answers = accepted_answers
    return result(false, "empty", 0.0) if spoken.blank?

    exact = answers.find { |answer| answer == spoken }
    return result(true, "exact", 1.0, 0, exact) if exact

    if @item.category == "words"
      word_answer = answers.find { |answer| without_word_prefix(answer) == without_word_prefix(spoken) }
      return result(true, "word-prefix", 1.0, 0, word_answer) if word_answer
    end

    closest = answers.map do |answer|
      distance = edit_distance(spoken, answer)
      longest = [ spoken.each_char.count, answer.each_char.count, 1 ].max
      { answer: answer, distance: distance, confidence: 1.0 - distance.fdiv(longest) }
    end.min_by { |candidate| [ candidate[:distance], -candidate[:confidence] ] }

    # คำสั้นผิดหนึ่งตัวอาจเป็นคนละคำ จึงผ่อนปรนเฉพาะคำตั้งแต่ 4 ตัว
    # และต้องรักษาเสียงต้น เพื่อไม่ให้ "พอควาย" ผ่านแทน "คอควาย"
    normalized_name = normalize(@item.name)
    bare_example = @item.category == "consonants" &&
      normalized_name.present? &&
      spoken == normalized_name.each_char.drop(1).join
    near_match = @item.category != "words" &&
      closest[:answer].each_char.count >= 4 &&
      spoken.each_char.first == closest[:answer].each_char.first &&
      !bare_example &&
      closest[:distance] == 1 &&
      closest[:confidence] >= 0.75

    if near_match
      return result(true, "near", closest[:confidence].round(3), closest[:distance], closest[:answer])
    end

    if @item.category == "consonants"
      sound_prefix = normalize(@item.sound.to_s.strip.split.first)
      if sound_prefix.each_char.count >= 2 && spoken.start_with?(sound_prefix)
        confidence = spoken == sound_prefix ? 0.9 : 0.82
        return result(true, "sound-prefix", confidence, nil, sound_prefix)
      end
    end

    result(
      false,
      "different",
      closest[:confidence].round(3),
      closest[:distance],
      closest[:answer]
    )
  end

  private

  def accepted_answers
    values = case @item.category
    when "words"
      [ @item.display, "#{WORD_PREFIX}#{@item.display}" ]
    when "vowels"
      [ @item.sound, @item.audio_text, @item.name, @item.example ]
    else
      [ @item.sound, @item.name ]
    end
    values.filter_map { |value| normalize(value).presence }.uniq
  end

  def normalize(value)
    value.to_s.unicode_normalize(:nfc).downcase.gsub(/[^\p{Thai}\p{L}\p{N}]/u, "")
  end

  def without_word_prefix(value)
    value.start_with?(WORD_PREFIX) ? value.delete_prefix(WORD_PREFIX) : value
  end

  def edit_distance(left, right)
    a = left.each_char.to_a
    b = right.each_char.to_a
    previous = (0..b.length).to_a

    a.each_with_index do |left_char, row_index|
      current = [ row_index + 1 ]
      b.each_with_index do |right_char, column_index|
        current << [
          current[column_index] + 1,
          previous[column_index + 1] + 1,
          previous[column_index] + (left_char == right_char ? 0 : 1)
        ].min
      end
      previous = current
    end

    previous[b.length]
  end

  def result(passed, match_type, confidence, distance = nil, answer = nil)
    {
      passed: passed,
      matchType: match_type,
      matchConfidence: confidence,
      matchDistance: distance,
      matchedAnswer: answer
    }
  end
end
