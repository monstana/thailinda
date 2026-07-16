module Api
  module V1
    class ClassroomsController < ApplicationController
      before_action :set_classroom, only: [ :show, :students ]

      def index
        render json: { classrooms: visible_classrooms.includes(:school, :teacher, :students).map(&:api_json) }
      end

      def show
        render json: { classroom: @classroom.api_json(include_students: true) }
      end

      def students
        render json: { students: @classroom.students.includes(:school).order(:first_name, :last_name).map(&:api_json) }
      end

      def create
        return unless require_role!(:teacher)

        classroom = current_user.taught_classrooms.new(
          school: current_user.school,
          name: classroom_params[:name],
          level: classroom_params[:level],
          group_name: classroom_params[:group],
          academic_year: classroom_params[:academicYear],
          capacity: classroom_params[:studentCount]
        )
        classroom.save!
        student_ids = Array(classroom_params[:studentIds])
        students = current_user.school.users.student.where(external_id: student_ids)
        classroom.students << students
        render json: { classroom: classroom.api_json(include_students: true) }, status: :created
      end

      private

      def set_classroom
        @classroom = visible_classrooms.find_by!(public_id: params[:id])
      end

      def visible_classrooms
        case current_user.role
        when "teacher"
          current_user.taught_classrooms
        when "student"
          current_user.classrooms
        when "parent"
          Classroom.joins(:students).where(users: { id: current_user.children.select(:id) }).distinct
        else
          Classroom.none
        end
      end

      def classroom_params
        params.permit(:name, :level, :group, :academicYear, :studentCount, studentIds: [])
      end
    end
  end
end
