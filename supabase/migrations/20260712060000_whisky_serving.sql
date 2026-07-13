ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS serving JSONB; -- 시음유형 점수 {neat,rocks,highball} 0~5(0.5단위)
