class CreatePlacementAssessments < ActiveRecord::Migration[8.1]
  def change
    add_column :speech_attempts, :match_type, :string
    add_column :speech_attempts, :match_confidence, :decimal, precision: 5, scale: 4

    create_table :placement_assessments do |t|
      t.references :student, null: false, foreign_key: { to_table: :users }, index: { unique: true }
      t.string :status, null: false, default: "pending"
      t.json :item_ids, null: false, default: []
      t.json :results, null: false, default: {}
      t.integer :score
      t.string :level
      t.string :level_code
      t.json :category_scores, null: false, default: {}
      t.integer :mouth_average
      t.text :recommendation
      t.datetime :completed_at
      t.timestamps
    end
  end
end
