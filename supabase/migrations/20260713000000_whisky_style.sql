-- 위스키 구분(싱글몰트/블렌디드/버번 등) 필터용 분류 컬럼
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS style text;
