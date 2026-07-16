module Api
  module V1
    class RegistrationsController < ApplicationController
      skip_before_action :authenticate_user!

      def create
        role = params[:role].to_s
        return render(json: { error: "บทบาทบัญชีไม่ถูกต้อง" }, status: :unprocessable_entity) unless User.roles.key?(role)

        school = School.find_or_create_by!(name: registration_params[:school].to_s.strip)
        user = school.users.new(
          role: role,
          first_name: registration_params[:firstName],
          last_name: registration_params[:lastName],
          email: registration_params[:email].to_s.strip.downcase,
          pin: registration_params[:pin]
        )
        user.save!
        render json: { user: user.api_json }, status: :created
      end

      private

      def registration_params
        params.permit(:firstName, :lastName, :school, :email, :pin)
      end
    end
  end
end
