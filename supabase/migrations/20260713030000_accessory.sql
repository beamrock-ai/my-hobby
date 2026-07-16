-- 주류 액세서리(잔·디캔터·바도구 등) 등록·관리
CREATE TABLE IF NOT EXISTS hobby.accessory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,               -- 글라스/디캔터/바도구/보관·제빙/기타
  brand text,
  status text DEFAULT '보유',  -- 보유 / 구매희망
  price integer,
  shop text,
  description text,
  memo text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON hobby.accessory TO anon, authenticated;
GRANT ALL PRIVILEGES ON hobby.accessory TO service_role;
