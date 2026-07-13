-- 진단일지: 매일 12:50 cron 이 Claude 로 생성하는 건강 진단 게시판

CREATE TABLE IF NOT EXISTS my_health.diagnosis_journal (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID NOT NULL REFERENCES my_health.sections(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  summary     TEXT,        -- 텔레그램용 짧은 요약
  content     TEXT,        -- 전체 마크다운 진단문
  input_data  JSONB,       -- 진단에 사용된 데이터 스냅샷 (감사/디버그용)
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT diagnosis_journal_section_date_key UNIQUE (section_id, date)
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_journal_section_date
  ON my_health.diagnosis_journal (section_id, date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON my_health.diagnosis_journal
  TO anon, authenticated;

GRANT ALL PRIVILEGES ON my_health.diagnosis_journal TO service_role;
