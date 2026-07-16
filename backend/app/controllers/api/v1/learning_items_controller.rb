module Api
  module V1
    class LearningItemsController < ApplicationController
      def index
        render json: { learningItems: LearningItem.order(:category, :position).map(&:api_json) }
      end
    end
  end
end
