# my-hobby 프로젝트 현황

> 취미 기록·관리 webapp. 2026-07-12 신설. **my-health webapp 레이아웃 기반 스캐폴딩**(셸만 복제, 건강 기능 제거).

## 개요

- 운영: **https://beamrock.duckdns.org/my-hobby**
- 스택: Next.js 16.2.3 (App Router, standalone) · React 19 · Tailwind · (Supabase/Anthropic/Telegram 의존성은 my-health에서 승계, 현재 미사용)
- basePath: `/my-hobby` (`NEXT_PUBLIC_BASE_PATH`, `deploy/vm01/env.production`)

## 배포 (VM)

- systemd 서비스 **`my-hobby-next`** (`/etc/systemd/system/my-hobby-next.service`, enable=부팅 자동기동)
- 포트 **3003** (`PORT`, env.production)
- nginx: `/etc/nginx/sites-available/beamrock.duckdns.org` 의 `location /my-hobby` → `127.0.0.1:3003`
- 홈페이지: `/var/www/beamrock/index.html` 에 취미 카드(🎨) 등록
- 배포 절차:
  ```bash
  cd /home/beamrock/claude-code-beamrock/projects/my-hobby
  bash scripts/build_standalone.sh
  sudo systemctl restart my-hobby-next
  ```

## 구조 (셸)

- `src/app/layout.tsx` — 루트 레이아웃(title 취미)
- `src/app/(app)/layout.tsx` — Sidebar + main (my-health 레이아웃 동일)
- `src/components/Sidebar.tsx` — 취미 네비게이션(현재 대시보드만)
- `src/app/(app)/page.tsx` — 취미 대시보드(독서·영화·게임·여행 카드 플레이스홀더)
- `src/lib/basePath.ts`, `src/app/globals.css`, `src/proxy.ts`(pass-through)

## 위스키 기능 (첫 기능, 2026-07-12)

- 데이터: 공유 Supabase **`hobby` 스키마**(config.toml [api].schemas에 `hobby` 추가·노출). 마이그레이션 `supabase/migrations/20260712000000_hobby_whisky_schema.sql`. 클라이언트 `src/lib/supabase.ts`(schema hobby).
- **3NF 모델(8테이블 + 뷰)**: `whisky`(마스터) · `shop` · `purchase`(구매완료, 구매횟수=COUNT 파생) · `price_observation`(시세관측→최저/최고/평균 파생) · `wishlist`+`wishlist_shop`(구매희망·구매가능상점 M:N) · `recommender`+`recommendation`(지인/전문가 추천) · 뷰 `whisky_stats`(구매횟수·min/max/avg).
- 카테고리는 관계로 파생(한 위스키가 여러 카테고리 동시 가능): 구매완료=purchase / 지인선물=recommender.kind='gift' / 구매희망=wishlist / 지인추천=recommender.kind='friend' / 전문가추천='expert' / **직접촬영**=recommender.kind='photo'. (지인선물은 추천인 모델 재사용, name=선물한 지인·reason=메모. CHECK 제약 `recommender_kind_check`에 'gift' 추가, 마이그레이션 `20260713020000_recommender_gift.sql`)
- **직접촬영(2026-07-13)**: 텔레그램에서 사진만 보내(구매/선물/희망/추천 맥락 없이) Claude가 자동 등록하는 경우의 기본 카테고리. `recommendation` 재사용, kind='photo', name 미입력 시 자동으로 '직접촬영' 고정값(recommendation API가 photo kind는 name 필수 검증 제외), reason=선택 메모(장소 등). 우선순위 최하위(구매완료>지인선물>구매희망>지인추천>전문가추천>직접촬영). CHECK 제약에 'photo' 추가, 마이그레이션 `20260713030000_recommender_photo.sql`. 구글시트 카테고리 드롭다운(`ensureCategoryDropdown`)에도 포함.
- **시세는 사용자 입력 아님 → 웹검색으로 수집**(이마트 트레이더스·코스트코·면세점 등) 후 `price_observation`에 적재 → min/max/avg 자동계산.
- UI: `/whisky`(4카테고리·통계·인라인 입력폼·사진첨부·한영 자동병기), API `/api/{whisky,purchase,wishlist,recommendation,price-observation}`.
- **주류 전반으로 확대(2026-07-13)**: 위스키뿐 아니라 보드카·리큐르·막걸리 등 전체 주류. 페이지 타이틀 `🥃 위스키`→**`🍶 주류 노트`**(홈 카드·Sidebar·상세 h1 "테이스팅 노트"로 통일). `whiskyInfo` LLM 프롬프트도 "주류(술)" 대상으로 일반화. (내부 경로/테이블명 `whisky`·`/whisky`는 유지)
- **주종(`liquor`)**: `hobby.whisky.liquor`(최상위 분류: 위스키/보드카/진/럼/데킬라/브랜디/리큐르/사케/막걸리/소주/전통주/와인/맥주/기타). 등록 시 드롭다운(미선택=AI 자동판별) 또는 수동 지정(우선). 마이그레이션 `20260713010000_whisky_liquor.sql`(기존 6종 위스키 백필).
- **위스키 구분(`style`)**: `hobby.whisky.style`(싱글몰트/블렌디드/블렌디드몰트/싱글그레인/버번/라이/기타, 위스키 세부스타일). 비위스키는 LLM이 "해당없음"→null 정규화. 등록 시 드롭다운(미선택=AI 자동판별) 또는 수동 지정. 마이그레이션 `20260713000000_whisky_style.sql`.
- 상세페이지 정보 섹션에서 주종·구분 모두 편집(`EDITABLE`에 `liquor`,`style` 포함). 카드에 주종(indigo)·구분(gray) 뱃지.
- **이름 편집(2026-07-13)**: 상세페이지 정보 섹션 `이름` Row가 한글명(`name_ko`)·영문명(`name_en`) 편집 입력(기존 읽기전용→편집). PATCH `/api/whisky/[id]`가 반영+`pushMirrorSafe`로 시트 한글명 갱신. 내부 PK `name`(canonical)은 동기화 안정성 위해 미변경(목록·랭킹·시트 모두 `name_ko` 우선 표시라 화면엔 새 이름 반영). 예: 듀어스 12년산→듀어스 12년.
- **목록 필터(`/whisky`)**: ① 주류명 콤보박스(`<input list>`+`<datalist>`, 검색+선택, 이름 짤림 없음) ② 주종 드롭다운 ③ 구분 드롭다운(데이터에 존재하는 style만) ④ 카테고리 드롭다운(구매완료/구매희망/지인추천/전문가추천). 클라이언트 AND 필터, "N/전체개 표시" + 초기화 버튼.
- **등록 시 카테고리 동시 선택**: 등록 폼에 카테고리 드롭다운(미지정/구매완료/지인선물/구매희망/지인추천/전문가추천) + 선택 시 세부 입력칸 노출(구매완료=일자〔미입력 시 오늘〕·상점·가격 / 지인선물=선물한 지인(필수)·메모 / 구매희망=가능상점·메모 / 추천=지인명·출처(필수)·이유). 등록 시 위스키 생성 후 해당 관계 API(`/api/{purchase,wishlist,recommendation}`, 지인선물=recommendation kind='gift') 자동 호출. 추천·선물은 이름 미입력 시 사전 검증 알림. 카드 `＋기록 추가`로도 추가 가능.
- **카테고리 우선순위(시트 단일 카테고리·뱃지)**: 구매완료 > 지인선물 > 구매희망 > 지인추천 > 전문가추천. 시트 C열 드롭다운(`ensureCategoryDropdown`)에 지인선물 포함.
- **테이스팅 노트 상세** `/whisky/[id]`: 템플릿 레이아웃(정보=종류·증류소·도수·가격·상점 / 감각=색·향(Nose)·맛(Palate)·향(Aroma)·맛(Flavour) 8축 레이더·피니시 / 종합 / 개인노트). 등록 시 **Claude(sonnet-5)가 종류·증류소·도수·향/맛/피니시·aroma/flavour 8축 프로파일(0~4)·설명·평가를 자동 생성**(`src/lib/translate.ts whiskyInfo`). 필드 편집 저장 + `🔄 프로필 재생성`(PATCH `/api/whisky/[id]` GET/PATCH). 레이더는 무의존 SVG(`components/WhiskyRadar.tsx`). 컬럼: `type,distillery,abv,nose,palate,finish,aroma,flavour,description,evaluation`(자동) + `color,rating,personal_note,tasted_on`(개인).
- **구글시트 양방향 실시간 동기화** (시트=뷰, 위스키명 PK): 스프레드시트 `HOBBY_WHISKY_SHEET_ID`(1ud13QG5…)의 `위스키` 탭, SA `bookkeeping-sheets-sa.json`(GOOGLE_SA_KEY_PATH). 동기화 모듈 `src/lib/{sheets,whisky-sync}.ts`.
  - **webapp→시트(push)**: 모든 변경 API(whisky·purchase·wishlist·recommendation·price-observation POST/DELETE) 처리 후 `pushMirrorSafe()`로 DB 전체를 시트에 즉시 미러.
  - **시트→webapp(pull)**: `GET /api/whisky`(페이지 로드)마다 `pullAdd()`로 시트에 수동추가된 위스키명(한/영)을 DB에 추가(부족 언어 자동변환).
  - **삭제 미러**: `POST /api/whisky/sync`(=fullSync: pullAdd+deleteMirror+pushMirror)가 시트에서 지운 행을 DB에서도 삭제(빈 시트 가드: 전체비움으론 삭제 안 함). `/whisky`의 `🔄 시트 동기화` 버튼 + **systemd 타이머 `my-hobby-whisky-sync.timer`(10분 주기)**가 호출.
  - 시트 컬럼(A~N): 한글명·영문명·**카테고리(드롭다운:구매완료/구매희망/지인추천/전문가추천)**·구매일자·구매상점·구매금액·구매횟수·**최저가(시점·상점)**·평균가·**최고가(시점·상점)**·추천인·추천이유·사진URL·비고. 구매 일자/상점/금액은 **분리 컬럼(필터용)**·위스키당 최근 1건 표시(구매횟수로 총계). 최저/평균/최고가는 **구매가격+시세(price_observation) 합산**으로 계산(뷰 `whisky_stats`, 1건이라도 있으면 산출), 최저/최고는 해당 데이터의 시점·상점 병기. 카테고리는 단일값=우선순위 대표(구매완료>구매희망>지인추천>전문가추천), Sheets API `setDataValidation`으로 C열 드롭다운(fullSync마다 재적용, `ensureCategoryDropdown`). 최저/최고가=해당 price_observation 관측 시점·상점 병기. 파생값은 DB→시트 단방향. 위스키명 리네임 금지.

## 순위(랭킹) `/ranking` (2026-07-13)

- 평점 / 시음유형(니트=neat·온더락=rocks·하이볼=highball)별 순위. serving은 작성자별 프로필(`whisky_profile`)에 저장 → **위스키별 프로필 평균**으로 집계(5점 만점).
- **평점 = 니트/온더락/하이볼(입력된 것)의 평균으로 자동 산출**(2026-07-13). 저장된 `rating` 컬럼은 무시(더 이상 저장·편집 안 함). 상세페이지 평점은 읽기전용 표시(`servingAvg`), 랭킹 API도 serving 평균으로 rating 계산.
- API `GET /api/ranking`: whisky + whisky_profile 조인, 위스키별 neat/rocks/highball 평균(값>0만) + rating(=세 평균의 평균) + ratingCount 반환.
- UI: 지표 탭(평점/니트/온더락/하이볼) + 주종 필터(2종 이상일 때) + 내림차순 목록(1·2·3위 색상, 아이콘 평점행+수치, 위스키 노트 링크). 점수 없는 항목은 제외. **동점=같은 순위(표준 경쟁 순위: 자기보다 높은 점수 개수+1, 예 5·5·4 → 1·1·3위)**.
- 홈 카드 🏆 순위 · Sidebar `🏆 순위` 등록.

## 현황 / TODO

- [x] my-health 기반 셸 스캐폴딩 + 배포(3003) + nginx + 홈 링크 + 10.6 라우팅
- [x] 위스키 기능: hobby 스키마(3NF) + API + `/whisky` UI + 웹검색 시세 수집
- [x] 위스키 용어사전 `/glossary`: `hobby.term`(term·term_en·category·definition·source·image_url) 시딩(5분류) + 검색·분류색인 + 용어별 이미지첨부·출처, API `/api/term`·`/api/term/[id]`·`/api/term/[id]/image`. 홈·Sidebar 바로가기.
  - **유튜브 링크로 용어 추가** `POST /api/term/from-youtube`(`{url, transcript?}`): `src/lib/youtube.ts`가 **자막 자동수집을 다중 전략으로 시도** → Claude(sonnet-5) `extractWhiskyTerms`(`src/lib/translate.ts`)가 용어 추출 → `term` upsert(중복무시, source=`YouTube: {url}`). `/glossary` 헤더 `🔗 유튜브로 추가` 버튼 → URL 입력·[가져오기](약 5초 자동시도), 실패 시 자막 textarea 노출(붙여넣기 폴백).
    - **자동수집 파이프라인**(`fetchTranscript`): ① 워치페이지 captionTracks → ② Invidious 공개 인스턴스 목록+본문 프록시 → ③ **yt-dlp**(`YTDLP_PATH`, `--write-auto-subs` json3/vtt 파싱). 첫 성공값 사용, 전부 실패 시 `needTranscript:true`.
    - **⚠ 이 서버는 Azure 데이터센터 IP → 유튜브가 봇으로 전방위 차단**(워치페이지·InnerTube·Invidious 본문·무쿠키 yt-dlp 모두 빈응답/"Sign in to confirm you're not a bot"). 검증(2026-07-13): 무쿠키로는 3전략 전부 실패.
    - **자동수집을 실제로 성공시키려면 쿠키 필요**: 브라우저에서 내보낸 youtube.com `cookies.txt`(Netscape)를 `YT_COOKIES_PATH`(=`/home/beamrock/.config/yt-cookies.txt`)에 두면 yt-dlp가 차단 우회 → **링크만으로 자동추출**. 파일 없으면 `--cookies` 미부여(그레이스풀). 쿠키는 주기적으로 만료되므로 재-export 필요.
- [ ] 위스키 시세 수집 자동화(웹검색 → 적재) 확대 · 다른 취미(독서/영화/게임) 추가
- [ ] git repo 생성·GitHub 푸시 (현재 VM 로컬만 — VM 변경 대비 필요)
