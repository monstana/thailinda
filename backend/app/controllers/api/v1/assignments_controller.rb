module Api
  module V1
    class AssignmentsController < ApplicationController
      def index
        render json: { assignments: visible_assignments.includes(:teacher, :classroom, :learning_items).order(created_at: :desc).map(&:api_json) }
      end

      def create
        return unless require_role!(:teacher)

        classroom = current_user.taught_classrooms.find_by!(public_id: assignment_params[:classroomId])
        item_ids = Array(assignment_params[:itemIds]).uniq
        items = LearningItem.where(id: item_ids)
        return render(json: { error: "กรุณาเลือกแบบฝึกอย่างน้อย 1 รายการ" }, status: :unprocessable_entity) if items.empty?

        assignment = Assignment.transaction do
          record = classroom.assignments.create!(
            teacher: current_user,
            title: assignment_params[:title],
            due_date: assignment_params[:dueDate]
          )
          record.learning_items << items
          record
        end
        render json: { assignment: assignment.api_json }, status: :created
      end

      private

      def visible_assignments
        case current_user.role
        when "teacher"
          Assignment.where(teacher: current_user)
        when "student"
          Assignment.where(classroom_id: current_user.classroom_ids)
        when "parent"
          classroom_ids = ClassroomEnrollment.where(student_id: current_user.child_ids).select(:classroom_id)
          Assignment.where(classroom_id: classroom_ids)
        else
          Assignment.none
        end
      end

      def assignment_params
        params.permit(:classroomId, :title, :dueDate, itemIds: [])
      end
    end
  end
end
