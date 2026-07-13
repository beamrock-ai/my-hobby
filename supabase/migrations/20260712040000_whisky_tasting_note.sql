-- 위스키 테이스팅 노트 상세 필드
-- 레퍼런스(자동 생성): 종류·증류소·도수·향/맛/피니시·향(aroma)/맛(flavour) 레이더 프로파일
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS type       TEXT;    -- 종류(싱글몰트 등)
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS distillery TEXT;    -- 증류소·지역
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS abv        NUMERIC; -- 도수(%)
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS nose       TEXT;    -- 향
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS palate     TEXT;    -- 맛
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS finish     TEXT;    -- 피니시
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS aroma      JSONB;   -- 향 8축 {cereal,fruity,floral,peaty,feinty,sulphur,woody,winey} 0~4
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS flavour    JSONB;   -- 맛 8축 (동일)
-- 개인 기록(사용자 입력)
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS color         TEXT;  -- 색(팔레트 값)
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS rating        INTEGER; -- 별점/배럴 0~5
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS personal_note TEXT;  -- 자유 노트
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS tasted_on     DATE;  -- 시음일
