-- =========================================
-- my-health 초기 스키마
-- =========================================
-- 공유 Supabase 인스턴스(my-bookkeeping VM01)에서 my_health 스키마로 격리.
-- my-stocks 와 동일한 구성 패턴.

CREATE SCHEMA IF NOT EXISTS my_health;

-- 건강검진결과 (tidy 형식)
CREATE TABLE IF NOT EXISTS my_health.health_checkups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL,
  institution   TEXT,
  category      TEXT,
  test_item     TEXT NOT NULL,
  value         NUMERIC,
  unit          TEXT,
  normal_range  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (date, institution, test_item)
);

CREATE INDEX IF NOT EXISTS idx_health_checkups_date
  ON my_health.health_checkups (date DESC);
CREATE INDEX IF NOT EXISTS idx_health_checkups_test_item
  ON my_health.health_checkups (test_item);

-- 인바디 (전체 25개 항목)
CREATE TABLE IF NOT EXISTS my_health.inbody (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                   DATE NOT NULL UNIQUE,
  weight_kg              NUMERIC,
  skeletal_muscle_kg     NUMERIC,
  body_fat_kg            NUMERIC,
  lean_mass_kg           NUMERIC,
  bmi                    NUMERIC,
  body_fat_pct           NUMERIC,
  abdominal_fat_ratio    NUMERIC,
  visceral_fat_level     INTEGER,
  body_water_l           NUMERIC,
  protein_kg             NUMERIC,
  mineral_kg             NUMERIC,
  phase_angle            NUMERIC,
  -- 부위별 근육량
  right_arm_muscle_kg    NUMERIC,
  left_arm_muscle_kg     NUMERIC,
  trunk_muscle_kg        NUMERIC,
  right_leg_muscle_kg    NUMERIC,
  left_leg_muscle_kg     NUMERIC,
  -- 부위별 체지방량
  right_arm_fat_kg       NUMERIC,
  left_arm_fat_kg        NUMERIC,
  trunk_fat_kg           NUMERIC,
  right_leg_fat_kg       NUMERIC,
  left_leg_fat_kg        NUMERIC,
  created_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbody_date
  ON my_health.inbody (date DESC);

-- 인바디 목표
CREATE TABLE IF NOT EXISTS my_health.inbody_goals (
  metric        TEXT PRIMARY KEY,
  target_value  NUMERIC,
  target_min    NUMERIC,
  target_max    NUMERIC,
  operator      TEXT,                 -- '<=' | '>=' | 'between'
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Zepp 체중 (하루 여러 번 측정 가능, 10분 이내 중복은 upsert)
CREATE TABLE IF NOT EXISTS my_health.zepp_weight (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measured_at         TIMESTAMPTZ NOT NULL UNIQUE,
  weight_kg           NUMERIC NOT NULL,
  raw_screenshot_url  TEXT,
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zepp_weight_measured_at
  ON my_health.zepp_weight (measured_at DESC);

-- Zepp 수면 (하루 1건, 기상일 기준)
CREATE TABLE IF NOT EXISTS my_health.zepp_sleep (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                     DATE NOT NULL UNIQUE,
  sleep_start              TIMESTAMPTZ,
  sleep_end                TIMESTAMPTZ,
  sleep_hours              NUMERIC,
  sleep_quality            TEXT,
  sleep_regularity_pct     INTEGER,
  sleep_regularity_quality TEXT,
  deep_sleep_hours         NUMERIC,
  deep_sleep_pct           INTEGER,
  deep_sleep_quality       TEXT,
  rem_sleep_hours          NUMERIC,
  rem_sleep_pct            INTEGER,
  rem_sleep_quality        TEXT,
  awake_hours              NUMERIC,
  awake_count              INTEGER,
  awake_quality            TEXT,
  nap_hours                NUMERIC,
  nap_start                TIMESTAMPTZ,
  nap_end                  TIMESTAMPTZ,
  raw_screenshot_url       TEXT,
  confirmed_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zepp_sleep_date
  ON my_health.zepp_sleep (date DESC);

-- =========================================
-- 권한: PostgREST anon/authenticated/service_role
-- =========================================
-- my_stocks 와 동일 패턴. anon/authenticated 는 ADMIN_PASSWORD 미들웨어 뒤이므로
-- 사실상 단일 사용자지만, PostgREST 호출이 가능하도록 USAGE/SELECT 부여.

GRANT USAGE ON SCHEMA my_health TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA my_health
  TO anon, authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA my_health TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA my_health TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA my_health
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA my_health
  GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA my_health
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
