-- 주류시세(시트) 적재용 시세 테이블. 위스키 마스터에 없는 주류(카발란·쿠일라 등)도 담기 위해 FK 없이 name 키로 관리.
CREATE TABLE IF NOT EXISTS hobby.liquor_price (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquor text, style text, cask text, peat text,
  name text NOT NULL, shop text, price integer, observed_on date,
  volume_ml integer, url text, memo text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS liquor_price_name_idx ON hobby.liquor_price (name);
GRANT SELECT, INSERT, UPDATE, DELETE ON hobby.liquor_price TO anon, authenticated;
GRANT ALL PRIVILEGES ON hobby.liquor_price TO service_role;
