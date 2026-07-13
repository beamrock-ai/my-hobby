-- 사용자 프로필/설정 (key-value)
-- 키, 이름 등 단일 값 설정. 목표는 inbody_goals 테이블에 별도 저장.

CREATE TABLE IF NOT EXISTS my_health.user_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON my_health.user_settings
  TO anon, authenticated;

GRANT ALL PRIVILEGES ON my_health.user_settings TO service_role;
