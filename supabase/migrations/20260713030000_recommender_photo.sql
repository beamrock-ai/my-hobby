-- 직접촬영 카테고리: 추천인(recommender) 모델 재사용, kind에 'photo' 허용
-- (사진 업로드로 자동 등록된 항목의 출처 표시. name은 보통 '직접촬영' 고정값)
ALTER TABLE hobby.recommender DROP CONSTRAINT IF EXISTS recommender_kind_check;
ALTER TABLE hobby.recommender ADD CONSTRAINT recommender_kind_check
  CHECK (kind = ANY (ARRAY['friend'::text, 'expert'::text, 'gift'::text, 'photo'::text]));
