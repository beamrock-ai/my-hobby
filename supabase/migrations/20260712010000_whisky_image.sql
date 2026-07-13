-- 위스키 사진(선택) 지원
ALTER TABLE hobby.whisky ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 공개 이미지 버킷 (읽기 공개, 업로드는 service_role로만)
INSERT INTO storage.buckets (id, name, public)
VALUES ('whisky', 'whisky', true)
ON CONFLICT (id) DO NOTHING;
