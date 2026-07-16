class School < ApplicationRecord
  has_many :users, dependent: :restrict_with_exception
  has_many :classrooms, dependent: :restrict_with_exception

  validates :name, presence: true, uniqueness: { case_sensitive: false }
end
