-- 위스키 다중 이미지 + 대표 사진
CREATE TABLE IF NOT EXISTS hobby.whisky_image (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whisky_id   UUID NOT NULL REFERENCES hobby.whisky(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whisky_image_whisky ON hobby.whisky_image(whisky_id);

-- 기존 whisky.image_url → 대표 이미지로 이관
INSERT INTO hobby.whisky_image (whisky_id, url, is_primary)
SELECT w.id, w.image_url, true FROM hobby.whisky w
WHERE w.image_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM hobby.whisky_image i WHERE i.whisky_id = w.id);

GRANT SELECT, INSERT, UPDATE, DELETE ON hobby.whisky_image TO anon, authenticated;
GRANT ALL PRIVILEGES ON hobby.whisky_image TO service_role;
