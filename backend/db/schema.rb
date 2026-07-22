# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_22_090000) do
  create_table "api_sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.datetime "last_used_at"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["expires_at"], name: "index_api_sessions_on_expires_at"
    t.index ["token_digest"], name: "index_api_sessions_on_token_digest", unique: true
    t.index ["user_id"], name: "index_api_sessions_on_user_id"
  end

  create_table "assignment_items", force: :cascade do |t|
    t.integer "assignment_id", null: false
    t.datetime "created_at", null: false
    t.string "learning_item_id", null: false
    t.datetime "updated_at", null: false
    t.index ["assignment_id", "learning_item_id"], name: "idx_assignment_learning_item_unique", unique: true
    t.index ["assignment_id"], name: "index_assignment_items_on_assignment_id"
  end

  create_table "assignments", force: :cascade do |t|
    t.integer "classroom_id", null: false
    t.datetime "created_at", null: false
    t.date "due_date", null: false
    t.string "public_id", null: false
    t.integer "status", default: 0, null: false
    t.integer "teacher_id", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["classroom_id"], name: "index_assignments_on_classroom_id"
    t.index ["public_id"], name: "index_assignments_on_public_id", unique: true
    t.index ["teacher_id"], name: "index_assignments_on_teacher_id"
  end

  create_table "classroom_enrollments", force: :cascade do |t|
    t.integer "classroom_id", null: false
    t.datetime "created_at", null: false
    t.integer "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["classroom_id", "student_id"], name: "idx_classroom_student_unique", unique: true
    t.index ["classroom_id"], name: "index_classroom_enrollments_on_classroom_id"
    t.index ["student_id"], name: "index_classroom_enrollments_on_student_id"
  end

  create_table "classrooms", force: :cascade do |t|
    t.string "academic_year", null: false
    t.integer "capacity", default: 0, null: false
    t.datetime "created_at", null: false
    t.string "group_name", null: false
    t.string "level", null: false
    t.string "name", null: false
    t.string "public_id", null: false
    t.integer "school_id", null: false
    t.integer "status", default: 0, null: false
    t.integer "teacher_id", null: false
    t.datetime "updated_at", null: false
    t.index ["public_id"], name: "index_classrooms_on_public_id", unique: true
    t.index ["school_id"], name: "index_classrooms_on_school_id"
    t.index ["teacher_id", "academic_year"], name: "index_classrooms_on_teacher_id_and_academic_year"
    t.index ["teacher_id"], name: "index_classrooms_on_teacher_id"
  end

  create_table "guardian_links", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "parent_id", null: false
    t.integer "status", default: 0, null: false
    t.integer "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["parent_id", "student_id"], name: "index_guardian_links_on_parent_id_and_student_id", unique: true
    t.index ["parent_id"], name: "index_guardian_links_on_parent_id"
    t.index ["student_id"], name: "index_guardian_links_on_student_id"
  end

  create_table "learning_items", id: :string, force: :cascade do |t|
    t.string "audio_path"
    t.string "audio_text"
    t.string "category", null: false
    t.datetime "created_at", null: false
    t.string "display", null: false
    t.string "example"
    t.string "mouth_cue"
    t.string "name", null: false
    t.integer "position", null: false
    t.string "sound", null: false
    t.datetime "updated_at", null: false
    t.index ["category", "position"], name: "index_learning_items_on_category_and_position", unique: true
  end

  create_table "placement_assessments", force: :cascade do |t|
    t.json "category_scores", default: {}, null: false
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.json "item_ids", default: [], null: false
    t.string "level"
    t.string "level_code"
    t.integer "mouth_average"
    t.text "recommendation"
    t.json "results", default: {}, null: false
    t.integer "score"
    t.string "status", default: "pending", null: false
    t.integer "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["student_id"], name: "index_placement_assessments_on_student_id", unique: true
  end

  create_table "schools", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_schools_on_name", unique: true
  end

  create_table "speech_attempts", force: :cascade do |t|
    t.datetime "attempted_at", null: false
    t.datetime "created_at", null: false
    t.string "learning_item_id", null: false
    t.decimal "match_confidence", precision: 5, scale: 4
    t.string "match_type"
    t.string "mode", default: "typhoon-asr", null: false
    t.boolean "passed", default: false, null: false
    t.integer "student_id", null: false
    t.string "transcript"
    t.datetime "updated_at", null: false
    t.index ["student_id", "learning_item_id", "attempted_at"], name: "idx_attempts_student_item_time"
    t.index ["student_id"], name: "index_speech_attempts_on_student_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "external_id", null: false
    t.string "first_name", null: false
    t.string "last_name", null: false
    t.string "pin_digest", null: false
    t.integer "role", default: 0, null: false
    t.integer "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["external_id"], name: "index_users_on_external_id", unique: true
    t.index ["school_id", "role"], name: "index_users_on_school_id_and_role"
    t.index ["school_id"], name: "index_users_on_school_id"
  end

  add_foreign_key "api_sessions", "users"
  add_foreign_key "assignment_items", "assignments"
  add_foreign_key "assignment_items", "learning_items"
  add_foreign_key "assignments", "classrooms"
  add_foreign_key "assignments", "users", column: "teacher_id"
  add_foreign_key "classroom_enrollments", "classrooms"
  add_foreign_key "classroom_enrollments", "users", column: "student_id"
  add_foreign_key "classrooms", "schools"
  add_foreign_key "classrooms", "users", column: "teacher_id"
  add_foreign_key "guardian_links", "users", column: "parent_id"
  add_foreign_key "guardian_links", "users", column: "student_id"
  add_foreign_key "placement_assessments", "users", column: "student_id"
  add_foreign_key "speech_attempts", "learning_items"
  add_foreign_key "speech_attempts", "users", column: "student_id"
  add_foreign_key "users", "schools"
end
