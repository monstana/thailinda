require "digest"

class ApiSession < ApplicationRecord
  TOKEN_LIFETIME = 30.days

  belongs_to :user

  scope :active, -> { where("expires_at > ?", Time.current) }

  validates :token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  def self.issue_for(user)
    token = SecureRandom.urlsafe_base64(48)
    session = create!(user: user, token_digest: digest(token), expires_at: TOKEN_LIFETIME.from_now)
    [ session, token ]
  end

  def self.authenticate(token)
    return if token.blank?

    active.includes(user: :school).find_by(token_digest: digest(token))
  end

  def self.digest(token)
    Digest::SHA256.hexdigest(token)
  end
end
