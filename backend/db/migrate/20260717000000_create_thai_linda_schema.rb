class CreateThaiLindaSchema < ActiveRecord::Migration[8.1]
  def change
    create_table :schools do |t|
      t.string :name, null: false
      t.timestamps
    end
    add_index :schools, :name, unique: true

    create_table :users do |t|
      t.references :school, null: false, foreign_key: true
      t.string :external_id, null: false
      t.integer :role, null: false, default: 0
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.string :email, null: false
      t.string :pin_digest, null: false
      t.timestamps
    end
    add_index :users, :external_id, unique: true
    add_index :users, :email, unique: true
    add_index :users, [ :school_id, :role ]

    create_table :classrooms do |t|
      t.references :school, null: false, foreign_key: true
      t.references :teacher, null: false, foreign_key: { to_table: :users }
      t.string :public_id, null: false
      t.string :name, null: false
      t.string :level, null: false
      t.string :group_name, null: false
      t.string :academic_year, null: false
      t.integer :capacity, null: false, default: 0
      t.integer :status, null: false, default: 0
      t.timestamps
    end
    add_index :classrooms, :public_id, unique: true
    add_index :classrooms, [ :teacher_id, :academic_year ]

    create_table :classroom_enrollments do |t|
      t.references :classroom, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :classroom_enrollments, [ :classroom_id, :student_id ], unique: true, name: "idx_classroom_student_unique"

    create_table :guardian_links do |t|
      t.references :parent, null: false, foreign_key: { to_table: :users }
      t.references :student, null: false, foreign_key: { to_table: :users }
      t.integer :status, null: false, default: 0
      t.timestamps
    end
    add_index :guardian_links, [ :parent_id, :student_id ], unique: true

    create_table :learning_items, id: false do |t|
      t.string :id, null: false, primary_key: true
      t.string :category, null: false
      t.integer :position, null: false
      t.string :display, null: false
      t.string :name, null: false
      t.string :sound, null: false
      t.string :audio_text
      t.string :example
      t.string :mouth_cue
      t.string :audio_path
      t.timestamps
    end
    add_index :learning_items, [ :category, :position ], unique: true

    create_table :assignments do |t|
      t.references :teacher, null: false, foreign_key: { to_table: :users }
      t.references :classroom, null: false, foreign_key: true
      t.string :public_id, null: false
      t.string :title, null: false
      t.date :due_date, null: false
      t.integer :status, null: false, default: 0
      t.timestamps
    end
    add_index :assignments, :public_id, unique: true

    create_table :assignment_items do |t|
      t.references :assignment, null: false, foreign_key: true
      t.string :learning_item_id, null: false
      t.timestamps
    end
    add_foreign_key :assignment_items, :learning_items
    add_index :assignment_items, [ :assignment_id, :learning_item_id ], unique: true, name: "idx_assignment_learning_item_unique"

    create_table :speech_attempts do |t|
      t.references :student, null: false, foreign_key: { to_table: :users }
      t.string :learning_item_id, null: false
      t.boolean :passed, null: false, default: false
      t.string :transcript
      t.string :mode, null: false, default: "typhoon-asr"
      t.datetime :attempted_at, null: false
      t.timestamps
    end
    add_foreign_key :speech_attempts, :learning_items
    add_index :speech_attempts, [ :student_id, :learning_item_id, :attempted_at ], name: "idx_attempts_student_item_time"

    create_table :api_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :last_used_at
      t.timestamps
    end
    add_index :api_sessions, :token_digest, unique: true
    add_index :api_sessions, :expires_at
  end
end
