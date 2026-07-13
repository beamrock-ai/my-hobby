-- 목표 항목별 참조 데이터 소스 (null = 자동 키워드 매칭)
-- 허용값: 'inbody' | 'zepp' | 'waist'
ALTER TABLE my_health.inbody_goals ADD COLUMN IF NOT EXISTS source TEXT;
