require "test_helper"

class ThaiSpeechMatcherTest < ActiveSupport::TestCase
  Item = Data.define(:category, :display, :sound, :name, :audio_text, :example)

  test "accepts exact and bounded near consonant matches" do
    item = Item.new(category: "consonants", display: "จ", sound: "จอ จาน", name: "จ จาน", audio_text: nil, example: nil)

    assert_equal "exact", match(item, "จอจาน")[:matchType]
    assert_equal "near", match(item, "จอจา")[:matchType]
    assert_equal "sound-prefix", match(item, "จอ")[:matchType]
    assert_equal "sound-prefix", match(item, "จอจ้ะ")[:matchType]
    assert_not match(item, "จาน")[:passed]
    assert_not match(item, "รอจาน")[:passed]
    assert_not match(item, "จบ")[:passed]
  end

  test "does not relax the leading consonant being learned" do
    item = Item.new(category: "consonants", display: "ค", sound: "คอ ควาย", name: "ค ควาย", audio_text: nil, example: nil)

    assert_equal "near", match(item, "คอความ")[:matchType]
    assert_not match(item, "พอควาย")[:passed]
  end

  test "keeps short words and vowels strict" do
    word = Item.new(category: "words", display: "กา", sound: "กา", name: "คำว่า กา", audio_text: nil, example: nil)
    vowel = Item.new(category: "vowels", display: "อะ", sound: "สระ อะ", name: "สระอะ", audio_text: "สะ หระ อะ", example: "อะ")

    assert match(word, "คำว่า กา")[:passed]
    assert_not match(word, "ขา")[:passed]
    assert match(vowel, "อะ")[:passed]
    assert_not match(vowel, "อา")[:passed]
  end

  private

  def match(item, transcript)
    ThaiSpeechMatcher.new(item: item, transcript: transcript).call
  end
end
