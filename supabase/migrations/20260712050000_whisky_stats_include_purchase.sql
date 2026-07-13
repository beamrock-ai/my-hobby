-- 최저/평균/최고가를 시세(관측) + 구매가격 을 모두 합쳐 계산 (1건이라도 있으면 산출)
DROP VIEW IF EXISTS hobby.whisky_stats;
CREATE VIEW hobby.whisky_stats AS
SELECT
  w.id   AS whisky_id,
  w.name AS name,
  (SELECT count(*) FROM hobby.purchase p WHERE p.whisky_id = w.id) AS purchase_count,
  st.price_min,
  st.price_avg,
  st.price_max,
  st.price_count
FROM hobby.whisky w
LEFT JOIN LATERAL (
  SELECT
    min(price)::int          AS price_min,
    max(price)::int          AS price_max,
    round(avg(price))::int   AS price_avg,
    count(*)::int            AS price_count
  FROM (
    SELECT price FROM hobby.price_observation o WHERE o.whisky_id = w.id AND o.price IS NOT NULL
    UNION ALL
    SELECT price FROM hobby.purchase p          WHERE p.whisky_id = w.id AND p.price IS NOT NULL
  ) allp
) st ON true;

GRANT SELECT ON hobby.whisky_stats TO anon, authenticated, service_role;
