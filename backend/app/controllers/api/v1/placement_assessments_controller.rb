module Api
  module V1
    class PlacementAssessmentsController < ApplicationController
      def show
        assessment = assessment_for_view
        render json: { placementAssessment: assessment&.api_json }
      end

      def update
        student = User.student.find_by!(external_id: params[:student_id])
        return render(json: { error: "เฉพาะผู้เรียนเจ้าของแบบประเมินเท่านั้น" }, status: :forbidden) unless current_user == student

        assessment = PlacementAssessment.create_for!(student)
        assessment = PlacementAssessmentScorer.new(assessment: assessment, submitted_results: params[:results]).call unless assessment.status == "completed"
        render json: { placementAssessment: assessment.api_json }
      rescue ArgumentError => error
        render json: { error: error.message }, status: :unprocessable_entity
      end

      private

      def assessment_for_view
        student = User.student.find_by!(external_id: params[:student_id])
        return PlacementAssessment.create_for!(student) if current_user == student
        return student.placement_assessment if current_user.parent? && current_user.children.exists?(student.id)
        return student.placement_assessment if current_user.teacher? && current_user.taught_classrooms.joins(:students).where(users: { id: student.id }).exists?

        raise ActiveRecord::RecordNotFound
      end
    end
  end
end
