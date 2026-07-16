module Api
  module V1
    class MeController < ApplicationController
      def show
        render json: { user: current_user.api_json }
      end
    end
  end
end
