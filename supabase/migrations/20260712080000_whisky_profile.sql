-- 작성자별 프로필(주관 테이스팅). 객관 정보(type/distillery/abv/description)는 whisky에 공유 유지.
CREATE TABLE IF NOT EXISTS hobby.whisky_profile (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whisky_id     UUID NOT NULL REFERENCES hobby.whisky(id) ON DELETE CASCADE,
  author        TEXT NOT NULL DEFAULT 'beamrock',
  nose          TEXT,
  palate        TEXT,
  finish        TEXT,
  aroma         JSONB,
  flavour       JSONB,
  evaluation    TEXT,
  serving       JSONB,
  color         TEXT,
  rating        NUMERIC,
  personal_note TEXT,
  tasted_on     DATE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (whisky_id, author)
);
CREATE INDEX IF NOT EXISTS idx_whisky_profile_whisky ON hobby.whisky_profile(whisky_id);

-- 기존 whisky의 주관 필드 → beamrock 프로필로 이관
INSERT INTO hobby.whisky_profile (whisky_id, author, nose, palate, finish, aroma, flavour, evaluation, serving, color, rating, personal_note, tasted_on)
SELECT w.id, 'beamrock', w.nose, w.palate, w.finish, w.aroma, w.flavour, w.evaluation, w.serving, w.color, w.rating, w.personal_note, w.tasted_on
FROM hobby.whisky w
WHERE NOT EXISTS (SELECT 1 FROM hobby.whisky_profile p WHERE p.whisky_id = w.id AND p.author = 'beamrock');

GRANT SELECT, INSERT, UPDATE, DELETE ON hobby.whisky_profile TO anon, authenticated;
GRANT ALL PRIVILEGES ON hobby.whisky_profile TO service_role;
