require "net/http/post/multipart"

class TyphoonSpeechEvaluator
  class Error < StandardError; end

  API_URI = URI("https://api.opentyphoon.ai/v1/audio/transcriptions")

  def initialize(item:, upload:)
    @item = item
    @upload = upload
  end

  def call
    api_key = ENV["TYPHOON_API_KEY"]
    raise Error, "ระบบประเมินเสียงยังไม่ได้ตั้งค่า API key" if api_key.blank?

    request = Net::HTTP::Post::Multipart.new(
      API_URI.path,
      "model" => "typhoon-asr-realtime",
      "file" => UploadIO.new(@upload.tempfile, normalized_content_type, @upload.original_filename.presence || "speech.wav")
    )
    request["Authorization"] = "Bearer #{api_key}"

    response = Net::HTTP.start(API_URI.host, API_URI.port, use_ssl: true, open_timeout: 10, read_timeout: 25) do |http|
      http.request(request)
    end
    raise Error, upstream_error(response) unless response.is_a?(Net::HTTPSuccess)

    transcript = JSON.parse(response.body).fetch("text", "").to_s.strip
    { passed: transcript.present? && accepted_answers.include?(normalize(transcript)), transcript: transcript }
  rescue JSON::ParserError, KeyError
    raise Error, "บริการประเมินเสียงส่งข้อมูลกลับมาไม่สมบูรณ์"
  rescue Net::OpenTimeout, Net::ReadTimeout
    raise Error, "การประเมินเสียงใช้เวลานานเกินไป กรุณาลองใหม่"
  rescue SocketError, Errno::ECONNREFUSED
    raise Error, "เชื่อมต่อบริการประเมินเสียงไม่ได้"
  end

  private

  def accepted_answers
    values = case @item.category
    when "words"
      [ @item.display, "คำว่า#{@item.display}" ]
    when "vowels"
      [ @item.sound, @item.audio_text, @item.name, @item.example ]
    else
      [ @item.sound, @item.name ]
    end
    values.filter_map { |value| normalize(value).presence }.to_set
  end

  def normalize(value)
    value.to_s.unicode_normalize(:nfc).downcase.gsub(/[^\p{Thai}\p{L}\p{N}]/u, "")
  end

  def normalized_content_type
    @upload.content_type == "audio/mpeg" ? "audio/mp3" : (@upload.content_type.presence || "audio/wav")
  end

  def upstream_error(response)
    return "API key สำหรับประเมินเสียงไม่ถูกต้อง" if [ "401", "403" ].include?(response.code)

    "บริการประเมินเสียงไม่พร้อมใช้งาน กรุณาลองใหม่"
  end
end
