class ApplicationController < ActionController::API
  before_action :authenticate_user!

  attr_reader :current_user, :current_api_session

  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "ไม่พบข้อมูลที่ร้องขอ" }, status: :not_found
  end

  rescue_from ActiveRecord::RecordInvalid do |error|
    render json: { error: error.record.errors.full_messages.to_sentence }, status: :unprocessable_entity
  end

  private

  def authenticate_user!
    token = request.authorization.to_s.delete_prefix("Bearer ").strip
    @current_api_session = ApiSession.authenticate(token)
    return render(json: { error: "กรุณาเข้าสู่ระบบ" }, status: :unauthorized) unless @current_api_session

    @current_user = @current_api_session.user
    @current_api_session.update_columns(last_used_at: Time.current) if @current_api_session.last_used_at.nil? || @current_api_session.last_used_at < 10.minutes.ago
  end

  def require_role!(*roles)
    return true if roles.map(&:to_s).include?(current_user.role)

    render json: { error: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" }, status: :forbidden
    false
  end

  def ensure_valid_record(record)
    return true if record.valid?

    render json: { error: record.errors.full_messages.to_sentence }, status: :unprocessable_entity
    false
  end
end
