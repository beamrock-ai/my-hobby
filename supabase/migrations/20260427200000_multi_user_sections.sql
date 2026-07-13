-- sections 테이블 생성
CREATE TABLE IF NOT EXISTS my_health.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 기본 섹션 삽입
INSERT INTO my_health.sections (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'beamrock')
ON CONFLICT (id) DO NOTHING;

-- section_id 컬럼 추가
ALTER TABLE my_health.inbody          ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE my_health.zepp_weight     ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE my_health.zepp_sleep      ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE my_health.fitdays_waist   ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE my_health.health_checkups ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE my_health.inbody_goals    ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE my_health.user_settings   ADD COLUMN IF NOT EXISTS section_id uuid;

-- 기존 데이터 → 기본 섹션
UPDATE my_health.inbody          SET section_id = '00000000-0000-0000-0000-000000000001' WHERE section_id IS NULL;
UPDATE my_health.zepp_weight     SET section_id = '00000000-0000-0000-0000-000000000001' WHERE section_id IS NULL;
UPDATE my_health.zepp_sleep      SET section_id = '00000000-0000-0000-0000-000000000001' WHERE section_id IS NULL;
UPDATE my_health.fitdays_waist   SET section_id = '00000000-0000-0000-0000-000000000001' WHERE section_id IS NULL;
UPDATE my_health.health_checkups SET section_id = '00000000-0000-0000-0000-000000000001' WHERE section_id IS NULL;
UPDATE my_health.inbody_goals    SET section_id = '00000000-0000-0000-0000-000000000001' WHERE section_id IS NULL;
UPDATE my_health.user_settings   SET section_id = '00000000-0000-0000-0000-000000000001' WHERE section_id IS NULL;

-- NOT NULL 설정
ALTER TABLE my_health.inbody          ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE my_health.zepp_weight     ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE my_health.zepp_sleep      ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE my_health.fitdays_waist   ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE my_health.health_checkups ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE my_health.inbody_goals    ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE my_health.user_settings   ALTER COLUMN section_id SET NOT NULL;

-- FK 추가
ALTER TABLE my_health.inbody          ADD CONSTRAINT inbody_section_id_fkey          FOREIGN KEY (section_id) REFERENCES my_health.sections(id) ON DELETE CASCADE;
ALTER TABLE my_health.zepp_weight     ADD CONSTRAINT zepp_weight_section_id_fkey     FOREIGN KEY (section_id) REFERENCES my_health.sections(id) ON DELETE CASCADE;
ALTER TABLE my_health.zepp_sleep      ADD CONSTRAINT zepp_sleep_section_id_fkey      FOREIGN KEY (section_id) REFERENCES my_health.sections(id) ON DELETE CASCADE;
ALTER TABLE my_health.fitdays_waist   ADD CONSTRAINT fitdays_waist_section_id_fkey   FOREIGN KEY (section_id) REFERENCES my_health.sections(id) ON DELETE CASCADE;
ALTER TABLE my_health.health_checkups ADD CONSTRAINT health_checkups_section_id_fkey FOREIGN KEY (section_id) REFERENCES my_health.sections(id) ON DELETE CASCADE;
ALTER TABLE my_health.inbody_goals    ADD CONSTRAINT inbody_goals_section_id_fkey    FOREIGN KEY (section_id) REFERENCES my_health.sections(id) ON DELETE CASCADE;
ALTER TABLE my_health.user_settings   ADD CONSTRAINT user_settings_section_id_fkey   FOREIGN KEY (section_id) REFERENCES my_health.sections(id) ON DELETE CASCADE;

-- 기존 단일 컬럼 유니크 → 복합 유니크
ALTER TABLE my_health.inbody          DROP CONSTRAINT inbody_date_key;
ALTER TABLE my_health.inbody          ADD CONSTRAINT inbody_section_date_key UNIQUE (section_id, date);

ALTER TABLE my_health.zepp_weight     DROP CONSTRAINT zepp_weight_measured_at_key;
ALTER TABLE my_health.zepp_weight     ADD CONSTRAINT zepp_weight_section_measured_at_key UNIQUE (section_id, measured_at);

ALTER TABLE my_health.zepp_sleep      DROP CONSTRAINT zepp_sleep_date_key;
ALTER TABLE my_health.zepp_sleep      ADD CONSTRAINT zepp_sleep_section_date_key UNIQUE (section_id, date);

ALTER TABLE my_health.fitdays_waist   DROP CONSTRAINT fitdays_waist_measured_at_key;
ALTER TABLE my_health.fitdays_waist   ADD CONSTRAINT fitdays_waist_section_measured_at_key UNIQUE (section_id, measured_at);

ALTER TABLE my_health.health_checkups DROP CONSTRAINT health_checkups_date_institution_test_item_key;
ALTER TABLE my_health.health_checkups ADD CONSTRAINT health_checkups_section_date_institution_test_item_key UNIQUE (section_id, date, institution, test_item);

-- inbody_goals / user_settings: PK 변경 (metric / key → (section_id, metric/key))
ALTER TABLE my_health.inbody_goals  DROP CONSTRAINT inbody_goals_pkey;
ALTER TABLE my_health.inbody_goals  ADD PRIMARY KEY (section_id, metric);

ALTER TABLE my_health.user_settings DROP CONSTRAINT user_settings_pkey;
ALTER TABLE my_health.user_settings ADD PRIMARY KEY (section_id, key);
