class Assignment < ApplicationRecord
  belongs_to :teacher, class_name: "User"
  belongs_to :classroom

  has_many :assignment_items, dependent: :destroy
  has_many :learning_items, through: :assignment_items

  enum :status, { active: 0, closed: 1, archived: 2 }, validate: true

  before_validation :assign_public_id, on: :create

  validates :public_id, presence: true, uniqueness: true
  validates :title, :due_date, presence: true

  def api_json
    {
      id: public_id,
      teacherId: teacher.external_id,
      classroomId: classroom.public_id,
      classroomName: classroom.name,
      title: title,
      itemIds: learning_items.pluck(:id),
      dueDate: due_date,
      status: status,
      createdAt: created_at
    }
  end

  private

  def assign_public_id
    self.public_id ||= SecureRandom.uuid
  end
end
