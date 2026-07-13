-- 인바디 계산 항목 컬럼 추가
-- 키(USER_HEIGHT_CM) + 8개 추출값으로부터 도출되는 5개 중 3개 컬럼이 누락되어 있어 추가.
-- bmi, body_fat_pct는 기존 스키마에 이미 존재.

ALTER TABLE my_health.inbody
  ADD COLUMN IF NOT EXISTS bmr_kcal INTEGER,
  ADD COLUMN IF NOT EXISTS ffmi     NUMERIC,
  ADD COLUMN IF NOT EXISTS fmi      NUMERIC;
