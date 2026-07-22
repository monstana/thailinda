Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :accounts, only: :index
      resources :registrations, only: :create
      resource :session, only: [ :create, :destroy ]
      resource :me, only: :show, controller: :me
      resources :learning_items, only: :index
      resources :classrooms, only: [ :index, :show, :create ] do
        get :students, on: :member
      end
      resources :students, only: [] do
        get :progress, on: :member
        resource :placement_assessment, only: [ :show, :update ], controller: :placement_assessments
      end
      resources :assignments, only: [ :index, :create ]
      post "speech/evaluate", to: "speech_evaluations#create"
    end
  end
end
