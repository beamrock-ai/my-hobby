-- 헬스일지: Hevy 앱 CSV 내보내기 데이터 보관
-- 세션(운동 1회) + 세트(세션 내 각 세트) 2-테이블 정규화

CREATE TABLE IF NOT EXISTS my_health.workout_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id            UUID NOT NULL REFERENCES my_health.sections(id) ON DELETE CASCADE,
  session_date          DATE NOT NULL,
  session_title         TEXT NOT NULL,
  body_part_category    TEXT,             -- 상체 | 하체 | 기타 (세션 제목 prefix 기반)
  start_time            TIMESTAMPTZ,
  end_time              TIMESTAMPTZ,
  raw_title             TEXT,             -- 원본 title 보존
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workout_sessions_section_date_key UNIQUE (section_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_section_date
  ON my_health.workout_sessions (section_id, session_date DESC);

CREATE TABLE IF NOT EXISTS my_health.workout_sets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES my_health.workout_sessions(id) ON DELETE CASCADE,
  exercise_title        TEXT NOT NULL,    -- "체스트 프레스 (밴드)" 등 원본
  exercise_name         TEXT,             -- 괄호 제외 이름 "체스트 프레스"
  equipment             TEXT,             -- "밴드" | "머신" | "바벨" | "기타" (괄호 안 추출)
  body_part             TEXT,             -- "가슴"|"등"|"하체"|"팔"|"코어"|"유산소"|"기타"
  set_index             INTEGER,
  set_type              TEXT,
  weight_kg             NUMERIC,
  reps                  INTEGER,
  distance_km           NUMERIC,
  duration_seconds      INTEGER,
  rpe                   NUMERIC,
  description           TEXT,
  exercise_notes        TEXT,
  superset_id           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_session       ON my_health.workout_sets (session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise      ON my_health.workout_sets (exercise_title);
CREATE INDEX IF NOT EXISTS idx_workout_sets_equipment     ON my_health.workout_sets (equipment);
CREATE INDEX IF NOT EXISTS idx_workout_sets_body_part     ON my_health.workout_sets (body_part);

GRANT SELECT, INSERT, UPDATE, DELETE ON my_health.workout_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON my_health.workout_sets     TO anon, authenticated;
GRANT ALL PRIVILEGES ON my_health.workout_sessions TO service_role;
GRANT ALL PRIVILEGES ON my_health.workout_sets     TO service_role;
