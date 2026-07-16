module Api
  module V1
    class StudentsController < ApplicationController
      def progress
        student = User.student.find_by!(external_id: params[:id])
        return render(json: { error: "บัญชีนี้ไม่มีสิทธิ์ดูรายงาน" }, status: :forbidden) unless can_view?(student)

        render json: StudentProgressQuery.new(student).call
      end

      private

      def can_view?(student)
        return true if current_user == student
        return current_user.children.exists?(student.id) if current_user.parent?
        return current_user.taught_classrooms.joins(:students).where(users: { id: student.id }).exists? if current_user.teacher?

        false
      end
    end
  end
end
