module Api
  module V1
    class SpeechEvaluationsController < ApplicationController
      MAX_AUDIO_SIZE = 5.megabytes

      def create
        return unless require_role!(:student)

        item = LearningItem.find(params[:targetId])
        audio = params[:audio]
        return render(json: { error: "ไม่พบไฟล์เสียง" }, status: :bad_request) unless audio.respond_to?(:tempfile)
        return render(json: { error: "ไฟล์เสียงมีขนาดใหญ่เกินไป" }, status: :payload_too_large) if audio.size > MAX_AUDIO_SIZE

        result = TyphoonSpeechEvaluator.new(item: item, upload: audio).call
        SpeechAttempt.create!(
          student: current_user,
          learning_item: item,
          passed: result.fetch(:passed),
          transcript: result.fetch(:transcript),
          mode: "typhoon-asr",
          attempted_at: Time.current
        )
        render json: result.merge(targetId: item.id, mode: "typhoon-asr")
      rescue TyphoonSpeechEvaluator::Error => error
        render json: { error: error.message }, status: :bad_gateway
      end
    end
  end
end
