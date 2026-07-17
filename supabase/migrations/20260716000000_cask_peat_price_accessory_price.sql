-- 구글시트(주류시세/액세서리시세) 반영: 위스키 캐스크·피트, 시세 용량·링크·비고, 액세서리 시세 테이블

-- 위스키 속성: 캐스크(cask), 피트(peat)
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS cask text;
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS peat text;

-- 시세 관측: 용량ml·링크(url)·비고(memo)
ALTER TABLE hobby.price_observation ADD COLUMN IF NOT EXISTS volume_ml integer;
ALTER TABLE hobby.price_observation ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE hobby.price_observation ADD COLUMN IF NOT EXISTS memo text;

-- 액세서리 일자별 시세
CREATE TABLE IF NOT EXISTS hobby.accessory_price (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessory_id uuid REFERENCES hobby.accessory(id) ON DELETE CASCADE,
  shop text,
  price integer,
  observed_on date,
  spec text,
  url text,
  memo text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON hobby.accessory_price TO anon, authenticated;
GRANT ALL PRIVILEGES ON hobby.accessory_price TO service_role;
