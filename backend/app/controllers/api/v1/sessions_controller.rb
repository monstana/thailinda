module Api
  module V1
    class SessionsController < ApplicationController
      skip_before_action :authenticate_user!, only: :create

      def create
        user = User.includes(:school).find_by(external_id: params[:accountId])
        unless user&.authenticate_pin(params[:pin].to_s)
          return render json: { error: "บัญชีหรือ PIN ไม่ถูกต้อง" }, status: :unauthorized
        end

        _, token = ApiSession.issue_for(user)
        render json: { user: user.api_json, token: token }
      end

      def destroy
        current_api_session.destroy!
        head :no_content
      end
    end
  end
end
