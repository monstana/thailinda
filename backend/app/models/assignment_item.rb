class AssignmentItem < ApplicationRecord
  belongs_to :assignment
  belongs_to :learning_item

  validates :learning_item_id, uniqueness: { scope: :assignment_id }
end
