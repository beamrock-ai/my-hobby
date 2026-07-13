-- 위스키 프로파일: 기본 설명 + 테이스팅 노트(향·맛·피니시) + 대체적 평가 (등록 시 자동 생성)
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS description   TEXT;  -- 기본 설명(증류소·지역·종류·특징)
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS tasting_notes TEXT;  -- 향/맛/피니시
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS evaluation    TEXT;  -- 대체적 평가·평판
