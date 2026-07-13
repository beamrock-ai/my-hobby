-- 위스키 용어사전 (색인·검색·이미지·출처)
CREATE TABLE IF NOT EXISTS hobby.term (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term        TEXT NOT NULL,      -- 용어(한글/원어)
  term_en     TEXT,               -- 영문/원어
  category    TEXT,               -- 색인용 분류
  definition  TEXT NOT NULL,      -- 설명
  source      TEXT,               -- 출처
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (term)
);
CREATE INDEX IF NOT EXISTS idx_term_category ON hobby.term(category);
GRANT SELECT, INSERT, UPDATE, DELETE ON hobby.term TO anon, authenticated;
GRANT ALL PRIVILEGES ON hobby.term TO service_role;
