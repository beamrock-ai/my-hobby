-- 위스키명 한/영 병기: 입력은 한글 또는 영문 1개, 저장은 둘 다(자동 변환).
-- name(기존 UNIQUE) = 표시/식별용 정규명(한글 우선). name_ko/name_en 별도 보관.
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS name_ko TEXT;
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS name_en TEXT;

-- 기존 데이터 백필
UPDATE hobby.whisky SET name_ko = '글렌피딕 12년', name_en = 'Glenfiddich 12'
  WHERE name = '글렌피딕 12년' AND name_ko IS NULL;
