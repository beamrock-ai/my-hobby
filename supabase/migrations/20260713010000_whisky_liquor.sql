-- 주종(위스키/보드카/리큐르/막걸리 등) 최상위 분류 컬럼. 기존 style(구분)은 세부 스타일로 유지.
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS liquor text;
UPDATE hobby.whisky SET liquor = '위스키' WHERE liquor IS NULL;
