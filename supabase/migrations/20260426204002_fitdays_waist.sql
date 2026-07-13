-- Fitdays+ 앱 허리둘레 측정 기록
-- zepp_weight 패턴과 동일: measured_at(timestamptz) UNIQUE, 단일 측정값.

CREATE TABLE IF NOT EXISTS my_health.fitdays_waist (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measured_at         TIMESTAMPTZ NOT NULL UNIQUE,
  waist_cm            NUMERIC NOT NULL,
  raw_screenshot_url  TEXT,
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitdays_waist_measured_at
  ON my_health.fitdays_waist (measured_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON my_health.fitdays_waist
  TO anon, authenticated;

GRANT ALL PRIVILEGES ON my_health.fitdays_waist TO service_role;
