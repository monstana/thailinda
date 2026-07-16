module Api
  module V1
    class AccountsController < ApplicationController
      skip_before_action :authenticate_user!

      def index
        role = params[:role].presence
        scope = User.includes(:school).order(:first_name, :last_name)
        scope = scope.where(role: User.roles.fetch(role)) if User.roles.key?(role)
        render json: { accounts: scope.map(&:api_json) }
      end
    end
  end
end
