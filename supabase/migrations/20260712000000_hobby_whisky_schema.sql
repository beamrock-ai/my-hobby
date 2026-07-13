-- =========================================
-- hobby 스키마 — 취미(위스키) 트래커 초기 스키마
-- 공유 Supabase 인스턴스(my-bookkeeping VM01), my_health/my_stocks 와 동일 격리 패턴.
-- 3NF: 상점·추천인 마스터 분리, 파생값(구매횟수·최저/최고/평균가)은 저장하지 않고 뷰로 계산.
-- =========================================

CREATE SCHEMA IF NOT EXISTS hobby;

-- 상점 마스터 (구매상점·구매가능상점·시세관측처 공용: 이마트 트레이더스/코스트코/면세점 등)
CREATE TABLE IF NOT EXISTS hobby.shop (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 위스키 마스터 (카테고리는 관계로 파생 — 한 위스키가 여러 카테고리 동시 가능)
CREATE TABLE IF NOT EXISTS hobby.whisky (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,          -- 위스키명
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 구매완료: 구매 1건 = 1행 (위스키당 N). 구매횟수는 COUNT로 파생.
CREATE TABLE IF NOT EXISTS hobby.purchase (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whisky_id      UUID NOT NULL REFERENCES hobby.whisky(id) ON DELETE CASCADE,
  shop_id        UUID REFERENCES hobby.shop(id) ON DELETE SET NULL,   -- 구매상점
  purchase_date  DATE NOT NULL,                                       -- 구매일자
  price          INTEGER,                                             -- 구매가격(원)
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_whisky ON hobby.purchase(whisky_id);

-- 시세 관측: 웹검색으로 수집(트레이더스/코스트코/면세점 등) → 최저/최고/평균가 산출용
CREATE TABLE IF NOT EXISTS hobby.price_observation (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whisky_id    UUID NOT NULL REFERENCES hobby.whisky(id) ON DELETE CASCADE,
  shop_id      UUID REFERENCES hobby.shop(id) ON DELETE SET NULL,     -- 관측 상점(선택)
  price        INTEGER NOT NULL,
  observed_on  DATE DEFAULT current_date,
  source       TEXT,                                                  -- 수집 출처(URL/검색어)
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_priceobs_whisky ON hobby.price_observation(whisky_id);

-- 구매희망: 위스키당 1
CREATE TABLE IF NOT EXISTS hobby.wishlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whisky_id   UUID NOT NULL UNIQUE REFERENCES hobby.whisky(id) ON DELETE CASCADE,
  memo        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 구매가능상점: M:N
CREATE TABLE IF NOT EXISTS hobby.wishlist_shop (
  wishlist_id UUID NOT NULL REFERENCES hobby.wishlist(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES hobby.shop(id) ON DELETE CASCADE,
  PRIMARY KEY (wishlist_id, shop_id)
);

-- 추천인/출처: 지인(friend) 또는 전문가(expert)
CREATE TABLE IF NOT EXISTS hobby.recommender (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                                          -- 지인명 또는 출처
  kind        TEXT NOT NULL CHECK (kind IN ('friend','expert')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (name, kind)
);

-- 추천: 위스키당 N (지인추천/전문가추천 통합, recommender.kind로 구분)
CREATE TABLE IF NOT EXISTS hobby.recommendation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whisky_id       UUID NOT NULL REFERENCES hobby.whisky(id) ON DELETE CASCADE,
  recommender_id  UUID NOT NULL REFERENCES hobby.recommender(id) ON DELETE CASCADE,
  reason          TEXT,                                               -- 추천이유
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recommendation_whisky ON hobby.recommendation(whisky_id);

-- 파생 통계 뷰: 위스키별 구매횟수 + 최저/최고/평균 시세 + 관측수
CREATE OR REPLACE VIEW hobby.whisky_stats AS
SELECT
  w.id   AS whisky_id,
  w.name AS name,
  (SELECT count(*)          FROM hobby.purchase p         WHERE p.whisky_id = w.id) AS purchase_count,
  (SELECT min(o.price)      FROM hobby.price_observation o WHERE o.whisky_id = w.id) AS price_min,
  (SELECT max(o.price)      FROM hobby.price_observation o WHERE o.whisky_id = w.id) AS price_max,
  (SELECT round(avg(o.price))::int FROM hobby.price_observation o WHERE o.whisky_id = w.id) AS price_avg,
  (SELECT count(*)          FROM hobby.price_observation o WHERE o.whisky_id = w.id) AS observation_count
FROM hobby.whisky w;

-- 권한 (my_health 패턴 동일)
GRANT USAGE ON SCHEMA hobby TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hobby TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA hobby TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hobby TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA hobby GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA hobby GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA hobby GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
GRANT SELECT ON hobby.whisky_stats TO anon, authenticated, service_role;
